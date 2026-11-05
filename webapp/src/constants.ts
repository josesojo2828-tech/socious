export const HOST = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Strips the trailing `/api` from a configured base.
 *
 * Endpoints already include the prefix (`/api/products`), so a base like
 * `https://backend.example.com/api` must collapse to the origin or requests
 * would hit `/api/api/...`. A relative base (`/api`) collapses to `''`, which
 * keeps the URLs relative — the Docker/nginx topology.
 */
export function normalizeApiBase(raw: string | undefined | null): string {
  const base = (raw ?? '').trim();
  if (base.endsWith('/api/')) return base.slice(0, -5);
  if (base.endsWith('/api')) return base.slice(0, -4);
  return base.replace(/\/$/, '');
}

/** API origin used by the browser (absolute on Vercel, relative behind nginx). */
export function apiBaseUrl(): string {
  return normalizeApiBase(HOST);
}
