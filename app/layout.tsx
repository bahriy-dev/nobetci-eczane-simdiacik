import type {Metadata,Viewport} from 'next';
import {siteOrigin,siteDescription,siteIndexable} from '@/lib/site-config';
import './globals.css';
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#285c4b'};
export const metadata:Metadata={
 metadataBase:new URL(siteOrigin),
 title:{default:'Nöbetçi Eczane Bul — Yakınındaki Eczaneler | Şimdi Açık',template:'%s | Şimdi Açık'},
 description:siteDescription,applicationName:'Şimdi Açık',manifest:'/manifest.webmanifest',
 alternates:{canonical:'/'},
 icons:{icon:'/favicon.svg',shortcut:'/favicon.svg',apple:'/apple-touch-icon.png'},
 robots:{index:siteIndexable,follow:true,googleBot:{index:siteIndexable,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1}},
 ...(process.env.GOOGLE_SITE_VERIFICATION?{verification:{google:process.env.GOOGLE_SITE_VERIFICATION}}:{}),
 openGraph:{type:'website',locale:'tr_TR',url:siteOrigin,siteName:'Şimdi Açık',title:'Yakınındaki nöbetçi eczaneyi bul',description:siteDescription,images:[{url:'/og-image.png',width:1200,height:630,alt:'Şimdi Açık — Yakınındaki nöbetçi eczaneler'}]},
 twitter:{card:'summary_large_image',title:'Şimdi Açık — Nöbetçi Eczane Bul',description:siteDescription,images:['/og-image.png']},
 referrer:'strict-origin-when-cross-origin',formatDetection:{telephone:false}
};
const schema={'@context':'https://schema.org','@graph':[
 {'@type':'WebSite','@id':siteOrigin+'/#website',name:'Şimdi Açık',url:siteOrigin,inLanguage:'tr-TR',description:siteDescription},
 {'@type':'WebApplication','@id':siteOrigin+'/#application',name:'Şimdi Açık',url:siteOrigin,applicationCategory:'UtilitiesApplication',operatingSystem:'Web',inLanguage:'tr-TR',isAccessibleForFree:true,description:siteDescription,featureList:['Konuma göre nöbetçi eczane arama','İl ve ilçe seçimi','Harita ve yol tarifi','Eczaneye telefonla ulaşma']}
]};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr"><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/>{children}</body></html>}
