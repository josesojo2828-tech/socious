/**
 * Utilidades para sanitizar y formatear recomendaciones nutricionales.
 * Garantiza que siempre se visualice y almacene texto plano limpio,
 * eliminando etiquetas HTML, entidades HTML y comentarios de metadatos.
 */

/**
 * Convierte cualquier texto de recomendaciones (que pueda contener comentarios HTML,
 * tags HTML como <p>, <br>, <ul>, <li> o entidades HTML) a texto plano limpio y legible.
 */
export function cleanRecommendationsToPlainText(raw?: string | null): string {
    if (!raw || typeof raw !== 'string') return '';

    // 1. Remover comentarios HTML (incluyendo metadatos serializados como <!--NUTRINGEST_DISTRIBUTION:...-->)
    let text = raw.replace(/<!--[\s\S]*?-->/gi, '');

    // 2. Convertir saltos de línea y bloques HTML comunes
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/(p|div|tr|h[1-6])>/gi, '\n');
    text = text.replace(/<li[^>]*>/gi, '• ');
    text = text.replace(/<\/li>/gi, '\n');

    // 3. Remover cualquier otro tag HTML restante (<p>, <div>, <span>, <b>, <strong>, etc.)
    text = text.replace(/<[^>]+>/g, '');

    // 4. Decodificar entidades HTML comunes
    text = text
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&bull;/gi, '•');

    // 5. Normalizar saltos de línea y espacios
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Eliminar espacios al final de cada línea
    text = text.split('\n').map(line => line.trimEnd()).join('\n');
    // Reducir más de dos saltos de línea seguidos a dos
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
}

/**
 * Extrae los metadatos de distribución embebidos en el texto de recomendaciones si existen.
 */
export function extractDistributionMetadata<T = unknown>(raw?: string | null): T | null {
    if (!raw || typeof raw !== 'string') return null;
    const match = raw.match(/<!--NUTRINGEST_DISTRIBUTION:([\s\S]*?)-->/);
    if (!match || !match[1]) return null;
    try {
        return JSON.parse(match[1]);
    } catch (e) {
        console.error("Error parseando metadata de distribución:", e);
        return null;
    }
}

/**
 * Adjunta metadatos de distribución serializados en formato de comentario HTML a un texto plano.
 * Si el texto o metadatos no son válidos, maneja el caso de forma segura.
 */
export function attachDistributionMetadata(plainText: string, metadata: unknown): string {
    const clean = cleanRecommendationsToPlainText(plainText);
    if (!metadata) return clean;
    const serialized = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    if (!serialized || serialized === '{}') return clean;
    return clean ? `${clean}\n<!--NUTRINGEST_DISTRIBUTION:${serialized}-->` : `<!--NUTRINGEST_DISTRIBUTION:${serialized}-->`;
}
