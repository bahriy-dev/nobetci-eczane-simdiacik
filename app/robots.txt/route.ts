import {siteOrigin} from '@/lib/site-config';
export function GET(){return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteOrigin}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain; charset=utf-8'}});}
