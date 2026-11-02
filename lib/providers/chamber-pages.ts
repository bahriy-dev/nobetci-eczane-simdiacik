import {distanceKm,normalized,type Place,type PlacesResult,type SearchParams} from '../places';
import {SourceFailure,classifySourceFailure} from '../source-request';
import {activeDutyDates,dutyListEnds,turkeyDay} from '../duty-day';
import {listRegions} from '../regions';
import {plateForCity} from './eczaneler-org';

/**
 * Public "nöbetçi eczaneler" pages of pharmacist chambers. Most run the same chamber website
 * platform, others differ, so records are read by a shared pattern: a "… ECZANESİ" name followed
 * by its address, phone and a map link with coordinates. Every path used is allowed by the site's
 * robots.txt; pages behind a login, challenge or 403 are not listed here.
 */
type ChamberPage={url:string;source:string;center:[number,number];siblings?:string[]};
const page=(url:string,source:string,center:[number,number],siblings?:string[]):ChamberPage=>({url,source,center,siblings});
export const CHAMBER_PAGES:Readonly<Record<string,ChamberPage>>=Object.freeze({
  adana:page('https://www.adanaeo.org.tr/nobetci-eczaneler','Adana Eczacı Odası',[36.9864,35.3253]),
  adiyaman:page('https://www.adiyamaneo.org.tr/nobetci-eczaneler','Adıyaman Eczacı Odası',[37.7603,38.2773]),
  aksaray:page('https://www.aksarayeo.org.tr/nobetci-eczaneler/68','Aksaray Eczacı Odası',[38.3705,34.0269],['kirsehir']),
  kirsehir:page('https://www.aksarayeo.org.tr/nobetci-eczaneler/40','Aksaray Eczacı Odası · Kırşehir',[39.1461,34.1606],['aksaray']),
  antalya:page('https://www.antalyaeo.org.tr/tr/nobetci-eczaneler','Antalya Eczacı Odası',[36.8866,30.703]),
  aydin:page('https://www.aydineczaciodasi.org.tr/nobetci-eczaneler','Aydın Eczacı Odası',[37.8484,27.8436]),
  balikesir:page('https://www.balikesireczaciodasi.org.tr/nobetci-eczaneler','Balıkesir Eczacı Odası',[39.6474,27.888]),
  batman:page('https://batmaneczaciodasi.org.tr/nobetci-eczaneler/72','Batman Eczacı Odası',[37.8836,41.1278],['mus']),
  mus:page('https://batmaneczaciodasi.org.tr/nobetci-eczaneler/49','Batman Eczacı Odası · Muş',[38.7322,41.4899],['batman']),
  burdur:page('https://www.burdureo.org.tr/nobetci-eczaneler','Burdur Eczacı Odası',[37.7248,30.2887]),
  bursa:page('https://www.beo.org.tr/nobetci-eczaneler','Bursa Eczacı Odası',[40.1826,29.0675]),
  denizli:page('https://denizlieczaciodasi.org.tr/nobetci-eczaneler','Denizli Eczacı Odası',[37.7828,29.0966]),
  diyarbakir:page('https://diyarbakireo.org.tr/nobetci-eczaneler','Diyarbakır Eczacı Odası',[37.9162,40.2364]),
  eskisehir:page('https://www.eskisehireo.org.tr/nobetkarti','Eskişehir Eczacı Odası',[39.7744,30.5191],['bilecik']),
  bilecik:page('https://www.eskisehireo.org.tr/nobetkarti','Eskişehir Eczacı Odası · Bilecik',[40.1435,29.9753],['eskisehir']),
  kahramanmaras:page('https://www.kahramanmaraseo.org.tr/nobetci-eczaneler','Kahramanmaraş Eczacı Odası',[37.5813,36.9275]),
  kastamonu:page('https://kastamonueo.org.tr/nobetci-eczaneler/37','Kastamonu Eczacı Odası',[41.3765,33.777],['cankiri','karabuk']),
  cankiri:page('https://kastamonueo.org.tr/nobetci-eczaneler/18','Kastamonu Eczacı Odası · Çankırı',[40.5972,33.6213],['kastamonu','karabuk']),
  karabuk:page('https://kastamonueo.org.tr/nobetci-eczaneler/78','Kastamonu Eczacı Odası · Karabük',[41.1955,32.6231],['kastamonu','cankiri']),
  kirklareli:page('https://kirklarelieo.org.tr/nobetci-eczaneler','Kırklareli Eczacı Odası',[41.737,27.2236]),
  kocaeli:page('https://www.kocaelieo.org.tr/nobetci-eczaneler','Kocaeli Eczacı Odası',[40.7654,29.9407]),
  manisa:page('https://www.manisaeczaciodasi.org.tr/nobetci-eczaneler','Manisa Eczacı Odası',[38.6126,27.4334]),
  mardin:page('https://www.mardineczaciodasi.org.tr/nobetci-eczaneler','Mardin Eczacı Odası',[37.3133,40.7354]),
  mersin:page('https://www.mersineczaciodasi.org.tr/nobetci-eczaneler','Mersin Eczacı Odası',[36.7978,34.6298]),
  mugla:page('https://www.muglaeczaciodasi.org.tr/nobetci-eczaneler','Muğla Eczacı Odası',[37.2152,28.3637]),
  nevsehir:page('https://www.nevsehireo.org.tr/nobetci-eczaneler','Nevşehir Eczacı Odası',[38.625,34.7151]),
  nigde:page('https://neo.org.tr/nobetci-eczaneler','Niğde Eczacı Odası',[37.9698,34.6764]),
  osmaniye:page('https://www.osmaniyeeczaciodasi.org.tr/nobetci-eczaneler','Osmaniye Eczacı Odası',[37.0734,36.2508]),
  siirt:page('https://siirteo.org.tr/nobetci-eczaneler','Siirt Eczacı Odası',[37.9274,41.9422]),
  sirnak:page('https://sirnakeo.org.tr/nobetci-eczaneler','Şırnak Eczacı Odası',[37.522,42.457]),
  yozgat:page('https://www.yozgateo.org.tr/nobetci-eczaneler','Yozgat Eczacı Odası',[39.8222,34.8081]),
  zonguldak:page('https://www.zeo.org.tr/nobetci-eczaneler/67','Zonguldak Eczacı Odası',[41.4527,31.7876],['bartin']),
  bartin:page('https://www.zeo.org.tr/nobetci-eczaneler/74','Zonguldak Eczacı Odası · Bartın',[41.635,32.3366],['zonguldak']),
});
export const chamberPageFor=(city:string)=>CHAMBER_PAGES[normalized(city).trim()];

const entities:Record<string,string>={nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'};
const decode=(value:string)=>value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(whole,e:string)=>{
  if(e[0]!=='#')return entities[e.toLowerCase()]??whole;
  const code=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1));
  return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';
});
const geoPattern=/(?:[?&](?:q|query|ll|daddr|destination)=|@|\/place\/|\/dir\/\/?)\s*(-?\d{2}\.\d{3,})\s*(?:,|%2C)\s*(-?\d{2}\.\d{3,})/i;

/** Page text as lines; phone and map links become ⟦TEL:…⟧ / ⟦GEO:lat,lng⟧ markers in reading order. */
export function pageLines(html:string){
  let h=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1\s*>/gi,' ');
  h=h.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi,(_,attrs:string,inner:string)=>{
    const href=decode(attrs.match(/href\s*=\s*["']([^"']*)["']/i)?.[1]??'');
    if(/^tel:/i.test(href))return `\n⟦TEL:${href.slice(4).trim()}⟧\n${/eczane/i.test(inner)?inner+'\n':''}`;
    const geo=href.match(geoPattern);
    // Some pages put the address inside the map link, so its text is kept.
    return geo?`\n⟦GEO:${geo[1]},${geo[2]}⟧\n${inner}\n`:`\n${inner}\n`;
  });
  // Some pages carry the location only inside a QR-code image address.
  h=h.replace(/<img\b[^>]*>/gi,tag=>{const geo=decode(tag).match(geoPattern);return geo?`\n⟦GEO:${geo[1]},${geo[2]}⟧\n`:' ';});
  h=h.replace(/<\/?(?:h[1-6]|p|div|li|tr|td|th|br|section|article|header|span|strong|b|small|table|ul|ol|label|button)\b[^>]*>/gi,'\n').replace(/<[^>]+>/g,' ');
  return decode(h).split('\n').map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean);
}

type RawRecord={name:string;phones:string[];geo?:[number,number];text:string[];district?:string};
const nameLine=/^(?!.*(?:nöbetçi|nobetci|bugün|listesi|eczaneler(?!\p{L})))(?:.{2,90}?\s)?ECZANES[İIiı](?!\p{L})/iu;
const plainPhone=/^\+?[\d\s()-]{10,18}$/;
/** Pages group records under district headings ("Kepez", "SEYHAN BUGÜN NÖBETÇİ ECZANELER"). */
function headingDistrict(line:string,districts:Map<string,string>){
  const n=normalized(line).replace(/\s+/g,' ').trim();
  return districts.get(n)??districts.get(n.replace(/\s*(?:bugun\s+)?(?:nobetci|nobet)\b.*$/,'').trim());
}
export function pageRecords(lines:string[],districtNames:string[]=[],province=''){
  const districts=new Map(districtNames.map(name=>[normalized(name).trim(),name]));
  // Pages head the central district with the province name; the region list calls it "Merkez".
  if(province&&districtNames.includes('Merkez')&&!districts.has(normalized(province).trim()))districts.set(normalized(province).trim(),'Merkez');
  const records:RawRecord[]=[];let current:RawRecord|undefined,heading:string|undefined;
  for(const line of lines){
    if(!line.startsWith('⟦')&&nameLine.test(line)){current={name:line,phones:[],text:[],district:heading};records.push(current);continue;}
    const section=line.length<=60&&!line.startsWith('⟦')?headingDistrict(line,districts):undefined;
    if(section){heading=section;continue;}
    if(!current)continue;
    const tel=line.match(/^⟦TEL:(.*)⟧$/);
    if(tel){current.phones.push(tel[1]);continue;}
    const geo=line.match(/^⟦GEO:(.*),(.*)⟧$/);
    if(geo){current.geo??=[Number(geo[1]),Number(geo[2])];continue;}
    if(plainPhone.test(line)&&line.replace(/\D/g,'').length>=10){current.phones.push(line);continue;}
    if(current.text.length<8)current.text.push(line);
  }
  return records;
}

function phoneNumber(value:string){
  const digits=value.replace(/\D/g,'');
  if(/^0[2-5]\d{9}$/.test(digits))return digits;
  if(/^[2-5]\d{9}$/.test(digits))return '0'+digits;
  if(/^90[2-5]\d{9}$/.test(digits))return '+'+digits;
  return undefined;
}
const istanbulTime=(d:string,m:string,y:string,h:string,min:string)=>Date.parse(`${y}-${m}-${d}T${h.padStart(2,'0')}:${min}:00+03:00`);
const nextLocal=(now:number,h:string,min:string)=>{
  let at=Date.parse(`${turkeyDay(now)}T${h.padStart(2,'0')}:${min}:00+03:00`);
  if(at<=now)at+=86_400_000;
  return at;
};
/** The duty interval a record states about itself, in any of the forms the pages use. */
export function recordInterval(text:string,now:number):{start?:number;end?:number}{
  const both=text.match(/(\d{2})[./](\d{2})[./](\d{4})\s+(\d{1,2})[:.](\d{2})\s*[/–-]\s*(\d{2})[./](\d{2})[./](\d{4})\s+(\d{1,2})[:.](\d{2})/);
  if(both)return {start:istanbulTime(both[1],both[2],both[3],both[4],both[5]),end:istanbulTime(both[6],both[7],both[8],both[9],both[10])};
  const until=text.match(/(\d{2})[./](\d{2})[./](\d{4})\s+(?:saat\s+)?(\d{1,2})[:.](\d{2})\s*['’]?\s*(?:a|e|ya|ye)?\s*kadar/i);
  if(until)return {end:istanbulTime(until[1],until[2],until[3],until[4],until[5])};
  const tomorrow=text.match(/yar[ıi]n\s+sabah(?:\s+saat)?\s*,?\s*(\d{1,2})[:.](\d{2})/i);
  if(tomorrow)return {end:nextLocal(now,tomorrow[1],tomorrow[2])};
  return {};
}
const months=['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];
/** Calendar date in a "… nöbetçi eczaneler" heading; it must be the current duty day. */
export function pageDutyDay(lines:string[]){
  for(const line of lines){
    if(!/n[öo]bet/i.test(line)||line.length>160)continue;
    const n=normalized(line);
    const words=n.match(/(\d{1,2})\s+([a-z]+)\s+(20\d\d)/);
    const month=words?months.indexOf(words[2])+1:0;
    if(words&&month)return `${words[3]}-${String(month).padStart(2,'0')}-${words[1].padStart(2,'0')}`;
  }
  return undefined;
}

const noise=/n[öo]bet(?:çidir|cidir| kart)|kadar|yazd[ıi]r|iletişim|harita|yol tarifi|konum|^ara$|^tümü$|telefon|^\W+$/i;
function addressOf(text:string[],heading=''){
  const lines=text.filter(line=>!noise.test(line)&&!/^⟦/.test(line));
  const first=lines[0]??'';
  const prefixed=first.match(/^-\s*([^/]{2,40}?)\s*\/\s*(.{5,})$/);
  if(prefixed)return {district:prefixed[1].trim(),address:prefixed[2].trim()};
  if(first&&first.length<=25&&!/\d/.test(first)&&lines[1])return {district:first,address:lines[1]};
  return {district:heading,address:first};
}
const titleCase=(value:string)=>value.toLocaleLowerCase('tr-TR').replace(/(^|[\s(/-])\p{L}/gu,c=>c.toLocaleUpperCase('tr-TR'));
const cleanName=(value:string)=>(value.length>40?value.match(/((?:[\p{L}\d.'’&-]+\s){0,3}ECZANES[İIiı])(?!\p{L})/iu)?.[1]??value:value).trim();

export function parseChamberPage(html:string,params:SearchParams,now=new Date(),districtNames:string[]=[]):PlacesResult{
  const city=normalized(params.city??'').trim(),config=CHAMBER_PAGES[city];
  if(!config||!Number.isFinite(now.getTime())||!Number.isFinite(params.radius)||params.radius<=0)throw new Error('Oda kaynağı bu il için tanımlı değil.');
  if(html.length>3_000_000)throw new SourceFailure('invalid-response');
  const lines=pageLines(html),records=pageRecords(lines,districtNames,params.city),time=now.getTime();
  const day=pageDutyDay(lines);
  if(day&&!activeDutyDates(now).includes(day))throw new Error(`${config.source} sayfasının tarihi güncel değil. Eski kayıtlar gösterilmedi.`);
  const siblings=(config.siblings??[]).map(key=>CHAMBER_PAGES[key].center);
  const fetchedAt=now.toISOString(),places:Place[]=[],ids=new Set<string>();
  let usable=0,skipped=0,expired=0,upcoming=0,missingPhone=0;
  for(const record of records){
    const name=cleanName(record.name);
    if(!record.geo||!name){skipped++;continue;}
    const [lat,lng]=record.geo;
    const own=distanceKm(config.center[0],config.center[1],lat,lng);
    if(!(lat>35&&lat<43&&lng>25&&lng<45)||own>170){skipped++;continue;}
    // Chambers serving several provinces: a record belongs to the nearest of their centres.
    if(siblings.some(([a,b])=>distanceKm(a,b,lat,lng)<own))continue;
    const {start,end}=recordInterval(record.text.join(' '),time);
    if(end!==undefined&&end<=time){expired++;continue;}
    // A duty lasts at most a day: an end more than 24 h away belongs to a list that has not started.
    // Many chambers publish the evening shift (18:30 → morning) by day; it is shown with its start,
    // but a start further than 10 h ahead is a later day's list.
    if((start!==undefined&&start-time>10*3_600_000)||(end!==undefined&&end-time>25*3_600_000)){upcoming++;continue;}
    const opens=start!==undefined&&start>time?new Date(start).toISOString():undefined;
    const {district,address}=addressOf(record.text,record.district);
    if(address.length<5){skipped++;continue;}
    usable++;
    const id=`oda-${city}-${lat.toFixed(5)}-${lng.toFixed(5)}`;
    if(ids.has(id))continue;ids.add(id);
    const phone=record.phones.map(phoneNumber).find(Boolean);
    if(!phone)missingPhone++;
    const distance=distanceKm(params.lat,params.lng,lat,lng);
    if(distance>params.radius)continue;
    const active=activeDutyDates(now);
    const until=end??dutyListEnds(day??active[active.length-1]);
    places.push({id,name,category:'Eczane',lat,lng,
      address:district&&!normalized(address).includes(normalized(district))?`${address} · ${titleCase(district)}`:address,
      phone,status:'unknown',allDay:false,duty:true,...(day?{dutyDate:day}:{}),verification:'official-duty',
      verifiedUntil:new Date(Math.min(time+300_000,until)).toISOString(),...(end?{closes:new Date(end).toISOString()}:{}),...(opens?{opens}:{}),
      hours:end?'Resmî listeye göre nöbet bitişi kaynakta belirtilmiştir. Gitmeden önce telefonla teyit et.':'Güncel resmî nöbet listesinde. Başlangıç ve bitiş aralığı doğrulanmamış; telefonla teyit et.',
      distance,source:config.source,sourceUrl:config.url,fetchedAt});
  }
  if(!usable&&(expired||upcoming))throw new Error(`${config.source} sayfası şu an geçerli nöbet listesini göstermiyor.`);
  if(!usable)throw new Error(`${config.source} sayfasında doğrulanabilir nöbet kaydı bulunamadı.`);
  const warnings:string[]=[];
  if(skipped)warnings.push(`${skipped} nöbet kaydı, adres veya konum doğrulanamadığı için gösterilmedi.`);
  if(missingPhone)warnings.push(`${missingPhone} nöbet kaydının telefon bilgisi doğrulanamadı.`);
  return {places:places.sort((a,b)=>a.distance-b.distance),source:config.source,fetchedAt,coverage:`${config.source} güncel resmî nöbet listesi`,...(warnings.length?{partial:true,warnings}:{})};
}

/** Chamber pages declare UTF-8 or windows-1254; decoding the wrong one breaks Turkish letters. */
export function decodePage(bytes:ArrayBuffer,contentType:string){
  const head=new TextDecoder('latin1').decode(bytes.slice(0,4096));
  const declared=(contentType.match(/charset=([\w-]+)/i)?.[1]??head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]??'utf-8').toLowerCase();
  const label=/1254|8859-9|turkish/.test(declared)?'windows-1254':'utf-8';
  const text=new TextDecoder(label).decode(bytes);
  return label==='utf-8'&&(text.match(/�/g)?.length??0)>20?new TextDecoder('windows-1254').decode(bytes):text;
}

// Many chamber sites share one host that refuses bursts, so each page is fetched at most every
// ten minutes and a refusal (403/429) pauses that page for half an hour instead of being retried.
const cacheMs=10*60_000,refusalPauseMs=30*60_000;
const pageCache=new Map<string,{html:string;expires:number}>();
const paused=new Map<string,number>();
export async function searchChamberPage(params:SearchParams):Promise<PlacesResult>{
  const config=chamberPageFor(params.city??'');
  if(!config)throw new Error('Oda kaynağı bu il için tanımlı değil.');
  const cached=pageCache.get(config.url);
  let html=cached&&cached.expires>Date.now()?cached.html:undefined;
  if(!html){
    if((paused.get(config.url)??0)>Date.now())throw new SourceFailure('rate-limited');
    try{
      // The sites answer an identified client; generic browser strings receive 403 from some of them.
      const response=await fetch(config.url,{cache:'no-store',signal:AbortSignal.timeout(12_000),headers:{'User-Agent':'Mozilla/5.0 (compatible; SimdiAcik/1.0; +https://simdiacik.com)','Accept-Language':'tr'}});
      if(response.status===403||response.status===429)paused.set(config.url,Date.now()+refusalPauseMs);
      if(!response.ok)throw new SourceFailure(response.status===429?'rate-limited':'upstream',response.status);
      html=decodePage(await response.arrayBuffer(),response.headers.get('content-type')??'');
    }catch(error){throw classifySourceFailure(error);}
    pageCache.set(config.url,{html,expires:Date.now()+cacheMs});
  }
  // District names only label records; the list still works if the region service is down.
  const plate=plateForCity(params.city??'');
  const districts=plate?await listRegions(plate).then(result=>result.regions.map(region=>region.name),()=>[]):[];
  return parseChamberPage(html,params,new Date(),districts);
}
