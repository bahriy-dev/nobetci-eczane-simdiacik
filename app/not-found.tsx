import Link from 'next/link';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Sayfa bulunamadı',robots:{index:false,follow:true},alternates:{canonical:null}};
export default function NotFound(){return <main className="legal-main"><div className="legal-title"><span>404</span><h1>Bu sayfa bulunamadı.</h1><p>Adres değişmiş veya kaldırılmış olabilir. Ana sayfadan yakındaki nöbetçi eczaneleri arayabilirsin.</p></div><Link className="primary" href="/">Eczane bul</Link></main>;}
