export type ProductStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "OUT_OF_STOCK"
  | "ON_SALE";

/** One stored catalog image (S8): the MinIO key renders through the public route. */
export interface ProductImage {
  id: string;
  key: string;
  position: number;
}

/** Imagen guardada en MinIO (clave servida por /api/file/public/<key>). */
export interface ProductImageRef {
  id: string;
  key: string;
  position: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  /** Hex `#rrggbb` or a short color name (S6); null = sin color. */
  color?: string | null;
  description?: string | null;
  /** Decimal columns arrive as strings. */
  costPriceUSD: string | number;
  salePriceUSD: string | number;
  wholesalePriceUSD?: string | number | null;
  stock: string | number;
  minStock: string | number;
  unit: string;
  taxRate: string | number;
  isService: boolean;
  isPublic: boolean;
  status: ProductStatus;
  imageUrl?: string | null;
  categoryId?: string | null;
  supplierId?: string | null;
  /** Padre cuando este producto es una variante/copia (round 5, #3). */
  variantOfId?: string | null;
  /** Sub-productos devueltos por el detalle (round 5, #3). */
  variants?: {
    id: string;
    name: string;
    sku: string;
    stock: string | number;
    unit: string;
    isService: boolean;
    images: { key: string }[];
  }[];
  organizationId?: string | null;
  /** Detail route only (S8); ordered by `position`. */
  images?: ProductImage[];
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "SALE" | "PURCHASE" | "RETURN";
  quantity: string | number;
  previousStock: string | number;
  newStock: string | number;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  parentId?: string | null;
  isSystem: boolean;
  subCategories?: Category[];
}
