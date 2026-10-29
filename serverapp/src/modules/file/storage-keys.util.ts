/**
 * Prefijos de claves de MinIO que son assets NO clínicos y pueden servirse
 * públicamente (portafolios, avatares, fotos de menú). Todo lo demás
 * (campus_* = documentos de identidad, o claves arbitrarias) es sensible:
 * solo se expone vía URL firmada (getSignedUrl) a usuarios autorizados.
 */
export const PUBLIC_ASSET_PREFIXES = [
  "portfolio_",
  "profile_",
  "menu_",
] as const;

export function isPublicAssetKey(key: string): boolean {
  return PUBLIC_ASSET_PREFIXES.some((prefix) => key.startsWith(prefix));
}
