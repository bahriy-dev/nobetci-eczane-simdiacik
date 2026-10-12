'use client';
import {MapPin,Navigation,Phone} from 'lucide-react';
import type {Place} from '@/lib/places';
import {pharmacyDistance,pharmacyDirections,pharmacyPhoneLink} from '@/lib/pharmacy-presentation';
import {PharmacyStatus} from './pharmacy-status';
type Props={p:Place;number:number;now:number;highlighted:boolean;closest:boolean;onOpen:()=>void;onHover:(id:string|null)=>void};
export function PharmacyCard({p,number,now,highlighted,closest,onOpen,onHover}:Props){return <article id={'pharmacy-'+p.id} className={'pharmacy-card '+(highlighted?'highlight':'')} onMouseEnter={()=>onHover(p.id)} onMouseLeave={()=>onHover(null)}>
 <button className="card-open" aria-label={p.name+' eczane bilgilerini aç'} onClick={onOpen}/>
 <div className="pharmacy-card-top"><span className="pharmacy-symbol" aria-label={number+' numaralı harita pini'}>{number}</span><div><h3 className="pharmacy-name">{p.name.toLocaleLowerCase('tr-TR').replace(/(^|\s)\S/g, c=>c.toLocaleUpperCase('tr-TR'))}</h3><div className="card-status-row"><PharmacyStatus p={p} now={now}/><span>{pharmacyDistance(p)}</span>{closest&&<span className="closest">En yakın</span>}</div></div></div>
 <p className="pharmacy-address"><MapPin size={14}/>{p.address}</p>
 <div className="pharmacy-actions"><a className="directions-button" href={pharmacyDirections(p)} target="_blank" rel="noreferrer"><Navigation size={16}/>Yol tarifi</a>{p.phone?<a className="primary" href={pharmacyPhoneLink(p.phone)}><Phone size={16}/>Eczaneyi ara</a>:<span className="no-phone">Telefon paylaşılmamış</span>}</div>

 </article>}
