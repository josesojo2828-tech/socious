export type ProductStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "OUT_OF_STOCK"
  | "ON_SALE";

export interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
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
  organizationId?: string | null;
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
  parentId?: string | null;
  isSystem: boolean;
  subCategories?: Category[];
}
