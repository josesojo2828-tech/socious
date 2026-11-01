import type { Product } from "../types/product.type";

/**
 * Presentation form state (S2): the merchant opens "Nueva presentación" from
 * the product ficha with the identity fields already filled from the product,
 * and only varies color, measures and the opening stock.
 */
export interface PresentationDraft {
  name: string;
  sku: string;
  barcode: string;
  unit: string;
  color: string;
  measures: string;
  stock: string;
  /** "" = hereda el precio del producto (no own price). */
  salePrice: string;
}

/** Blank draft for the standalone (no product) usage of the card. */
export const EMPTY_PRESENTATION_DRAFT: PresentationDraft = {
  name: "",
  sku: "",
  barcode: "",
  unit: "",
  color: "",
  measures: "",
  stock: "0",
  salePrice: "",
};

/**
 * Prefill copied from the product: identity stays, color/measures start empty
 * (the fields they change), and the barcode stays empty because the merchant
 * decides whether the presentation gets its own code. The sale price also
 * starts empty: inheriting the product price is the default behavior.
 */
export function presentationPrefillFromProduct(
  product: Product,
): PresentationDraft {
  return {
    name: product.name,
    sku: product.sku,
    barcode: "",
    unit: product.unit,
    color: "",
    measures: "",
    stock: "0",
    salePrice: "",
  };
}
