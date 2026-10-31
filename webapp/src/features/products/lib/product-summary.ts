import type { Product } from "../types/product.type";
import { isLowStock } from "./product-form";

/** Real aggregates of the fetched catalog for the list summary strip. */
export interface ProductSummary {
  total: number;
  active: number;
  lowStock: number;
}

/** Summary strip numbers computed from the fetched list, never from the filter. */
export function summarizeProducts(products: Product[]): ProductSummary {
  let active = 0;
  let lowStock = 0;

  for (const product of products) {
    if (product.status === "ACTIVE") active += 1;
    if (isLowStock(product)) lowStock += 1;
  }

  return { total: products.length, active, lowStock };
}
