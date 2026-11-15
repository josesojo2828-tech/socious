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
  /** Unidad de la medida ("g", "cm" o un texto propio). */
  measureUnit?: string | null;
  /** Catalog size (null = sin talla o talla personalizada). */
  sizeId?: string | null;
  /** Label saved with the type: catalog label or the custom text. */
  sizeLabel?: string | null;
  unit: string;
  /** Own price; null = hereda el precio del producto. */
  salePriceUSD?: string | number | null;
  /** Own cost; null = hereda el costo del producto. */
  costPriceUSD?: string | number | null;
  stock: string | number;
  minStock: string | number;
  active: boolean;
  /** Variant image slots (S8), ordered by position. */
  images?: ProductImage[];
}
