export type BrowserLocation = {label:string;city:string;lat:number;lng:number;accuracy?:number};

type StoredLocation = BrowserLocation & {savedAt:number};
type StorageLike = Pick<Storage,'getItem'|'setItem'|'removeItem'>;

const CACHE_KEY='simdiacik-location-v1';
export const LOCATION_CACHE_MAX_AGE=24*60*60*1000;

export function readLocationCache(storage?:StorageLike,now=Date.now()):BrowserLocation|null{
  try{
    const target=storage??globalThis.localStorage;
    const raw=target.getItem(CACHE_KEY);
    if(!raw)return null;
    const item=JSON.parse(raw) as Partial<StoredLocation>;
    const valid=typeof item.label==='string'&&item.label.length>0&&typeof item.city==='string'&&item.city.length>0&&
      typeof item.lat==='number'&&Number.isFinite(item.lat)&&item.lat>=35&&item.lat<=43&&
      typeof item.lng==='number'&&Number.isFinite(item.lng)&&item.lng>=25&&item.lng<=45&&
      (item.accuracy===undefined||(typeof item.accuracy==='number'&&Number.isFinite(item.accuracy)&&item.accuracy>=0&&item.accuracy<=100000))&&
      typeof item.savedAt==='number'&&Number.isFinite(item.savedAt)&&item.savedAt<=now&&now-item.savedAt<=LOCATION_CACHE_MAX_AGE;
    if(!valid){target.removeItem(CACHE_KEY);return null;}
    return {label:item.label!,city:item.city!,lat:item.lat!,lng:item.lng!,...(item.accuracy===undefined?{}:{accuracy:item.accuracy})};
  }catch{try{(storage??globalThis.localStorage).removeItem(CACHE_KEY);}catch{}return null;}
}

export function writeLocationCache(location:BrowserLocation,storage?:StorageLike,now=Date.now()):void{
  try{(storage??globalThis.localStorage).setItem(CACHE_KEY,JSON.stringify({...location,savedAt:now}));}catch{}
}

export function clearLocationCache(storage?:StorageLike):void{
  try{(storage??globalThis.localStorage).removeItem(CACHE_KEY);}catch{}
}
