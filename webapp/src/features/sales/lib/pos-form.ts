import type {
  CreateSalePayload,
  SaleItemInput,
  SalePaymentInput,
} from "../types/sale.type";

/**
 * Pure POS logic (S6): cart math and the payload the backend expects.
 * Kept out of the component so vitest (node env, no DOM) covers it.
 */

export interface CartLine {
  productId: string;
  productName: string;
  /** Unit price WITHOUT tax, exactly like the product card shows. */
  unitPriceUSD: number;
  /** Percentage (2 means 2%), mirroring `Product.taxRate`. */
  taxRate: number;
  quantity: number;
}

export interface ProductPicker {
  id: string;
  name: string;
  salePriceUSD: string | number;
  taxRate: string | number;
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const toNumber = (value: string | number | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Adds a product; repeating it increments the existing line (never dups). */
export function addToCart(
  cart: CartLine[],
  product: ProductPicker,
  quantity = 1,
): CartLine[] {
  const safeQuantity = Math.max(1, Math.trunc(quantity) || 1);
  const line: CartLine = {
    productId: product.id,
    productName: product.name,
    unitPriceUSD: toNumber(product.salePriceUSD),
    taxRate: toNumber(product.taxRate),
    quantity: safeQuantity,
  };

  const existing = cart.find((item) => item.productId === line.productId);
  if (!existing) return [...cart, line];

  return cart.map((item) =>
    item.productId === line.productId
      ? { ...item, quantity: item.quantity + safeQuantity }
      : item,
  );
}

/** Zero or a negative quantity removes the line. */
export function changeQuantity(
  cart: CartLine[],
  productId: string,
  quantity: number,
): CartLine[] {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return cart.filter((item) => item.productId !== productId);
  }

  return cart.map((item) =>
    item.productId === productId
      ? { ...item, quantity: Math.trunc(quantity) }
      : item,
  );
}

export function removeFromCart(cart: CartLine[], productId: string): CartLine[] {
  return cart.filter((item) => item.productId !== productId);
}

export function lineTotal(line: CartLine): number {
  const gross = line.quantity * line.unitPriceUSD;
  const tax = (gross * line.taxRate) / 100;
  return roundMoney(gross + tax);
}

export function cartTotals(cart: CartLine[]): {
  subtotalUSD: number;
  taxUSD: number;
  totalUSD: number;
} {
  let subtotalUSD = 0;
  let taxUSD = 0;

  for (const line of cart) {
    const gross = line.quantity * line.unitPriceUSD;
    subtotalUSD += gross;
    taxUSD += (gross * line.taxRate) / 100;
  }

  const safeSubtotal = roundMoney(subtotalUSD);
  const safeTax = roundMoney(taxUSD);
  return {
    subtotalUSD: safeSubtotal,
    taxUSD: safeTax,
    totalUSD: roundMoney(safeSubtotal + safeTax),
  };
}

/**
 * Suggested amount when the cashier switches currency: USD sends the total as
 * is, VES/USDT convert with today's snapshot (the backend recomputes and
 * freezes its own rates anyway).
 */
export function suggestedAmount(
  currency: "USD" | "VES" | "USDT",
  totalUSD: number,
  rates: { rateBcv: number; rateUsdt: number } | null,
): number {
  if (currency === "USD") return roundMoney(totalUSD);
  if (!rates) return 0;

  if (currency === "VES") return roundMoney(totalUSD * rates.rateBcv);
  return roundMoney((totalUSD * rates.rateBcv) / rates.rateUsdt);
}

export interface PosPayloadInput {
  cart: CartLine[];
  clientId?: string;
  cashShiftId?: string;
  notes?: string;
  payment?: {
    amountOriginal: number;
    currency: "USD" | "VES" | "USDT";
    paymentMethod: string;
    paidAt?: string;
  };
}

/** Translates the cart into the exact body POST /api/sales accepts. */
export function buildPosPayload(input: PosPayloadInput): CreateSalePayload {
  const items: SaleItemInput[] = input.cart.map((line) => ({
    productId: line.productId,
    productName: line.productName,
    quantity: line.quantity,
    unitPriceUSD: line.unitPriceUSD,
    taxRate: line.taxRate,
  }));

  const payment: SalePaymentInput | undefined = input.payment
    ? {
        amountOriginal: input.payment.amountOriginal,
        currency: input.payment.currency,
        paymentMethod: input.payment.paymentMethod,
        ...(input.payment.paidAt ? { paidAt: input.payment.paidAt } : {}),
      }
    : undefined;

  return {
    items,
    ...(payment ? { payments: [payment] } : {}),
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(input.cashShiftId ? { cashShiftId: input.cashShiftId } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  };
}
