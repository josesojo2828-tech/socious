import * as path from "path";

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/**
 * Deriva una extensión segura a partir del MIME type ya validado.
 * Nunca confía en la extensión provista por el usuario.
 */
export function safeExtensionFromMime(
  mimetype: string,
  originalName?: string,
): string {
  if (mimetype && MIME_TO_EXTENSION[mimetype]) {
    return MIME_TO_EXTENSION[mimetype];
  }
  const fromName = originalName
    ? path.extname(originalName).replace(".", "").toLowerCase()
    : "";
  const cleaned = fromName.replace(/[^a-z0-9]/g, "").slice(0, 10);
  return cleaned || "bin";
}

/**
 * Sanitiza un nombre de archivo para prevenir path traversal
 * (elimina separadores de ruta y caracteres peligrosos).
 */
export function sanitizeFilename(name: string): string {
  return path
    .basename(name)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
}
