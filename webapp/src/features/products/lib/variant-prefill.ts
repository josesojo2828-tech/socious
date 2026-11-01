import { toForm, type ProductForm } from "./product-form";
import type { Product } from "../types/product.type";

/**
 * Variant copy (S7): a variant IS a new product prefilled from the source so
 * the merchant only changes what makes it different (color, identity, stock).
 *
 * Deliberate differences from the source:
 * - `name`  → "<nombre> (variante)" as a starting hint, editable.
 * - `sku`   → "<sku>-V": a free-looking suggestion, because reusing the exact
 *   SKU would collide (409) — the merchant must adjust it if it is taken.
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
  };
}
