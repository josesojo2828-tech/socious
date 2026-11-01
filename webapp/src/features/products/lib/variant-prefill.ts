import { toForm, type ProductForm } from "./product-form";
import type { Product } from "../types/product.type";

/**
 * Variant copy (S7): a variant IS a new product prefilled from the source so
 * the merchant only changes what makes it different (color, identity, stock).
 *
 * Deliberate differences from the source:
 * - `name`  → "<nombre> (variante)" as a starting hint, editable.
 * - `sku`   → "<sku>-V" here; the nuevo route upgrades it with
 *   `suggestFreeSku` against the tenant's existing SKUs so the suggestion is
 *   actually free (no 409 dance).
 * - `barcode` → cleared: every EAN-13 identifies one article, so the variant
 *   needs its own (the "Generar" button is right there in the form).
 * - `stock` → 0: the create form owns the opening stock of the new product.
 * - `isPublic` → false: publishing stays an explicit act from the list toggle
 *   (PATCH isPublic=true without CATALOG_ONLINE answers 403).
 */
export function variantPrefillFromProduct(product: Product): ProductForm {
  return {
    ...toForm(product),
    name: `${product.name} (variante)`,
    sku: `${product.sku}-V`,
    barcode: "",
    stock: 0,
    isPublic: false,
    // Una variante es un sub-producto con stock propio: jamás servicio.
    isService: false,
    variantOfId: product.id,
  };
}

/**
 * First free candidate for a variant SKU: `<base>-V`, then `-V2`, `-V3`…
 * compared case-insensitively against the tenant's SKUs. Falls back to a
 * short random suffix if somehow everything up to 999 is taken.
 */
export function suggestFreeSku(
  base: string,
  taken: readonly string[],
): string {
  const takenSet = new Set(taken.map((sku) => sku.trim().toUpperCase()));
  const prefix = `${base}-V`;
  if (!takenSet.has(prefix.toUpperCase())) return prefix;
  for (let n = 2; n <= 999; n += 1) {
    const candidate = `${prefix}${n}`;
    if (!takenSet.has(candidate.toUpperCase())) return candidate;
  }
  return `${prefix}${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
