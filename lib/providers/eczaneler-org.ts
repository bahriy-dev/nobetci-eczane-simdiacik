import {z} from 'zod';
import {requestSource,SourceFailure} from '../source-request';
import {distanceKm,normalized,type Place,type PlacesResult,type SearchParams} from '../places';
import {PHARMACY_CHAMBERS,getPharmacySource} from '../pharmacy-sources';
import {activeDutyDates} from '../duty-day';
export {activeDutyDates};

// Licensed Eczaneler.org v2 API. The key stays server-side (X-Api-Key) as the provider's terms require.
export const ECZANELER_API_URL='https://api.eczaneler.org/api/v2';
export const ECZANELER_SOURCE='Eczaneler.org';
const pageLimit=50,maxPages=40,cacheMs=10*60_000;

const text=(maximum:number)=>z.string().trim().max(maximum);
const pharmacyRow=z.object({
  id:z.number().int().positive(),city_id:z.number().int().optional(),
  name:text(200).min(1),phone:z.string().max(40).nullable().optional(),
  city:text(100).min(1),district:text(100).nullable().optional(),locality:text(200).nullable().optional(),
  address:text(1000).min(1),address_description:text(1000).nullable().optional(),
  sentry_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  is_sentry:z.union([z.boolean(),z.literal(1),z.literal(0)]),
  workingHours:text(200).nullable().optional(),note:text(1000).nullable().optional(),
  coordinates:z.object({lat:z.coerce.number(),lng:z.coerce.number()}),
});
const pageSchema=z.object({
  data:z.array(z.unknown()).max(pageLimit),
  pagination:z.object({total_pages:z.number().int().nonnegative(),total:z.number().int().nonnegative()}).partial().optional(),
});
type Row=z.infer<typeof pharmacyRow>;

export function eczanelerApiKey(){return process.env.ECZANELER_API_KEY?.trim()||'';}

function phoneNumber(value:unknown){
  if(typeof value!=='string')return undefined;
  const digits=value.replace(/\D/g,'');
  if(/^0[2-5]\d{9}$/.test(digits))return digits;
  if(/^[2-5]\d{9}$/.test(digits))return '0'+digits;
  if(/^90[2-5]\d{9}$/.test(digits))return '+'+digits;
  return undefined;
}
function point(row:Row){
  const {lat,lng}=row.coordinates;
  return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>35&&lat<43&&lng>25&&lng<45?{lat,lng}:undefined;
}
const dotted=(iso:string)=>iso.split('-').reverse().join('.');

export function plateForCity(city:string){
  const key=normalized(city).trim();
  return PHARMACY_CHAMBERS.find(chamber=>normalized(chamber.province)===key)?.provinceId;
}

/** Validates one city's on-duty rows and converts them; stale or foreign rows never reach the list. */
export function parseEczanelerPharmacies(rows:unknown[],params:SearchParams,now=new Date()):PlacesResult{
  if(!Number.isFinite(now.getTime())||!Number.isFinite(params.radius)||params.radius<=0)throw new Error('Eczane arama konumu geçersiz.');
  const city=normalized(params.city??'').trim(),dates=activeDutyDates(now);
  const fetchedAt=now.toISOString(),verifiedUntil=new Date(now.getTime()+300_000).toISOString();
  const official=getPharmacySource(params.city);
  const places:Place[]=[],ids=new Set<number>();
  let cityRows=0,currentRows=0,skipped=0,skippedDates=0,missingPhone=0;
  for(const raw of rows){
    const record=pharmacyRow.safeParse(raw);
    if(!record.success){skipped++;continue;}
    const row=record.data;
    if(normalized(row.city).trim()!==city){skipped++;continue;}
    cityRows++;
    if(row.is_sentry===false||row.is_sentry===0||!row.sentry_date||!dates.includes(row.sentry_date)){skippedDates++;continue;}
    currentRows++;
    const location=point(row);
    if(!location){skipped++;continue;}
    if(ids.has(row.id))continue;ids.add(row.id);
    const phone=phoneNumber(row.phone);
    if(!phone)missingPhone++;
    const distance=distanceKm(params.lat,params.lng,location.lat,location.lng);
    if(distance>params.radius)continue;
    const district=row.district?.trim();
    const hours=[`Nöbet tarihi: ${dotted(row.sentry_date)}.`,row.workingHours?`Kaynağın bildirdiği çalışma: ${row.workingHours}.`:'',row.address_description?`Tarif: ${row.address_description}.`:'','Gitmeden önce telefonla teyit et.'].filter(Boolean).join(' ');
    places.push({id:'eo-'+row.id,name:row.name,category:'Eczane',...location,
      address:[row.address,district&&!normalized(row.address).includes(normalized(district))?district:'',row.city].filter(Boolean).join(' · '),
      phone,status:'unknown',allDay:false,duty:true,dutyDate:row.sentry_date,verification:'provider-duty',verifiedUntil,distance,hours,
      source:ECZANELER_SOURCE,sourceUrl:official.url,fetchedAt});
  }
  if(cityRows&&!currentRows)throw new Error('Nöbet verisinin tarihi güncel değil. Eski kayıtlar gösterilmedi.');
  const warnings:string[]=[];
  if(skipped)warnings.push(skipped+' nöbet kaydı, adresi veya konumu doğrulanamadığı için gösterilmedi.');
  if(skippedDates)warnings.push(skippedDates+' kayıt güncel nöbet tarihine ait olmadığı için gösterilmedi.');
  if(missingPhone)warnings.push(missingPhone+' nöbet kaydının telefon bilgisi doğrulanamadı.');
  return {places:places.sort((a,b)=>a.distance-b.distance),source:ECZANELER_SOURCE,fetchedAt,
    coverage:`${ECZANELER_SOURCE} lisanslı nöbet verisi · Resmî liste: ${official.name}`,...(warnings.length?{partial:true,warnings}:{})};
}

async function fetchPage(plate:number,page:number,key:string){
  let response:Response;
  try{response=await requestSource(`${ECZANELER_API_URL}/pharmacies/sentry-city-list/${plate}/${page}?limit=${pageLimit}`,{headers:{Accept:'application/json','X-Api-Key':key}});}
  catch(error){
    // The provider answers 404 when a province has no on-duty record yet.
    if(error instanceof SourceFailure&&error.status===404)return {data:[]};
    throw error;
  }
  const parsed=pageSchema.safeParse(await response.json());
  if(!parsed.success)throw new SourceFailure('invalid-response');
  return parsed.data;
}

// One completed list per province for ten minutes, matching the provider's own refresh interval.
const cityCache=new Map<number,{rows:unknown[];expires:number}>();
const inFlight=new Map<number,Promise<unknown[]>>();
async function cityRows(plate:number,key:string){
  const cached=cityCache.get(plate);
  if(cached&&cached.expires>Date.now())return cached.rows;
  const pending=inFlight.get(plate);
  if(pending)return pending;
  const request=(async()=>{
    const first=await fetchPage(plate,1,key);
    const pages=Math.min(first.pagination?.total_pages??1,maxPages);
    const rest=await Promise.all(Array.from({length:Math.max(pages-1,0)},(_,i)=>fetchPage(plate,i+2,key)));
    const rows=[first,...rest].flatMap(page=>page.data);
    cityCache.set(plate,{rows,expires:Date.now()+cacheMs});
    return rows;
  })().finally(()=>inFlight.delete(plate));
  inFlight.set(plate,request);
  return request;
}

export async function searchEczanelerPharmacies(params:SearchParams):Promise<PlacesResult>{
  const key=eczanelerApiKey();
  if(!key)throw new Error('ECZANELER_API_KEY tanımlı değil.');
  const plate=plateForCity(params.city??'');
  if(!plate)throw new Error('İl tanınmadı.');
  return parseEczanelerPharmacies(await cityRows(plate,key),params,new Date());
}
