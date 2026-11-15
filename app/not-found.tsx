import Link from 'next/link';
import type {Metadata} from 'next';
import {ArrowLeft,MapPin} from 'lucide-react';
import {SiteFooter} from '@/components/site-footer';
import {SiteMark} from '@/components/site-mark';

export const metadata:Metadata={
  title:'Sayfa bulunamadı | Şimdi Açık',
  description:'Aradığınız sayfa bulunamadı. Şimdi Açık ile yakınındaki açık nöbetçi eczaneleri hemen bulabilirsiniz.',
  robots:{index:false,follow:true},
  alternates:{canonical:null}
};

export default function NotFound(){
  return (
    <>
      <header className="header legal-header">
        <SiteMark />
        <Link className="legal-back" href="/"><ArrowLeft size={16}/>Eczane bul</Link>
      </header>
      <main className="legal-main">
        <div className="legal-title">
          <span>404</span>
          <h1>Aradığınız sayfa bulunamadı</h1>
          <p>Adres değişmiş, taşınmış veya kaldırılmış olabilir. Şimdi Açık ile konumuna en yakın nöbetçi eczaneleri kolayca bulabilirsin.</p>
        </div>
        <Link className="primary" href="/" style={{display:'inline-flex',alignItems:'center',gap:'8px',width:'fit-content',textDecoration:'none'}}>
          <MapPin size={17}/>
          Nöbetçi eczaneleri bul
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
