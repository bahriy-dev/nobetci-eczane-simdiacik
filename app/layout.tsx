import type {Metadata} from 'next';
import './globals.css';
const origin='https://simdiacik-kesfet.bahriyilmaz-dev.chatgpt.site';
const description='Yakınındaki nöbetçi eczaneleri haritada bul. İl ve ilçe seç, eczaneyi telefonla ara ve tek dokunuşla yol tarifi al.';
export const metadata:Metadata={
 metadataBase:new URL(origin),title:'Nöbetçi Eczane Bul · Harita ve Yol Tarifi | Şimdi Açık',description,
 alternates:{canonical:'/'},applicationName:'Şimdi Açık',manifest:'/manifest.webmanifest',
 icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'},
 // The current publication is owner-private. Enable indexing only with public access.
 robots:{index:false,follow:false},
 openGraph:{type:'website',locale:'tr_TR',url:origin,siteName:'Şimdi Açık',title:'Yakınındaki nöbetçi eczaneyi bul',description},
 twitter:{card:'summary',title:'Şimdi Açık · Nöbetçi Eczane',description}
};
const schema={'@context':'https://schema.org','@type':'WebSite',name:'Şimdi Açık',url:origin,inLanguage:'tr-TR',description};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr"><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/>{children}</body></html>}
