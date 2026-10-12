/** Railway uses Next.js; the retained Sites preview uses vite.config.ts. */
const nextConfig={
 poweredByHeader:false,
 async headers(){return [{source:'/:path*',headers:[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'geolocation=(self), camera=(), microphone=()'},
  {key:'Strict-Transport-Security',value:'max-age=31536000'},
  {key:'Content-Security-Policy',value:"frame-ancestors 'none'; object-src 'none'; base-uri 'self'"}
 ]}];}
};
export default nextConfig;
