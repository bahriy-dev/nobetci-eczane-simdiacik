import {z} from 'zod';
import {distanceKm,normalized,type Place,type PlacesProvider,type PlacesResult,type SearchParams} from '../places';
import {searchAnkaraPharmacies} from './ankara';
import {kayseriPharmacyProvider} from './kayseri';
import {konyaPharmacyProvider} from './konya';
import {samsunPharmacyProvider} from './samsun';
import {gaziantepPharmacyProvider} from './gaziantep';
import {getPharmacySource} from '../pharmacy-sources';

export const ISTANBUL_SOURCE_URL='https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/';
export const IZMIR_SOURCE_URL='https://www.izmir.bel.tr/tr/NobetciEczane/27';
const izmirEndpoint='https://openapi.izmir.bel.tr/api/ibb/nobetcieczaneler';
const get=async(url:string,init?:RequestInit)=>{const response=await fetch(url,{...init,cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Resmî nöbet kaynağına ulaşılamadı.');return response};
const text=(maximum:number,required=true)=>z.string().trim().min(required?1:0).max(maximum).refine(value=>!/^(?:undefined|null)$/i.test(value));
const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const istanbulEnvelope=z.object({error:z.literal(0),eczaneler:z.array(z.unknown()).max(2000)});
const istanbulRow=z.object({
  sicil:z.number().int().positive(),eczane_ad:text(200),il:text(100),ilce:text(100),
  mahalle:text(300,false),cadde_sokak:text(400,false),bina_kapi:text(100,false),
  eczane_tel:z.unknown().optional(),lat:z.unknown().optional(),lng:z.unknown().optional(),
  nobet_bitis:text(100,false).nullable().optional(),
}).refine(row=>Boolean(row.mahalle||row.cadde_sokak));
const sourceDate=z.string().regex(/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,7})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/).refine(value=>{
  const date=new Date(value.slice(0,10)+'T00:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value.slice(0,10);
});
const izmirRow=z.object({
  Tarih:sourceDate,Adi:text(200),Adres:text(1000),Bolge:text(100),
  EczaneId:z.number().int(),BolgeId:z.number().int().nonnegative(),
  Telefon:z.unknown().optional(),LokasyonX:z.unknown().optional(),LokasyonY:z.unknown().optional(),
  BolgeAciklama:text(1000,false).nullable().optional(),
});

function numericPoint(latitude:unknown,longitude:unknown){
  const number=(value:unknown)=>{
    if(typeof value==='number')return Number.isFinite(value)?value:NaN;
    if(typeof value!=='string'||!value.trim()||!/^-?\d+(?:\.\d+)?$/.test(value.trim()))return NaN;
    return Number(value.trim());
  };
  const lat=number(latitude),lng=number(longitude);
  return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>35&&lat<43&&lng>25&&lng<45?{lat,lng}:undefined;
}
function phoneNumber(value:unknown){
  if(typeof value!=='string'||!/^\+?[\d\s()-]+$/.test(value.trim()))return undefined;
  const digits=value.replace(/\D/g,'');
  if(/^0[2-5]\d{9}$/.test(digits))return digits;
  if(/^[2-5]\d{9}$/.test(digits))return '0'+digits;
  if(/^90[2-5]\d{9}$/.test(digits))return '+'+digits;
  return undefined;
}
function metadata(params:SearchParams,now:Date){
  if(!Number.isFinite(now.getTime())||!numericPoint(params.lat,params.lng)||!Number.isFinite(params.radius)||params.radius<=0)throw new Error('Eczane arama konumu geçersiz.');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(now);
  const midnight=new Date(today+'T00:00:00+03:00').getTime()+86400000;
  return {today,fetchedAt:now.toISOString(),verifiedUntil:new Date(Math.min(now.getTime()+300000,midnight)).toISOString()};
}
function result(places:Place[],source:string,fetchedAt:string,skipped:number,missingPhone:number,skippedDates=0):PlacesResult{
  const warnings:string[]=[];
  if(skipped)warnings.push(skipped+' nöbet kaydı, adresi veya konumu doğrulanamadığı için gösterilmedi.');
  if(missingPhone)warnings.push(missingPhone+' nöbet kaydının telefon bilgisi doğrulanamadı.');
  if(skippedDates)warnings.push(skippedDates+' kayıt güncel nöbet tarihine ait olmadığı için gösterilmedi.');
  return {places:places.sort((a,b)=>a.distance-b.distance),source,fetchedAt,coverage:source+' güncel resmî nöbet listesi',...(warnings.length?{partial:true,warnings}:{})};
}

/** The official public IEO page explicitly covers İstanbul and Yalova "bugün itibariyle". */
export function parseIstanbulPharmacies(payload:unknown,params:SearchParams,now=new Date()):PlacesResult{
  const {fetchedAt,verifiedUntil}=metadata(params,now);
  const city=normalized(params.city??'İstanbul').trim();
  if(city!=='istanbul'&&city!=='yalova')throw new Error('İstanbul Eczacı Odası kaynağı bu il için doğrulanmadı.');
  const parsed=istanbulEnvelope.safeParse(payload);
  if(!parsed.success)throw new Error('İstanbul Eczacı Odası nöbet listesi doğrulanamadı.');
  const places:Place[]=[],ids=new Set<number>();
  let selectedRows=0,usableRows=0,skipped=0,missingPhone=0,supportedRows=0;
  for(const raw of parsed.data.eczaneler){
    const province=object(raw)&&typeof raw.il==='string'?normalized(raw.il.trim()):'';
    if(province!=='istanbul'&&province!=='yalova'){skipped++;continue;}
    supportedRows++;
    if(province!==city)continue;
    selectedRows++;
    const record=istanbulRow.safeParse(raw);
    if(!record.success){skipped++;continue;}
    const row=record.data,point=numericPoint(row.lat,row.lng);
    if(!point){skipped++;continue;}
    usableRows++;
    if(ids.has(row.sicil))continue;ids.add(row.sicil);
    const phone=phoneNumber(row.eczane_tel);
    if(!phone)missingPhone++;
    const distance=distanceKm(params.lat,params.lng,point.lat,point.lng);
    if(distance>params.radius)continue;
    const provinceName=province==='yalova'?'Yalova':'İstanbul';
    places.push({id:'ieo-'+row.sicil,name:row.eczane_ad,category:'Eczane',...point,
      address:[row.mahalle,row.cadde_sokak,row.bina_kapi,row.ilce,provinceName].filter(Boolean).join(', '),
      phone,status:'unknown',allDay:false,duty:true,verification:'official-duty',verifiedUntil,distance,
      hours:row.nobet_bitis?'Kaynağın bildirdiği nöbet bitişi: '+row.nobet_bitis+'. Gitmeden önce telefonla teyit et.':'Güncel resmî nöbet listesinde. Başlangıç ve bitiş aralığı doğrulanmamış; telefonla teyit et.',
      source:'İstanbul Eczacı Odası',sourceUrl:ISTANBUL_SOURCE_URL,fetchedAt});
  }
  if((parsed.data.eczaneler.length&&!supportedRows)||(selectedRows&&!usableRows))throw new Error('İstanbul Eczacı Odası nöbet kayıtlarının adres ve konumları doğrulanamadı.');
  return result(places,'İstanbul Eczacı Odası',fetchedAt,skipped,missingPhone);
}

/** Tarih is a source calendar date; no overnight interval is inferred from its 08:00 value. */
export function parseIzmirPharmacies(payload:unknown,params:SearchParams,now=new Date()):PlacesResult{
  const {today,fetchedAt,verifiedUntil}=metadata(params,now);
  if(normalized(params.city??'İzmir').trim()!=='izmir')throw new Error('İzmir Belediyesi kaynağı bu il için doğrulanmadı.');
  const parsed=z.array(z.unknown()).max(2000).safeParse(payload);
  if(!parsed.success)throw new Error('İzmir nöbet listesi doğrulanamadı.');
  const places:Place[]=[],ids=new Set<string>();
  let currentRows=0,usableRows=0,skipped=0,missingPhone=0,skippedDates=0;
  for(const raw of parsed.data){
    const date=sourceDate.safeParse(object(raw)?raw.Tarih:undefined);
    if(!date.success){skipped++;continue;}
    if(date.data.slice(0,10)!==today){skippedDates++;continue;}
    currentRows++;
    const record=izmirRow.safeParse(raw);
    if(!record.success){skipped++;continue;}
    const row=record.data,point=numericPoint(row.LokasyonX,row.LokasyonY);
    if(!point){skipped++;continue;}
    usableRows++;
    const id='izmir-'+row.EczaneId+'-'+row.Adi+'-'+row.BolgeId;
    if(ids.has(id))continue;ids.add(id);
    const phone=phoneNumber(row.Telefon);
    if(!phone)missingPhone++;
    const distance=distanceKm(params.lat,params.lng,point.lat,point.lng);
    if(distance>params.radius)continue;
    places.push({id,name:row.Adi,category:'Eczane',...point,address:row.Adres+' · '+row.Bolge+', İzmir',
      phone,status:'unknown',allDay:false,duty:true,dutyDate:row.Tarih.slice(0,10),verification:'official-duty',verifiedUntil,distance,
      hours:'Resmî nöbet tarihi: '+today+'. '+(row.BolgeAciklama?row.BolgeAciklama+'. ':'')+'Başlangıç ve bitiş aralığı doğrulanmamış; telefonla teyit et.',
      source:'İzmir Büyükşehir Belediyesi',sourceUrl:IZMIR_SOURCE_URL,fetchedAt});
  }
  if(parsed.data.length&&!currentRows){
    if(skippedDates)throw new Error('İzmir kaynağının nöbet tarihi güncel değil. Eski kayıtlar gösterilmedi.');
    throw new Error('İzmir nöbet kayıtlarının veri biçimi doğrulanamadı.');
  }
  if(currentRows&&!usableRows)throw new Error('İzmir nöbet kayıtlarının adres ve konumları doğrulanamadı.');
  return result(places,'İzmir Büyükşehir Belediyesi',fetchedAt,skipped,missingPhone,skippedDates);
}

export const pharmacyProvider:PlacesProvider={async search(params){
  const city=normalized(params.city||'').trim();
  if(city==='ankara')return searchAnkaraPharmacies(params);
  if(city==='kayseri')return kayseriPharmacyProvider.search(params);
  if(city==='konya')return konyaPharmacyProvider.search(params);
  if(city==='samsun'||city==='sinop')return samsunPharmacyProvider.search(params);
  if(city==='gaziantep')return gaziantepPharmacyProvider.search(params);
  if(city==='istanbul'||city==='yalova'){
    const html=await(await get(ISTANBUL_SOURCE_URL)).text();
    const token=html.match(/id="h"\s+value="([^"]+)"/)?.[1];
    if(!token||html.length>500000)throw new Error('İstanbul Eczacı Odası veri biçimi değişmiş.');
    const response=await get(ISTANBUL_SOURCE_URL+'index.php',{method:'POST',headers:{Referer:ISTANBUL_SOURCE_URL},body:new URLSearchParams({jx:'1',islem:'get_eczane_markers',h:token})});
    const payload:unknown=await response.json();
    return parseIstanbulPharmacies(payload,params,new Date());
  }
  if(city==='izmir'){
    const payload:unknown=await(await get(izmirEndpoint)).json();
    return parseIzmirPharmacies(payload,params,new Date());
  }
  const official=getPharmacySource(params.city);
  return {places:[],source:official.name,fetchedAt:new Date().toISOString(),coverage:'Bu ilde otomatik nöbet bağlantısı henüz yok. '+(official.kind==='duty-list'?'Resmî nöbet listesini':official.kind==='chamber'?'İlgili eczacı odasının sitesini':'Türk Eczacıları Birliği kaynak rehberini')+' aşağıdaki bağlantıdan açabilirsin.',warnings:['Genel eczane kayıtları nöbetçi eczane olarak gösterilmez.']};
}};
