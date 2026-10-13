import Link from 'next/link';
import type {Metadata} from 'next';
import {ArrowLeft,ArrowUpRight,MapPin,Plus} from 'lucide-react';
import {cityGuides,getCityGuide} from '@/lib/city-guides';
import {siteOrigin} from '@/lib/site-config';
import {CityGuideSearch} from '@/components/city-guide-search';

export const dynamicParams = false;
export function generateStaticParams(){return cityGuides.map(city=>({city:city.slug}));}

export async function generateMetadata({params}:{params:Promise<{city:string}>}):Promise<Metadata>{
  const {city:slug}=await params;
  const city=getCityGuide(slug);
  if(!city)return {};
  const title=`${city.name} Nöbetçi Eczaneler`;
  const description=`${city.name} için güncel nöbetçi eczane kaynağına ulaş. İlçe veya konum seç, yakındaki eczaneleri haritada gör ve gitmeden önce telefonla teyit et.`;
  const canonical=`/nobetci-eczane/${city.slug}`;
  return {title,description,alternates:{canonical},openGraph:{type:'website',locale:'tr_TR',url:siteOrigin+canonical,siteName:'Şimdi Açık',title,description}};
}

export default async function CityGuidePage({params}:{params:Promise<{city:string}>}){
  const {city:slug}=await params;
  const city=getCityGuide(slug);
  if(!city)return null;
  const canonical=siteOrigin+`/nobetci-eczane/${city.slug}`;
  const schema={'@context':'https://schema.org','@type':'WebPage','@id':canonical+'#webpage',url:canonical,name:`${city.name} nöbetçi eczaneler`,inLanguage:'tr-TR',isPartOf:{'@id':siteOrigin+'/#website'},about:{'@type':'City','name':city.name,'containedInPlace':{'@type':'Country','name':'Türkiye'}}};
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/>
    <header className="header city-guide-header"><Link className="brand" href="/" aria-label="Şimdi Açık ana sayfa"><span className="brand-icon"><Plus size={25} strokeWidth={3}/></span><span className="brand-name">şimdi<span>açık</span><small>NÖBETÇİ ECZANE</small></span></Link><Link className="legal-back" href="/"><ArrowLeft size={15}/>Ana sayfa</Link></header>
    <main className="city-guide-main">
      <nav className="city-guide-breadcrumb" aria-label="Sayfa yolu"><Link href="/">Ana sayfa</Link><span aria-hidden="true">/</span><span>{city.name}</span></nav>
      <section className="city-guide-intro"><span className="city-guide-kicker"><MapPin size={14}/>{city.name}</span><h1>{city.name} nöbetçi eczaneler</h1><p>{city.name} içinde yakınındaki nöbetçi eczaneleri bulmak için konumunu kullanabilir veya ilçe seçebilirsin. Liste, {city.source.name} kaynağındaki güncel nöbet kayıtlarına göre oluşturulur.</p></section>
      <CityGuideSearch city={city.name}/>
      <section className="city-guide-note"><h2>Yola çıkmadan önce</h2><p>Nöbet listeleri gün içinde değişebilir. Eczaneye gitmeden önce kartındaki telefon numarasından hizmet durumunu teyit et. Sonuç bulunmaması, çevrende nöbetçi eczane olmadığı anlamına gelmez.</p><a href={city.source.url} target="_blank" rel="noreferrer">{city.source.name} resmî kaynağı <ArrowUpRight size={14}/></a></section>
      <nav className="city-guide-related" aria-label="Diğer desteklenen iller"><h2>Diğer desteklenen iller</h2><div>{cityGuides.filter(item=>item.slug!==city.slug).map(item=><Link href={`/nobetci-eczane/${item.slug}`} key={item.slug}>{item.name}</Link>)}</div></nav>
    </main>
    <footer className="legal-footer city-guide-footer"><Link href="/nobetci-eczane-rehberi">Nöbetçi eczane rehberi</Link><a href={city.source.url} target="_blank" rel="noreferrer">Resmî nöbet kaynağı</a><Link href="/">Yakınımdaki eczaneleri bul</Link></footer>
  </>;
}
