/**
 * Offer banner upload (S9): multipart to /api/file/upload with the `offer`
 * storage prefix, then render through the public route. The upload response
 * also carries a `url`, but that is an INTERNAL minio host — only the `key`
 * is persisted on the offer.
 */

/** Storage prefix of offer banners (allowlisted server-side). */
export const OFFER_UPLOAD_PREFIX = "offer";

/** Multipart body for POST /api/file/upload: the file + its storage prefix. */
export function buildOfferBannerForm(file: File): FormData {
  const form = new FormData();
  form.append("file", file);
  form.append("prefix", OFFER_UPLOAD_PREFIX);
  return form;
}

/** Public `<img>` src for a stored MinIO key. */
export function offerBannerSrc(key: string): string {
  return `/api/file/public/${key.trim()}`;
}
