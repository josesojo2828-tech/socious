import type { ProductImage } from "./product.type";

/** A product presentation (variant with its own stock and price). */
export interface ProductPresentation {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  color: string | null;
  measures: string | null;
  unit: string;
  /** Own price; null = hereda el precio del producto. */
  salePriceUSD?: string | number | null;
  stock: string | number;
  minStock: string | number;
  active: boolean;
  /** Variant image slots (S8), ordered by position. */
  images?: ProductImage[];
}
