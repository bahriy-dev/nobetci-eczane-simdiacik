import {z} from 'zod';
import {distanceKm,normalized,type Place,type PlacesProvider,type PlacesResult,type SearchParams} from '../places';

// Linked directly from the Konya Eczacı Odası website. The nonce is published
// by its normal public page; it is not an API key or an account credential.
export const KONYA_SOURCE_URL='https://www.konyanobetcieczaneleri.com/';
const source='Konya Eczacı Odası';
const months=['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];
const rowSchema=z.object({adres:z.string().trim().min(1).max(1000),ilce:z.string().trim().max(100),lat:z.number().finite().min(36.4).max(39.5),lon:z.number().finite().min(30.8).max(34.5),telLink:z.string().max(30).nullable().optional()});

function decode(value:string){return value.replace(/&(?:quot|amp|apos|lt|gt|nbsp);/g,e=>({'&quot;':'"','&amp;':'&','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '}[e]!));}
function attribute(tag:string,name:string){return decode(tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`,'i'))?.[2]??'');}
function today(now:Date){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(now);}

export function konyaRequest(html:string,now=new Date()){
  if(!Number.isFinite(now.getTime())||html.length>2_000_000)throw new Error('Konya nöbet kaynağı doğrulanamadı.');
  const title=decode(html.match(/<title\b[^>]*>([^<]+)<\/title\s*>/i)?.[1]??'');
  const date=normalized(title).match(/konya nobetci eczaneler\s*[—–-]\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  const month=months.indexOf(date?.[2]??'')+1;
  const sourceDate=date&&month?`${date[3]}-${String(month).padStart(2,'0')}-${date[1].padStart(2,'0')}`:'';
  if(sourceDate!==today(now))throw new Error('Konya kaynağının nöbet tarihi güncel değil. Eski kayıtlar gösterilmedi.');
  const body=html.match(/<body\b[^>]*>/i)?.[0]??'';
  if(attribute(body,'data-ts')||/turnstile|captcha/i.test(body))throw new Error('Konya kaynağı ek doğrulama istiyor. Resmî sayfayı aç.');
  const token=attribute(body,'data-j');
  if(attribute(body,'data-veri')!=='/nobet/onyuz/veri.php'||!/^[\w.-]{1,200}$/.test(token))throw new Error('Konya nöbet kaynağının bağlantı biçimi değişmiş.');
  return {token,date:sourceDate};
}

export function parseKonyaPharmacies(html:string,payload:unknown,params:SearchParams,now=new Date()):PlacesResult{
  const request=konyaRequest(html,now);
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Konya nöbet verisi doğrulanamadı.');
  const rows=payload as Record<string,unknown>;
  const cards=Array.from(html.matchAll(/<article\b[^>]*>/gi)).map(m=>m[0]).filter(tag=>/\sdata-kart(?:\s|=|>)/i.test(tag));
  if(!cards.length)throw new Error('Konya nöbet kaynağının kart biçimi değişmiş.');
  const fetchedAt=now.toISOString();
  const midnight=new Date(`${request.date}T00:00:00+03:00`).getTime()+86_400_000;
  const verifiedUntil=new Date(Math.min(now.getTime()+300_000,midnight)).toISOString();
  const ids=new Set<string>();const places:Place[]=[];let skipped=0;
  for(const card of cards){
    const key=attribute(card,'data-anahtar');const name=attribute(card,'data-ad').trim();const district=attribute(card,'data-bolge').trim();
    const record=Object.prototype.hasOwnProperty.call(rows,key)?rowSchema.safeParse(rows[key]):undefined;
    if(!/^[mi]-\d+$/.test(key)||!name||name.length>200||!district||!record?.success||(record.data.ilce&&!normalized(district).split(/\s*-\s*/).includes(normalized(record.data.ilce)))){skipped++;continue;}
    if(ids.has(key))continue;ids.add(key);
    const row=record.data;const distance=distanceKm(params.lat,params.lng,row.lat,row.lon);if(distance>params.radius)continue;
    const digits=row.telLink?.replace(/\D/g,'');
    const phone=digits&&/^90[2-5]\d{9}$/.test(digits)?'+'+digits:undefined;
    places.push({id:'keo-'+key,name:/eczane/i.test(name)?name:`${name} Eczanesi`,category:'Eczane',lat:row.lat,lng:row.lon,address:`${row.adres} · ${district}`,phone,status:'unknown',allDay:false,duty:true,dutyDate:request.date,verification:'official-duty',verifiedUntil,hours:`Resmî nöbet tarihi: ${request.date}. Bölgelere göre nöbet saatleri değişebilir; gitmeden önce ara.`,distance,source,sourceUrl:KONYA_SOURCE_URL,fetchedAt});
  }
  if(skipped===cards.length)throw new Error('Konya nöbet kayıtlarının adres ve konumları doğrulanamadı.');
  return {places:places.sort((a,b)=>a.distance-b.distance),source,fetchedAt,coverage:source+' güncel resmî nöbet listesi',...(skipped?{partial:true,warnings:[`${skipped} Konya nöbet kaydı, adres veya konum doğrulanamadığı için gösterilmedi.`]}:{})};
}

export const konyaPharmacyProvider:PlacesProvider={async search(params){
  const page=await fetch(KONYA_SOURCE_URL,{cache:'no-store',signal:AbortSignal.timeout(10_000)});
  if(!page.ok)throw new Error('Konya Eczacı Odası nöbet sayfasına ulaşılamadı.');
  const html=await page.text();const {token}=konyaRequest(html);
  const response=await fetch(new URL('/nobet/onyuz/veri.php',KONYA_SOURCE_URL),{method:'POST',body:new URLSearchParams({j:token,cf:''}),cache:'no-store',signal:AbortSignal.timeout(10_000)});
  if(!response.ok)throw new Error('Konya Eczacı Odası nöbet verisine ulaşılamadı.');
  return parseKonyaPharmacies(html,await response.json(),params,new Date());
}};
