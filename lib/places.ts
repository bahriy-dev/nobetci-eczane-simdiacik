export const categoryNames=['Eczane'] as const;
export type Category=typeof categoryNames[number];
export type Place={id:string;name:string;category:Category;lat:number;lng:number;address:string;phone?:string;website?:string;hours?:string;status:'open'|'closed'|'unknown';closes?:string;allDay:boolean;distance:number;rating?:number;reviewCount?:number;price?:number;photo?:string;reviews?:{author:string;rating:number;text:string;date:string}[];source:string;sourceUrl?:string;fetchedAt:string;demo?:boolean;duty?:boolean;dutyDate?:string;verifiedUntil?:string;verification?:'official-duty'|'provider-duty'|'provider-hours'|'listed-only'};
export type SearchParams={lat:number;lng:number;radius:number;query:string;category:string;demo:boolean;city?:string};
export type PlacesResult={places:Place[];fetchedAt:string;source:string;cached?:boolean;partial?:boolean;warnings?:string[];coverage?:string;coverageStatus?:'supported'|'unsupported'};
export interface PlacesProvider{search(params:SearchParams):Promise<PlacesResult>}
export function distanceKm(a:number,b:number,c:number,d:number){const r=Math.PI/180;const h=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
export const normalized=(x:string)=>x.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const genericPharmacyTerms=new Set(['eczane','eczanesi','eczaneler','eczaneleri','eczanesini','eczanesine','eczanesinde','eczanesinden','eczaci','nobetci','nobet','acik','simdi','bugun','gece','yakinimdaki','yakinimda']);
export function parseQuery(query:string){
  const text=normalized(query).replace(/\b(?:24\s*saat|7\s*\/\s*24|24\s*\/\s*7|su\s+an(?:da)?|en\s+yakin)\b/g,' ');
  const terms=(text.match(/[\p{L}\p{N}]+/gu)||[]).filter(term=>!genericPharmacyTerms.has(term));
  return {category:'Eczane' as const,allDay:false,terms};
}
export function isFreshDuty(place:Place,now:number){
  return place.category==='Eczane'&&place.duty===true&&Number.isFinite(now)&&Boolean(place.verifiedUntil)&&Date.parse(place.verifiedUntil!)>now;
}
type PlaceFilters={category:Category;radius:number;onlyOpen:boolean;hasPhone:boolean;favoritesOnly:boolean;favorites:string[];query:string;now:number};
export function filterPlaces(places:Place[],filters:PlaceFilters){
  const parsed=parseQuery(filters.query);
  let list=places.filter(p=>p.category===filters.category&&isFreshDuty(p,filters.now)&&Number.isFinite(p.distance)&&p.distance>=0&&p.distance<=filters.radius&&(!filters.hasPhone||Boolean(p.phone))&&(!filters.favoritesOnly||filters.favorites.includes(p.id)));
  if(parsed.terms.length)list=list.filter(p=>{const text=normalized(p.name+' '+p.address);return parsed.terms.every(term=>text.includes(term))});
  return [...list].sort((a,b)=>a.distance-b.distance);
}
export const safeUrl=(url?:string)=>{if(!url)return undefined;try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:undefined}catch{return undefined}};
