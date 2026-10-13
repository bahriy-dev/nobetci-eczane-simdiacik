import {siteOrigin} from '@/lib/site-config';
import {cityGuides} from '@/lib/city-guides';
const paths=['/','/nobetci-eczane-rehberi',...cityGuides.map(city=>`/nobetci-eczane/${city.slug}`),'/gizlilik','/cerez-politikasi','/kullanim-kosullari','/kvkk','/iletisim'];
export function GET(){const entries=paths.map(path=>`  <url>\n    <loc>${siteOrigin}${path}</loc>\n  </url>`).join('\n');return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});}
