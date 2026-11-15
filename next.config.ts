import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// El navegador solo habla con este mismo sitio: el clima y la geocodificación
// pasan por /api/*, así que connect-src no necesita orígenes de afuera.
// Sin nonce, porque la página es estática: Next mete scripts inline (el
// payload de RSC) y un nonce obligaría a renderizar cada visita en el server.
// 'unsafe-eval' solo en dev, para los stacks de error de React.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:", // data: para el favicon con emoji
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const CANONICAL_HOST = "cuelgolaropa.ar";
const VERCEL_HOST = "cuelgolaropa-maleneadas.vercel.app";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },

  async redirects() {
    return [
      {
        // Redirect the Vercel preview URL to the canonical domain so it
        // doesn't act as a live bypass for HSTS, SEO canonicals, and any
        // other domain-scoped security policy.
        source: "/:path*",
        has: [{ type: "host", value: VERCEL_HOST }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
