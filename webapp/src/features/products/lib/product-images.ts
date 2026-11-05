/**
 * Catalog image helpers (S8): upload to MinIO through /api/file/upload and
 * render the stored key through the public route.
 *
 * The upload response also carries a `url`, but that is an INTERNAL minio
 * host — never persisted or echoed. The public path is `/api/file/public/<key>`
 * and must be built against the API origin: a bare relative path would hit the
 * frontend host (Vercel) instead of the backend.
 */

import { apiBaseUrl } from "@/constants";

/** Storage prefix of catalog images (product shots, also for variants). */
export const CATALOG_UPLOAD_PREFIX = "product";

/** Public <img> src for a stored MinIO key. */
export function publicFileUrl(key: string): string {
  return `${apiBaseUrl()}/api/file/public/${key.trim()}`;
}

/** Multipart body for POST /api/file/upload: the file + its storage prefix. */
export function buildImageUploadForm(file: File): FormData {
  const form = new FormData();
  form.append("file", file);
  form.append("prefix", CATALOG_UPLOAD_PREFIX);
  return form;
}

/** At (or above) the plan limit no slot is left to fill. */
export function canUploadImage(count: number, limit: number): boolean {
  return count < limit;
}
