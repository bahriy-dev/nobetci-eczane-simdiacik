export type ResolvedLocation={label:string;city:string;lat:number;lng:number};
export function validTurkeyCoordinates(lat:number,lng:number){return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=35&&lat<=43&&lng>=25&&lng<=45;}
export function parseResolvedLocation(value:unknown):ResolvedLocation|undefined{
 if(!value||typeof value!=='object')return;
 const v=value as Record<string,unknown>,address=v.address;
 if(!address||typeof address!=='object'||typeof v.display_name!=='string'||v.display_name.length>1000)return;
 const a=address as Record<string,unknown>,raw=a.province||a.state||a.city;
 if(typeof raw!=='string')return;
 const city=raw.replace(/ ili$/i,'').trim(),lat=Number(v.lat),lng=Number(v.lon);
 if(city.length<2||city.length>60||!validTurkeyCoordinates(lat,lng)||!v.display_name.trim())return;
 return {label:shortLabel(a,v.display_name,city),city,lat,lng};
}
const part=(value:unknown)=>typeof value==='string'&&value.trim().length<=80?value.trim():'';
/** "Kızılay, Çankaya, Ankara" instead of the geocoder's full line with region, postcode and country. */
function shortLabel(a:Record<string,unknown>,displayName:string,city:string){
 const parts:string[]=[];
 for(const value of [part(a.suburb)||part(a.neighbourhood)||part(a.quarter)||part(a.village)||part(a.hamlet),part(a.county)||part(a.town)||part(a.city_district)||part(a.district),city])
  if(value&&!parts.some(p=>p.toLocaleLowerCase('tr')===value.toLocaleLowerCase('tr')))parts.push(value);
 if(parts.length>=2)return parts.join(', ');
 const display=displayName.split(',').map(s=>s.trim()).filter(s=>s&&!/^\d{5}$/.test(s)&&!/^(türkiye|turkey)$/i.test(s)&&!/bölgesi$/i.test(s));
 return display.slice(0,3).join(', ')||city;
}
