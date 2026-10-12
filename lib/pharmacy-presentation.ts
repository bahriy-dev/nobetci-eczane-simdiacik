import type {Place} from './places';
export const pharmacyDistance=(p:Place)=>p.distance<1?`${Math.round(p.distance*1000)} m`:`${p.distance.toFixed(1)} km`;
export const pharmacyDirections=(p:Pick<Place,'lat'|'lng'>)=>`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
export const pharmacyMapLink=(p:Pick<Place,'lat'|'lng'>)=>`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
export const pharmacyPhoneLink=(phone:string)=>'tel:'+phone.replace(/[^\d+]/g,'');
export const pharmacyTimestamp=(value:string|number)=>new Date(value).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
export function pharmacyDutyDate(value?:string){
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return undefined;
 const date=new Date(value+'T00:00:00+03:00');
 if(!Number.isFinite(date.getTime()))return undefined;
 const sourceDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(date);
 return sourceDay===value?date.toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',year:'numeric'}):undefined;
}
