import {siteOrigin} from '@/lib/site-config';
const paths=['/','/nobetci-eczane-rehberi','/gizlilik','/cerez-politikasi','/kullanim-kosullari','/iletisim'];
export function GET(){const entries=paths.map(path=>`  <url>\n    <loc>${siteOrigin}${path}</loc>\n  </url>`).join('\n');return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});}
