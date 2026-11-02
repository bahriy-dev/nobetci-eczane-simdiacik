import {ShieldCheck} from 'lucide-react';
import {isFreshDuty,type Place} from '@/lib/places';
const clock=(value:string)=>new Date(value).toLocaleTimeString('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'});
export function PharmacyStatus({p,now}:{p:Place;now:number}){const fresh=isFreshDuty(p,now);const upcoming=fresh&&p.opens&&Date.parse(p.opens)>now;return <span className={'status '+(upcoming?'upcoming':fresh?'duty':'expired')}><ShieldCheck size={13}/>{upcoming?`Nöbet başlangıcı ${clock(p.opens!)}`:fresh?'Nöbet listesinde':'Nöbet bilgisi yenilenmeli'}</span>;}
