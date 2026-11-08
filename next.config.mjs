/** Railway uses Next.js; the retained Sites preview uses vite.config.ts. */
const customTileOrigin = process.env.NEXT_PUBLIC_MAP_TILE_URL
  ? new URL(process.env.NEXT_PUBLIC_MAP_TILE_URL).origin
  : "";
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
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org ${customTileOrigin}; connect-src 'self' https://api.turkiyeapi.dev https://nominatim.openstreetmap.org https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com; font-src 'self' data:; frame-src https://www.googletagmanager.com https://ordu.eczanesistemi.net; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`,
          },
        ],
      },
    ];
  },
};
export default nextConfig;
