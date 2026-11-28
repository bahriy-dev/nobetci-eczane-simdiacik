/** Railway uses Next.js; the retained Sites preview uses vite.config.ts. */
const customTileOrigin = process.env.NEXT_PUBLIC_MAP_TILE_URL
  ? new URL(process.env.NEXT_PUBLIC_MAP_TILE_URL).origin
  : "";
// React needs eval() only for development callstacks; production never gets it.
const devEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";
// DevControl usage analytics: its script and collector are allowed only when a site key is configured.
const devControl = process.env.NEXT_PUBLIC_DEVCONTROL_KEY
  ? " " + new URL(process.env.NEXT_PUBLIC_DEVCONTROL_ORIGIN || "https://devcontrol.up.railway.app").origin
  : "";
// Google tags (GTM, GA4) follow Google's documented CSP host list; ads hosts stay out (ads consent is denied).
const nextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.simdiacik.com" }],
        destination: "https://simdiacik.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(), microphone=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'${devEval} https://*.googletagmanager.com${devControl}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org ${customTileOrigin}; connect-src 'self' https://api.turkiyeapi.dev https://nominatim.openstreetmap.org https://*.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com${devControl}; font-src 'self' data:; frame-src https://www.googletagmanager.com https://ordu.eczanesistemi.net; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`,
          },
        ],
      },
    ];
  },
};
export default nextConfig;
