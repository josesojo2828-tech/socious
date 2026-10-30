import type { Product } from "../types/product.type";

/**
 * Pure inventory logic (S7): form payloads and stock arithmetic, mirroring the
 * backend rules so the UI can warn before the API refuses.
 *
 * The product PATCH body must NOT carry `stock` (the backend rejects unknown
 * fields), which is why the payload is mode-aware.
 */

export interface ProductForm {
  sku: string;
  name: string;
  barcode?: string;
  description?: string;
  costPriceUSD: number;
  salePriceUSD: number;
  wholesalePriceUSD?: number;
  stock?: number;
  minStock?: number;
  unit?: string;
  taxRate?: number;
  isService: boolean;
  isPublic: boolean;
  status: string;
  imageUrl?: string;
  categoryId?: string;
  supplierId?: string;
}

const trim = (value: string | undefined): string | undefined => {
  const value_ = value?.trim();
  return value_ ? value_ : undefined;
};

/** Create sends the opening stock; update must not send `stock` at all. */
export function buildProductPayload(
  form: ProductForm,
  mode: "create" | "update",
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    sku: form.sku.trim(),
    name: form.name.trim(),
    barcode: trim(form.barcode) ?? null,
    description: trim(form.description) ?? null,
    costPriceUSD: Number(form.costPriceUSD) || 0,
    salePriceUSD: Number(form.salePriceUSD) || 0,
    wholesalePriceUSD:
      form.wholesalePriceUSD === undefined || form.wholesalePriceUSD === null
        ? null
        : Number(form.wholesalePriceUSD),
    minStock: Number(form.minStock) || 0,
    unit: trim(form.unit) ?? "UND",
    taxRate: Number(form.taxRate) || 0,
    isService: form.isService,
    isPublic: form.isPublic,
    status: form.status,
    imageUrl: trim(form.imageUrl) ?? null,
    categoryId: trim(form.categoryId) ?? null,
    supplierId: trim(form.supplierId) ?? null,
  };

  if (mode === "create") {
    payload.stock = form.isService ? 0 : Number(form.stock) || 0;
  }

  return payload;
}

/** Below (or at) the minimum, and only tracked products count. */
export function isLowStock(product: Product): boolean {
  if (product.isService) return false;
  return Number(product.stock) <= Number(product.minStock);
}

export type StockAdjustType = "IN" | "OUT" | "ADJUSTMENT";

export interface StockInput {
  type: StockAdjustType;
  quantity: number;
  newStock?: number;
  reference?: string;
  notes?: string;
}

/**
 * The stock the backend would end up with, or `null` when the movement is not
 * allowed (an OUT bigger than the stock — the API refuses it with a 400).
 */
export function stockAfter(
  current: number,
  input: StockInput,
): number | null {
  const safeCurrent = Number.isFinite(current) ? current : 0;

  if (input.type === "ADJUSTMENT") {
    const target = Number(input.newStock);
    if (!Number.isFinite(target) || target < 0) return null;
    return Math.round(target * 100) / 100;
  }

  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  const next =
    input.type === "IN"
      ? safeCurrent + quantity
      : safeCurrent - quantity;

  if (next < -1e-9) return null;
  return Math.round(Math.max(0, next) * 100) / 100;
}

/** Body for POST /api/products/:id/stock (mirrors AdjustStockDto). */
export function buildStockPayload(input: StockInput) {
  return {
    type: input.type,
    quantity: input.quantity,
    ...(input.type === "ADJUSTMENT" && input.newStock !== undefined
      ? { newStock: input.newStock }
      : {}),
    ...(input.reference?.trim() ? { reference: input.reference.trim() } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  };
}
