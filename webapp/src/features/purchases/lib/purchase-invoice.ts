/**
 * Invoice attachment helpers (S14 #5): the optional photo/PDF of the
 * supplier's invoice on /dashboard/compras/nuevo.
 *
 * The upload goes to POST /api/file/upload with the PRIVATE `purchase`
 * prefix — `purchase_` keys are never on the public asset allowlist, so the
 * ficha reads them through GET /api/purchases/:id/invoice (signed URL).
 */

/** Storage prefix of purchase invoices (private bucket keys). */
export const INVOICE_UPLOAD_PREFIX = "purchase";

/** Client-side gate before the multipart request (the server re-checks). */
export const INVOICE_MAX_BYTES = 5 * 1024 * 1024;

/** What the hidden file input accepts. */
export const INVOICE_ACCEPT = "image/*,application/pdf";

function isAllowedInvoiceType(type: string): boolean {
  return type.startsWith("image/") || type === "application/pdf";
}

/** Spanish reason the file was rejected, or null when it may be uploaded. */
export function invoiceFileError(file: {
  type?: string;
  size?: number;
}): string | null {
  if (!file.type || !isAllowedInvoiceType(file.type)) {
    return "Formato no permitido: subí una imagen o un PDF.";
  }
  if (typeof file.size === "number" && file.size > INVOICE_MAX_BYTES) {
    return "El archivo excede el máximo de 5MB.";
  }
  return null;
}

/** Multipart body for POST /api/file/upload: the file + `purchase` prefix. */
export function buildInvoiceUploadForm(file: File): FormData {
  const form = new FormData();
  form.append("file", file);
  form.append("prefix", INVOICE_UPLOAD_PREFIX);
  return form;
}

/**
 * Image extensions the ficha can render inline; anything else (PDF and
 * unknown keys) opens as a link in a new tab.
 */
export function isImageInvoiceKey(key: string): boolean {
  return /\.(png|jpe?g|webp)$/i.test(key.trim());
}

/** Chip label: the original file name, falling back to the storage key. */
export function invoiceDisplayName(
  key: string,
  fileName?: string | null,
): string {
  return fileName?.trim() || key;
}
