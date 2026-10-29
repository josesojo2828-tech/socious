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
