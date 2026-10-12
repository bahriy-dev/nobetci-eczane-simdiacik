'use client';
import {X,MapPin,Phone,Navigation,Share2,Copy,CalendarDays} from 'lucide-react';
import {SheetTitle,SheetDescription} from './ui/sheet';
import {PharmacyStatus} from './pharmacy-status';
import {pharmacyDistance,pharmacyDirections,pharmacyPhoneLink,pharmacyDutyDate} from '@/lib/pharmacy-presentation';
import type {Place} from '@/lib/places';
type Props={place:Place;now:number;onClose:()=>void;onCopy:()=>void;onShare:()=>void};
export function PharmacyDetail({place:p,now,onClose,onCopy,onShare}:Props){const date=pharmacyDutyDate(p.dutyDate);return <div className="pharmacy-detail-content"><div className="panel-handle" aria-hidden="true"/><button className="panel-close" onClick={onClose} aria-label="Kapat"><X size={20}/></button>
 <div className="detail-heading"><span className="detail-avatar">E</span><div><PharmacyStatus p={p} now={now}/><span className="detail-distance">{pharmacyDistance(p)} uzaklıkta</span></div></div><SheetTitle className="detail-title">{p.name}</SheetTitle><SheetDescription className="sr-only">Eczane adresi, telefonu ve yol tarifi</SheetDescription>
 <div className="detail-address-box"><MapPin size={20}/><div><span className="detail-row-label">Adres</span><p>{p.address}</p><button className="detail-copy" onClick={onCopy}><Copy size={13}/>Adresi kopyala</button></div></div>
 {p.phone&&<a className="detail-phone-box" href={pharmacyPhoneLink(p.phone)}><span className="detail-row-icon"><Phone size={19}/></span><span><small>Telefon</small><b>{p.phone}</b></span><Phone size={16}/></a>}
 {date&&<div className="detail-date"><CalendarDays size={15}/><span>{date}</span></div>}
 <div className="detail-utility-actions"><button onClick={onShare}><Share2 size={17}/>Paylaş</button></div>
 <div className="detail-bottom-actions"><a className="primary" href={pharmacyDirections(p)} target="_blank" rel="noreferrer"><Navigation size={18}/>Yol tarifi</a>{p.phone&&<a className="detail-call" href={pharmacyPhoneLink(p.phone)}><Phone size={18}/>Eczaneyi ara</a>}</div>
 </div>}
