// Keep metadata, sitemap and structured data on the single canonical host.
// Do not let preview or Railway environment variables change public URLs.
export const siteOrigin='https://simdiacik.com';
export const siteDescription='Yakınındaki nöbetçi eczaneleri güncel nöbet listelerinde bul. Konumunu kullan veya il ve ilçe seç; haritada görüntüle, telefonla ara ve yol tarifi al.';
export const siteIndexable=process.env.SEO_INDEXABLE!=='false';
// Pages that set their own openGraph replace the root one, so each repeats the share image.
export const ogImage={url:'/og-image.png',width:1200,height:630,alt:'Şimdi Açık — Yakınındaki nöbetçi eczaneler'};
