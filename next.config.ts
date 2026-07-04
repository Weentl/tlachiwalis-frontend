import type { NextConfig } from "next";

// Host de Supabase DERIVADO del env (portable: Cloud, self-hosted o prod sin tocar código).
const supaUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:8000");
const SUPABASE = supaUrl.origin;
const SUPABASE_WS = `${supaUrl.protocol === "https:" ? "wss" : "ws"}://${supaUrl.host}`;

// Dominios de Stripe: el onboarding EMBEBIDO (Connect) carga connect.js y renderiza iframes de
// Stripe → sin esto la CSP los bloquea EN PRODUCCIÓN (en dev la CSP está apagada).
const STRIPE = "https://*.stripe.com https://*.stripecdn.com";

// CSP permisiva con 'unsafe-inline' (Next inyecta scripts/estilos inline sin
// nonce). Bloquea recursos externos, embebido en iframes y plugins.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src 'self' data: blob: ${SUPABASE} ${STRIPE}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  `connect-src 'self' ${SUPABASE} ${SUPABASE_WS} ${STRIPE}`,
  `frame-src 'self' ${STRIPE}`,
  `script-src 'self' 'unsafe-inline' ${STRIPE}`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Honrada solo sobre HTTPS; inofensiva sobre HTTP.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // sharp es un binario nativo (libvips): Turbopack NO debe bundlearlo o el
  // build falla. Debe cargarse desde node_modules en runtime Node (no Edge).
  serverExternalPackages: ["sharp", "heic-convert"],
  experimental: {
    serverActions: {
      // Galería multi-imagen: hasta 9 fotos de iPhone (~3 MB c/u) exceden por
      // mucho el límite por defecto de 1 MB del body de un Server Action; sin
      // esto la subida rebota en el borde ANTES de llegar al pipeline.
      bodySizeLimit: "30mb",
    },
  },
  images: {
    // Imágenes del bucket público de Supabase Storage (host derivado del env).
    remotePatterns: [
      {
        protocol: supaUrl.protocol.replace(":", "") as "http" | "https",
        hostname: supaUrl.hostname,
        port: supaUrl.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async rewrites() {
    // Sirve las imágenes del Storage PÚBLICO SAME-ORIGIN: las URLs relativas
    // `/storage/v1/object/public/...` se proxyean a Supabase. Así el navegador no depende de
    // alcanzar el host de Supabase directo, y las URLs en BD quedan host-portables (cambiar de
    // host = solo cambiar NEXT_PUBLIC_SUPABASE_URL).
    return [
      {
        source: "/storage/v1/object/public/:path*",
        destination: `${SUPABASE}/storage/v1/object/public/:path*`,
      },
    ];
  },
  async headers() {
    // CRÍTICO: en dev NO se aplica ninguna cabecera (Turbopack rompe con `nosniff`
    // y CSP). Solo se activan en producción (next build / next start).
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
