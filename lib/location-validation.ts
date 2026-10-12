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
 return {label:v.display_name.trim(),city,lat,lng};
}
