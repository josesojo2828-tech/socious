/**
 * Utilidades para sanitizar y normalizar recomendaciones nutricionales a texto plano en el backend.
 */

/**
 * Convierte cualquier texto de recomendaciones (que pueda contener comentarios HTML,
 * tags HTML como <p>, <br>, <ul>, <li> o entidades HTML) a texto plano limpio y legible.
 */
export function cleanRecommendationsToPlainText(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";

  // 1. Remover comentarios HTML
  let text = raw.replace(/<!--[\s\S]*?-->/gi, "");

  // 2. Convertir saltos de línea y bloques HTML comunes
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|div|tr|h[1-6])>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "• ");
  text = text.replace(/<\/li>/gi, "\n");

  // 3. Remover cualquier otro tag HTML restante
  text = text.replace(/<[^>]+>/g, "");

  // 4. Decodificar entidades HTML comunes
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&bull;/gi, "•");

  // 5. Normalizar saltos de línea y espacios
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/**
 * Sanitiza recomendaciones antes de guardarlas en base de datos.
 * Limpia cualquier markup o tag HTML sucio a texto plano, preservando
 * el bloque de metadata <!--NUTRINGEST_DISTRIBUTION:...--> si existía.
 */
export function sanitizeRecommendationsForStorage(raw?: string | null): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return String(raw);

  const metaMatch = raw.match(/<!--NUTRINGEST_DISTRIBUTION:[\s\S]*?-->/);
  const metaComment = metaMatch ? metaMatch[0] : "";

  const cleanText = cleanRecommendationsToPlainText(raw);

  if (!cleanText && !metaComment) return null;
  if (cleanText && metaComment) return `${cleanText}\n${metaComment}`;
  if (cleanText) return cleanText;
  return metaComment;
}
