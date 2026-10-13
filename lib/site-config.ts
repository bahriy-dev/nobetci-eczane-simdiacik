// Keep metadata, sitemap and structured data on the single canonical host.
// Do not let preview or Railway environment variables change public URLs.
export const siteOrigin='https://simdiacik.com';
export const siteDescription='Yakınındaki nöbetçi eczaneleri güncel nöbet listelerinde bul. Konumunu kullan veya il ve ilçe seç; haritada görüntüle, telefonla ara ve yol tarifi al.';
export const siteIndexable=process.env.SEO_INDEXABLE!=='false';
