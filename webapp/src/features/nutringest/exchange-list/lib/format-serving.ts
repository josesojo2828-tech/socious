/**
 * T7 / S3, S4 — one helper for the scaled practical measure.
 *
 * Used by the add-food modal, the edit modal and the exchange-list table so the
 * measure is rendered the same way everywhere.
 *
 * Two facts about the source data drive the design:
 *  - `unity` is free text written by hand ("1 taza", "½ taza", "1 rebanada")
 *    and sometimes a placeholder ("", "0", "UNITY"), so only its leading amount
 *    is safe to scale;
 *  - `grams` arrives as a number from the exchange-food endpoint but as a
 *    string from the exchange-list detail, because Prisma serialises Decimal
 *    as a string.
 */
export interface ServingMeasure {
    /** Etiqueta ya escalada: para mostrar y para guardar en `servingLabel`. */
    label: string;
    /** Gramos o cc escalados. `null` cuando la fuente no define medida. */
    grams: number | null;
}

/** Valores con los que el fixture marca "sin medida práctica". */
const PLACEHOLDER_UNITY = new Set(['', '0', 'unity', 'unidad']);

/** Un recipiente de volumen: su cifra de la tabla de intercambio se lee en cc. */
const VOLUME_UNITY = /taza|vaso|tazón|\bcc\b|\bml\b/i;

/** Glifos Unicode que la fuente usa en lugar de cifras. */
const GLYPH_FRACTIONS: Record<string, number> = {
    '¼': 0.25,
    '½': 0.5,
    '¾': 0.75,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
};

/**
 * Monta el import inicial de la medida: entero, decimal, fracción "1/2" o
 * glifo "½". Captura el resto sin consumir espacios para que la unidad conserve
 * su separación original.
 */
const LEADING_AMOUNT = /^(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(.*)$/;

const parseLeadingAmount = (raw: string): { value: number; rest: string } | null => {
    const match = LEADING_AMOUNT.exec(raw);
    if (!match) return null;

    const [, token, rest] = match;
    if (token in GLYPH_FRACTIONS) return { value: GLYPH_FRACTIONS[token], rest };

    if (token.includes('/')) {
        const [numerator, denominator] = token.split('/').map((part) => Number(part.trim()));
        if (!denominator) return null;
        return { value: numerator / denominator, rest };
    }

    const value = Number(token);
    return Number.isFinite(value) ? { value, rest } : null;
};

/** Entero sin decimales fantasma; el resto se redondea a dos decimales. */
const formatAmount = (value: number): string =>
    Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));

const toGrams = (raw: number | string | null | undefined): number | null => {
    if (raw === null || raw === undefined || raw === '') return null;
    const value = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(value) ? value : null;
};

/**
 * Escala la medida práctica y los gramos/cc por la cantidad de raciones.
 *
 * - A una ración la medida se devuelve tal cual la trae la fuente, para no
 *   reformatear texto que ya era correcto.
 * - La medida placeholder se descarta en vez de renderizarse.
 * - Sin gramos en la fuente no se inventa ninguno (S4).
 */
export function formatServing(
    unity: string | number | null | undefined,
    grams: number | string | null | undefined,
    raciones: number,
): ServingMeasure {
    const servings = Number.isFinite(raciones) && raciones > 0 ? raciones : 1;
    const rawUnity = unity === null || unity === undefined ? '' : String(unity).trim();

    let measure = '';
    if (!PLACEHOLDER_UNITY.has(rawUnity.toLowerCase())) {
        if (servings === 1) {
            measure = rawUnity;
        } else {
            const parsed = parseLeadingAmount(rawUnity);
            measure = parsed ? `${formatAmount(parsed.value * servings)}${parsed.rest}` : rawUnity;
        }
    }

    const source = toGrams(grams);
    const scaled = source === null ? null : Math.round(source * servings);
    const unit = VOLUME_UNITY.test(rawUnity) ? 'cc' : 'g';

    const parts = [measure, scaled === null ? null : `${scaled} ${unit}`].filter(
        (part): part is string => Boolean(part),
    );

    return { label: parts.join(' · '), grams: scaled };
}
