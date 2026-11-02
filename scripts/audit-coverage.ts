/**
 * Audits what the app actually serves for every province and district.
 * Usage: ECZANELER_API_KEY=... npm run audit:coverage [-- İl1 İl2]
 * Without a key it audits the official fallback sources only.
 */
import {listRegions,type ProvinceDTO} from '../lib/regions';
import {pharmacyProvider} from '../lib/providers/pharmacies';
import {distanceKm,normalized,type Place} from '../lib/places';

type Row={province:string;status:'ok'|'warning'|'error'|'official-link';total:number;districts:number;covered:number;empty:string[];problems:string[]};
const onlyProvinces=process.argv.slice(2).map(name=>normalized(name));
const mentions=(place:Place,district:string)=>new RegExp(`(^|[^\\p{L}])${normalized(district)}($|[^\\p{L}])`,'u').test(normalized(place.address));

async function auditProvince(province:ProvinceDTO):Promise<Row>{
  const districts=(await listRegions(province.id)).regions.map(d=>d.name);
  const base={province:province.name,total:0,districts:districts.length,covered:0,empty:districts};
  let result;
  try{result=await pharmacyProvider.search({city:province.name,lat:province.lat,lng:province.lng,radius:2000,category:'Eczane',query:'',demo:false});}
  catch(error){return {...base,status:'error',problems:[error instanceof Error?error.message:String(error)]};}
  if(result.coverageStatus==='unsupported')return {...base,status:'official-link',problems:[]};
  const problems:string[]=[],ids=new Set<string>(),now=Date.now();
  for(const p of result.places){
    if(ids.has(p.id))problems.push(`kopya kayıt: ${p.name}`);
    ids.add(p.id);
    // Province centres sit inside their province; ~170 km covers the largest (Konya).
    if(distanceKm(province.lat,province.lng,p.lat,p.lng)>170)problems.push(`il dışında konum: ${p.name} (${p.lat}, ${p.lng})`);
    if(!p.verifiedUntil||Date.parse(p.verifiedUntil)<=now)problems.push(`doğrulaması geçmiş: ${p.name}`);
    if(p.phone&&!/^(0[2-5]\d{9}|\+90[2-5]\d{9})$/.test(p.phone))problems.push(`telefon biçimi: ${p.name} ${p.phone}`);
  }
  const empty=districts.filter(d=>!result.places.some(p=>mentions(p,d)));
  return {province:province.name,status:problems.length?'error':empty.length?'warning':'ok',total:result.places.length,districts:districts.length,covered:districts.length-empty.length,empty,problems};
}

const provinces=((await listRegions()).regions as ProvinceDTO[]).filter(p=>!onlyProvinces.length||onlyProvinces.includes(normalized(p.name)));
const rows:Row[]=[];
for(const province of provinces){
  const row=await auditProvince(province);
  rows.push(row);
  const label={ok:'✔',warning:'△',error:'✖','official-link':'↗'}[row.status];
  console.log(`${label} ${row.province.padEnd(15)} ${String(row.total).padStart(4)} eczane · ilçe ${row.covered}/${row.districts}${row.empty.length&&row.status!=='official-link'?' · boş: '+row.empty.join(', '):''}`);
  for(const problem of row.problems)console.log(`    ${problem}`);
}
const count=(status:Row['status'])=>rows.filter(r=>r.status===status).length;
console.log(`\n${rows.length} il: ${count('ok')} tam, ${count('warning')} eksik ilçeli, ${count('error')} hatalı, ${count('official-link')} resmî bağlantı`);
process.exitCode=count('error')?1:0;
