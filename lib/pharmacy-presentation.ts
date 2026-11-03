import type {Place} from './places';
export const pharmacyDistance=(p:Place)=>p.distance<1?`${Math.round(p.distance*1000)} m`:`${p.distance.toFixed(1)} km`;
// A point estimated at neighbourhood level would mislead turn-by-turn directions, so its name and address are sent instead.
export const pharmacyDirections=(p:Pick<Place,'lat'|'lng'>&Partial<Pick<Place,'name'|'address'|'locationEstimate'>>)=>`https://www.google.com/maps/dir/?api=1&destination=${p.locationEstimate&&p.locationEstimate!=='pharmacy'&&p.name&&p.address?encodeURIComponent(`${p.name}, ${p.address.replace(/\s*·\s*/g,', ')}`):`${p.lat},${p.lng}`}`;
export const pharmacyLocationNote=(p:Pick<Place,'locationEstimate'>)=>p.locationEstimate==='pharmacy'?'Kaynak harita konumu vermiyor; konum OpenStreetMap eczane kaydından alındı.':p.locationEstimate==='neighbourhood'?'Kaynak harita konumu vermiyor; konum adresteki mahalle ve sokağa göre yaklaşık gösteriliyor.':p.locationEstimate==='district'?'Kaynak yalnızca ilçeyi veriyor; konum ilçe merkezine göre yaklaşık gösteriliyor. Yol tarifi eczane adıyla aranır.':undefined;
export const pharmacyAppleDirections=(p:Pick<Place,'lat'|'lng'>)=>`https://maps.apple.com/?daddr=${p.lat},${p.lng}`;
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
/** Card line: street and number only. District/province ("Çankaya/ANKARA") and directions stay in the detail panel. */
export function pharmacyShortAddress(address:string){
 const first=address.split(' · ')[0].trim();
 const street=first.replace(/(?:^|\s)[\p{L}.]+(?:\s*\/\s*[\p{L}.]+)*\s*\/\s*\p{L}+(?:\s.*)?$/u,'').replace(/[\s,]+$/,'').trim();
 const line=street.length>=8?street:first;
 return /\p{Ll}/u.test(line)?line:line.toLocaleLowerCase('tr-TR').replace(/(^|[\s.(/-])\p{L}/gu,c=>c.toLocaleUpperCase('tr-TR'));
}
/** "02242225770" → "0224 222 57 70"; anything else is shown as given. */
export function pharmacyPhoneDisplay(phone:string){
 const digits=phone.replace(/[^\d+]/g,''),local=digits.match(/^0(\d{3})(\d{3})(\d{2})(\d{2})$/),intl=digits.match(/^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/);
 return local?`0${local[1]} ${local[2]} ${local[3]} ${local[4]}`:intl?`+90 ${intl[1]} ${intl[2]} ${intl[3]} ${intl[4]}`:phone;
}
/** Full address with all-capital parts in the same case the card uses. */
export const pharmacyDisplayAddress=(address:string)=>address.split(' · ').map(part=>/\p{Ll}/u.test(part)?part:part.toLocaleLowerCase('tr-TR').replace(/(^|[\s.(/-])\p{L}/gu,c=>c.toLocaleUpperCase('tr-TR'))).join(' · ');
/** Sources publish names in capitals; cards and the detail panel show the same title case. */
export const pharmacyDisplayName=(name:string)=>name.toLocaleLowerCase('tr-TR').replace(/(^|\s)\S/g,c=>c.toLocaleUpperCase('tr-TR'));
