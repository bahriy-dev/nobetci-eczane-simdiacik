import {ShieldCheck} from 'lucide-react';
import {isFreshDuty,type Place} from '@/lib/places';
export function PharmacyStatus({p,now}:{p:Place;now:number}){const fresh=isFreshDuty(p,now);return <span className={'status '+(fresh?'duty':'expired')}><ShieldCheck size={13}/>{fresh?'Nöbet listesinde':'Nöbet bilgisi yenilenmeli'}</span>;}
