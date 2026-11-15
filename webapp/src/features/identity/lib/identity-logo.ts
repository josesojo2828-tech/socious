/**
 * Logo upload helpers for the tenant identity screen.
 *
 * Mirrors `features/products/lib/product-images.ts`: the file travels in a
 * multipart body to `POST /api/file/upload` with the `identity` prefix, and
 * only the returned storage key is used to build the persisted public path.
 *
 * The mime/size guards duplicate the backend rules (PNG/JPG/JPEG/WEBP, 5 MB)
 * so a bad file is rejected before it leaves the browser.
 */

import { apiBaseUrl } from "@/constants";

/** Storage prefix allowlisted by `FileController` for tenant logos. */
export const IDENTITY_UPLOAD_PREFIX = "identity";

/** Same ceiling as the backend (`MAX_SIZE` in `file.controller.ts`). */
export const IDENTITY_LOGO_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_LOGO_MIME = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;

/** Multipart body for POST /api/file/upload: the file + `identity` prefix. */
export function buildIdentityLogoForm(file: File): FormData {
  const form = new FormData();
  form.append("file", file);
  form.append("prefix", IDENTITY_UPLOAD_PREFIX);
  return form;
}

/** Returns a user-facing error for an invalid logo, or `null` when it passes. */
export function validateIdentityLogo(file: File): string | null {
  if (
    !ALLOWED_LOGO_MIME.includes(
      file.type as (typeof ALLOWED_LOGO_MIME)[number],
    )
  ) {
    return "El logo debe ser una imagen PNG, JPG o WEBP.";
  }
  if (file.size > IDENTITY_LOGO_MAX_BYTES) {
    return "El logo no puede superar los 5 MB.";
  }
  return null;
}

/**
 * Root-relative public path persisted as `logoUrl`; the backend accepts a
 * path that starts with `/` and the webapp rewrites `/api/*` to the API.
 */
export function identityLogoPublicPath(key: string): string {
  return `/api/file/public/${key.trim()}`;
}

/** Resolves a stored `logoUrl` (URL, public path or legacy bare key) to a src. */
export function resolveIdentityLogoSrc(logoUrl: string | null): string | null {
  const value = logoUrl?.trim();
  if (!value) return null;
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  ) {
    return value;
  }
  return `${apiBaseUrl()}/api/file/public/${value}`;
}
