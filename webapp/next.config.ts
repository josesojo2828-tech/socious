import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // output standalone solo para self-hosting (Docker).
  // En Vercel NO debe activarse: su pipeline de deploy rompe el file tracing
  // de Turbopack (Next 16) cuando detecta output: standalone → ENOENT en .nft.json
  output: process.env.STANDALONE_OUTPUT === 'true' ? 'standalone' : undefined,
  typescript: {
    // Type-check during build. The webapp typecheck is now clean
    // (`npm run typecheck` / `tsc --noEmit`), so we gate the build on types
    // instead of silently shipping type errors.
    ignoreBuildErrors: false,
  },
  experimental: {
    // Limita los hilos de CPU para compilación y evitar colgar el sistema
    cpus: 1
  },
  /**
   * Con una URL de API RELATIVA (Docker: NEXT_PUBLIC_API_URL=/api) cada llamada
   * /api/* caería en el servidor de Next, que solo conoce sus route handlers.
   * Este rewrite las proxia al backend para que el front funcione detrás de
   * CUALQUIER entrada (nginx :8088 o el puerto del frontend directo).
   * En desarrollo local la API es absoluta (http://localhost:3005), no entra en
   * este camino. Los route handlers propios (/api/report-error) ganan sobre el
   * rewrite: Next evalúa el filesystem antes.
   */
  async rewrites() {
    const target = process.env.INTERNAL_API_URL;
    if (!target) return [];
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
  /**
   * Mientras el producto está en rollout privado, `/` manda directo al login y
   * la landing no se renderiza (ni su JS se envía). Pasar `permanent` a `true`
   * cuando la landing quede retirada definitivamente.
   */
  async redirects() {
    return [{ source: "/", destination: "/login", permanent: false }];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.instagram.com',
      },
    ],
  },
};

export default nextConfig;
