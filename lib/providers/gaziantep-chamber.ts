import {distanceKm,normalized,type Place,type PlacesResult,type SearchParams} from '../places';
import {requestSource} from '../source-request';
import {validTurkeyCoordinates} from '../location-validation';
import {activeDutyDates,dutyListEnds} from '../duty-day';
export const GAZIANTEP_CHAMBER_URL='https://www.gaziantepeo.org.tr/nobetci-eczaneler/';
const endpoint='https://www.gaziantepeo.org.tr/api/nobetci-eczaneler.JSON';
const fields=['tarih','unvan','enlem','boylam','telefon','adres','ilce','il','id'] as const;
// The chamber also serves Kilis; its rows carry il "KİLİS" in the same feed.
const served=new Map([['gaziantep','Gaziantep'],['kilis','Kilis']]);
/** Official documented parallel-array contract. Never zip arrays with mismatched lengths. */
export function parseGaziantepChamber(payload:unknown,params:SearchParams,now=new Date()):PlacesResult{
 const province=normalized(params.city||'').trim(),provinceName=served.get(province);
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||!Number.isFinite(now.getTime())||!validTurkeyCoordinates(params.lat,params.lng)||!Number.isFinite(params.radius)||params.radius<=0||!provinceName)throw new Error('Gaziantep oda yanıtı doğrulanamadı.');
 const data=payload as Record<string,unknown>;
 const values:Record<string,string[]>={};let length:number|undefined;
 for(const key of fields){const rows=data[key];if(!Array.isArray(rows)||rows.length>500||rows.some(v=>typeof v!=='string'||v.length>1200)||(length!==undefined&&rows.length!==length))throw new Error('Gaziantep oda kayıtlarının biçimi doğrulanamadı.');length=rows.length;values[key]=rows;}
 // Before the morning handover the endpoint still serves the list that started the previous morning.
 const day=values.tarih[0]??'',active=activeDutyDates(now);
 const fetchedAt=now.toISOString(),verifiedUntil=new Date(Math.min(now.getTime()+300000,dutyListEnds(day))).toISOString();
 const places:Place[]=[],seen=new Set<string>();let skipped=0,usable=0,provinceRows=0,missingPhone=0;
 for(let i=0;i<(length||0);i++){
  if(values.tarih[i]!==day||!active.includes(day))throw new Error('Gaziantep oda kaynağının tarihi güncel değil.');
  if(normalized(values.il[i].trim())!==province)continue;provinceRows++;
  const lat=Number(values.enlem[i]),lng=Number(values.boylam[i]);
  // "ARZU ECZAESİ (KİLİS)": the province note and the feed's misspelling are not part of the name.
  const name=values.unvan[i].replace(/\s*\((?:K[İI]L[İI]S|GAZ[İI]ANTEP)\)\s*$/iu,'').replace(/(?<!\p{L})ECZAES([İI])(?!\p{L})/u,'ECZANES$1').trim(),address=values.adres[i].trim(),district=values.ilce[i].trim(),sourceId=values.id[i].trim();
  if(!name||name.length>200||!address||address.length>1000||!district||district.length>100||!sourceId||!values.enlem[i].trim()||!values.boylam[i].trim()||!validTurkeyCoordinates(lat,lng)||lat<36.5||lat>38||lng<36.2||lng>38.6){skipped++;continue;}
  usable++;const id='geo-'+sourceId;if(seen.has(id))continue;seen.add(id);
  const raw=values.telefon[i].trim(),digits=raw.replace(/\D/g,'');
  const phone=/^\+?[\d\s()-]+$/.test(raw)?(/^0[2-5]\d{9}$/.test(digits)?digits:/^[2-5]\d{9}$/.test(digits)?'0'+digits:/^90[2-5]\d{9}$/.test(digits)?'+'+digits:undefined):undefined;
  if(!phone)missingPhone++;const distance=distanceKm(params.lat,params.lng,lat,lng);if(distance>params.radius)continue;
  places.push({id,name,address:address+' · '+district+', '+provinceName,lat,lng,phone,distance,category:'Eczane',duty:true,dutyDate:day,verification:'official-duty',status:'unknown',allDay:false,verifiedUntil,fetchedAt,source:'Gaziantep Eczacı Odası',sourceUrl:GAZIANTEP_CHAMBER_URL,hours:'Güncel resmî nöbet listesinde. Başlangıç ve bitiş aralığı doğrulanmamış; telefonla teyit et.'});
 }
 if((length&&!provinceRows)||(provinceRows&&!usable))throw new Error('Gaziantep oda kayıtları doğrulanamadı.');
 const warnings=[...(skipped?[`${skipped} kaydın adres veya konumu doğrulanamadı.`]:[]),...(missingPhone?[`${missingPhone} kaydın telefonu doğrulanamadı.`]:[])];
 return {places:places.sort((a,b)=>a.distance-b.distance),source:'Gaziantep Eczacı Odası',fetchedAt,coverage:'Gaziantep Eczacı Odası güncel resmî nöbet listesi',...(warnings.length?{partial:true,warnings}:{})};
}
export async function searchGaziantepChamber(params:SearchParams){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date());const response=await requestSource(endpoint+'?tarih='+day);return parseGaziantepChamber(await response.json(),params,new Date());}
