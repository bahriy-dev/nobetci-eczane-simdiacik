import {z} from 'zod';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {requestSource,SourceFailure} from '../source-request';
import {distanceKm,normalized,type Place,type PlacesResult,type SearchParams} from '../places';
import {getPharmacySource} from '../pharmacy-sources';
import {activeDutyDates,dutyListEnds,turkeyDay} from '../duty-day';

/**
 * EczaneAPI (eczaneapi.com), a third-party on-duty pharmacy API with a free plan. Used only where no
 * official source can be read (closed or refusing this server). The key stays on the server
 * (X-API-Key). One request returns yesterday, today and tomorrow for a province, so each province is
 * asked at most once per day: the provider refreshes its data at 00:00, the cache turns over at 00:30.
 */
export const ECZANEAPI_URL='https://eczaneapi.com/api/v1/pharmacies/on-duty';
export const ECZANEAPI_SOURCE='EczaneAPI';
export function eczaneApiKey(){return process.env.ECZANEAPI_KEY?.trim()||'';}

const text=(max:number)=>z.string().trim().max(max);
const coordinate=z.unknown().transform(value=>{const n=typeof value==='number'?value:typeof value==='string'?Number(value.trim()):NaN;return Number.isFinite(n)?n:null;});
const pharmacyRow=z.object({
  id:z.union([z.string().max(80),z.number()]),
  name:text(200).min(1),
  address:text(1000).nullable().optional(),
  phone:text(40).nullable().optional(),phone2:text(40).nullable().optional(),
  location:z.object({latitude:coordinate,longitude:coordinate}).nullable().optional(),
  city:z.object({name:text(100).optional(),slug:text(100).optional()}).nullable().optional(),
  district:z.object({name:text(100).optional()}).nullable().optional(),
  duty:z.object({date:z.string().max(40)}),
});
// With a date, `data` is that day; without one (as asked here) it is yesterday, today and tomorrow.
const day=z.object({pharmacies:z.array(z.unknown()).max(3000)});
const payload=z.object({success:z.literal(true),data:z.union([day,z.array(day).max(7)])});

function phoneNumber(value?:string|null){
  const digits=(value??'').replace(/\D/g,'');
  if(/^0[2-5]\d{9}$/.test(digits))return digits;
  if(/^[2-5]\d{9}$/.test(digits))return '0'+digits;
  if(/^90[2-5]\d{9}$/.test(digits))return '+'+digits;
  return undefined;
}

/** Keeps only the running duty day (yesterday's list until the 09:00 handover) of the requested province. */
export function parseEczaneApi(raw:unknown,params:SearchParams,now=new Date()):PlacesResult{
  if(!Number.isFinite(now.getTime())||!Number.isFinite(params.radius)||params.radius<=0)throw new Error('Eczane arama konumu geçersiz.');
  const parsed=payload.safeParse(raw);
  if(!parsed.success)throw new SourceFailure('invalid-response');
  const city=normalized(params.city??'').trim(),running=activeDutyDates(now).at(-1)!;
  const official=getPharmacySource(params.city),fetchedAt=now.toISOString();
  const verifiedUntil=new Date(Math.min(now.getTime()+300_000,dutyListEnds(running))).toISOString();
  const places:Place[]=[],ids=new Set<string>();
  let cityRows=0,currentRows=0,skipped=0,missingAddress=0,missingPhone=0;
  const days=Array.isArray(parsed.data.data)?parsed.data.data:[parsed.data.data];
  for(const item of days.flatMap(entry=>entry.pharmacies)){
    const record=pharmacyRow.safeParse(item);
    if(!record.success){skipped++;continue;}
    const row=record.data;
    const rowCity=normalized(row.city?.slug??row.city?.name??'').replace(/[^a-z]/g,'');
    if(rowCity&&rowCity!==city.replace(/[^a-z]/g,''))continue;
    cityRows++;
    if(row.duty.date.slice(0,10)!==running)continue;
    currentRows++;
    const lat=row.location?.latitude??NaN,lng=row.location?.longitude??NaN;
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<35||lat>43||lng<25||lng>45){skipped++;continue;}
    const id='eapi-'+row.id;
    if(ids.has(id))continue;ids.add(id);
    const district=row.district?.name?.trim();
    // The provider withholds addresses it cannot vouch for; the card then sends people to the phone.
    const address=row.address?.trim()||`${district?district+' · ':''}adres paylaşılmamış, telefonla sor`;
    if(!row.address?.trim())missingAddress++;
    const phone=phoneNumber(row.phone)??phoneNumber(row.phone2);
    if(!phone)missingPhone++;
    const distance=distanceKm(params.lat,params.lng,lat,lng);
    if(distance>params.radius)continue;
    places.push({id,name:row.name,category:'Eczane',lat,lng,
      address:district&&row.address&&!normalized(row.address).includes(normalized(district))?`${row.address} · ${district}`:address,
      phone,status:'unknown',allDay:false,duty:true,dutyDate:running,verification:'provider-duty',verifiedUntil,distance,
      hours:'Nöbet günü kaynakta belirtilmiştir; başlangıç ve bitiş saati verilmiyor. Gitmeden önce telefonla teyit et.',
      source:ECZANEAPI_SOURCE,sourceUrl:official.url,fetchedAt});
  }
  if(cityRows&&!currentRows)throw new Error('EczaneAPI listesinin tarihi güncel değil. Eski kayıtlar gösterilmedi.');
  if(!currentRows)throw new Error('EczaneAPI bu il için nöbet kaydı döndürmedi.');
  const warnings:string[]=[];
  if(skipped)warnings.push(`${skipped} nöbet kaydı konumu doğrulanamadığı için gösterilmedi.`);
  if(missingAddress)warnings.push(`${missingAddress} kaydın adresi kaynakta paylaşılmamış; gitmeden önce telefonla sor.`);
  if(missingPhone)warnings.push(`${missingPhone} nöbet kaydının telefon bilgisi doğrulanamadı.`);
  return {places:places.sort((a,b)=>a.distance-b.distance),source:ECZANEAPI_SOURCE,fetchedAt,
    coverage:`${ECZANEAPI_SOURCE} nöbet verisi · Resmî liste: ${official.name}`,...(warnings.length?{partial:true,warnings}:{})};
}

// Once asked, a province's answer is kept for the rest of its day, in memory and on disk (so a server
// restart does not ask again). The day turns over half an hour after the provider's nightly refresh,
// so a province costs one request a day however many people look at it. A failed request (quota,
// outage) is not retried for half an hour, so failures cannot use up the quota either.
const turnover=(time:number)=>turkeyDay(time-30*60_000);
const cacheDir=()=>process.env.ECZANEAPI_CACHE_DIR||join(tmpdir(),'simdiacik-eczaneapi');
const cache=new Map<string,{rows:unknown;day:string}>();
const pending=new Map<string,Promise<unknown>>();
const failedUntil=new Map<string,number>();
const retryAfterFailureMs=30*60_000;
const cacheFile=(slug:string)=>join(cacheDir(),`${slug}.json`);
async function readStored(slug:string,day:string){
  try{
    const stored=JSON.parse(await readFile(cacheFile(slug),'utf8')) as {rows?:unknown;day?:string};
    return stored.day===day&&stored.rows!==undefined?stored.rows:undefined;
  }catch{return undefined;}
}
async function provinceRows(slug:string,key:string){
  const day=turnover(Date.now()),hit=cache.get(slug);
  if(hit&&hit.day===day)return hit.rows;
  const running=pending.get(slug);
  if(running)return running;
  const request=(async()=>{
    const stored=await readStored(slug,day);
    if(stored!==undefined){cache.set(slug,{rows:stored,day});return stored;}
    if((failedUntil.get(slug)??0)>Date.now())throw new SourceFailure('rate-limited');
    try{
      const rows=await (await requestSource(`${ECZANEAPI_URL}?${new URLSearchParams({city:slug})}`,{headers:{Accept:'application/json','X-API-Key':key}})).json();
      cache.set(slug,{rows,day});
      await mkdir(cacheDir(),{recursive:true}).then(()=>writeFile(cacheFile(slug),JSON.stringify({day,rows}))).catch(()=>undefined);
      return rows;
    }catch(error){
      failedUntil.set(slug,Date.now()+retryAfterFailureMs);
      throw error;
    }
  })().finally(()=>pending.delete(slug));
  pending.set(slug,request);
  return request;
}

export async function searchEczaneApi(params:SearchParams):Promise<PlacesResult>{
  const key=eczaneApiKey();
  if(!key)throw new Error('ECZANEAPI_KEY tanımlı değil.');
  const slug=normalized(params.city??'').replace(/[^a-z]/g,'');
  if(!slug)throw new Error('İl tanınmadı.');
  return parseEczaneApi(await provinceRows(slug,key),params,new Date());
}
