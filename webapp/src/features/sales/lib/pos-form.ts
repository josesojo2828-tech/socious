import type {
  CreateSalePayload,
  SaleItemInput,
  SalePaymentInput,
} from "../types/sale.type";
import { resolveUnitDecimals } from "@/features/units/lib/unit-decimals";

/**
 * Pure POS logic (S6): cart math and the payload the backend expects.
 * Kept out of the component so vitest (node env, no DOM) covers it.
 */

export interface CartLine {
  productId: string;
  /** Selling a presentation (S6): the variant's stock is the one that moves. */
  presentationId?: string | null;
  presentationName?: string | null;
  productName: string;
  /** Unit price WITHOUT tax, exactly like the product card shows. */
  unitPriceUSD: number;
  /** Percentage (2 means 2%), mirroring `Product.taxRate`. */
  taxRate: number;
  quantity: number;
  /**
   * Unit of measure of the product ("m", "kg", "UND"). It decides how many
   * decimals the quantity accepts, so a fabric sells 1.5 m and a shirt 2.
   */
  unit?: string | null;
  /** Precio al detal de la línea, sin mayoreo (S3). */
  retailPriceUSD: number;
  /** Precio de mayoreo y su mínimo: solo existen si el cliente es mayorista. */
  wholesalePriceUSD?: number | null;
  wholesaleMinQuantity?: number | null;
}

export interface ProductPicker {
  id: string;
  name: string;
  salePriceUSD: string | number;
  taxRate: string | number;
  unit?: string | null;
  /** Datos de mayoreo del producto (S2); el servidor es la autoridad. */
  wholesalePriceUSD?: string | number | null;
  wholesaleMinQuantity?: string | number | null;
}

export interface PresentationPicker {
  id: string;
  name: string;
  /**
   * Own price of the presentation; null/undefined means "inherits the
   * product price". The API sends Prisma Decimals as strings.
   */
  salePriceUSD?: string | number | null;
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const toNumber = (value: string | number | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Precio de la línea (S3): con datos de mayoreo y la cantidad en el mínimo,
 * gana el precio mayorista. Las presentaciones no tienen mayoreo.
 */
export function resolveUnitPrice(
  line: Pick<
    CartLine,
    "quantity" | "retailPriceUSD" | "wholesalePriceUSD" | "wholesaleMinQuantity"
  >,
): number {
  const min = Number(line.wholesaleMinQuantity ?? 0);
  const wholesale = Number(line.wholesalePriceUSD ?? 0);
  if (wholesale > 0 && min > 0 && line.quantity >= min) return wholesale;
  return line.retailPriceUSD;
}

/** The presentation price wins over the product price when it exists. */
function lineUnitPrice(
  product: ProductPicker,
  presentation?: PresentationPicker,
): number {
  if (presentation && presentation.salePriceUSD != null && presentation.salePriceUSD !== "") {
    return toNumber(presentation.salePriceUSD);
  }
  return toNumber(product.salePriceUSD);
}

/** Same product AND same presentation = same line (bulk vs variants). */
function sameLine(item: CartLine, line: CartLine): boolean {
  return (
    item.productId === line.productId &&
    (item.presentationId ?? null) === (line.presentationId ?? null)
  );
}

/**
 * Rounds a quantity to the decimals its unit accepts: whole numbers for COUNT
 * (units), two decimals for WEIGHT, VOLUME and LENGTH (kg, L, m). A fabric
 * therefore keeps `1.5`, while a shirt stays at `2`.
 */
export function normalizeQuantity(
  quantity: number,
  unit?: string | null,
): number {
  if (!Number.isFinite(quantity)) return 0;
  const decimals = resolveUnitDecimals(unit);
  const factor = 10 ** decimals;
  return Math.round((quantity + Number.EPSILON) * factor) / factor;
}

/** Adds a product or presentation; repeating it increments (never dups). */
export function addToCart(
  cart: CartLine[],
  product: ProductPicker,
  quantity = 1,
  presentation?: PresentationPicker,
  /** Cliente mayorista (S3): habilita el precio por cantidad. */
  wholesaler = false,
): CartLine[] {
  const unit = product.unit ?? null;
  const normalized = normalizeQuantity(quantity, unit);
  const safeQuantity = normalized > 0 ? normalized : 1;
  const retailPriceUSD = lineUnitPrice(product, presentation);
  // El mayoreo es del producto: una presentación con precio propio manda.
  const wholesalePriceUSD =
    wholesaler && !presentation && product.wholesalePriceUSD != null
      ? toNumber(product.wholesalePriceUSD)
      : null;
  const wholesaleMinQuantity =
    wholesaler && !presentation && product.wholesaleMinQuantity != null
      ? toNumber(product.wholesaleMinQuantity)
      : null;

  const line: CartLine = {
    productId: product.id,
    presentationId: presentation?.id ?? null,
    presentationName: presentation?.name ?? null,
    productName: presentation ? presentation.name : product.name,
    unitPriceUSD: retailPriceUSD,
    retailPriceUSD,
    wholesalePriceUSD,
    wholesaleMinQuantity,
    taxRate: toNumber(product.taxRate),
    quantity: safeQuantity,
    unit,
  };
  line.unitPriceUSD = resolveUnitPrice(line);

  const existing = cart.find((item) => sameLine(item, line));
  if (!existing) return [...cart, line];

  return cart.map((item) => {
    if (!sameLine(item, line)) return item;
    const merged = { ...item, quantity: item.quantity + safeQuantity };
    return { ...merged, unitPriceUSD: resolveUnitPrice(merged) };
  });
}

/**
 * Zero or a negative quantity removes the line. A positive value is rounded to
 * what the line's unit accepts; if that rounds to zero (a fraction typed on a
 * COUNT product) the line is left untouched instead of silently emptying it.
 */
export function changeQuantity(
  cart: CartLine[],
  productId: string,
  quantity: number,
  presentationId?: string | null,
): CartLine[] {
  const matches = (item: CartLine) =>
    item.productId === productId &&
    (item.presentationId ?? null) === (presentationId ?? null);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return cart.filter((item) => !matches(item));
  }

  return cart.map((item) => {
    if (!matches(item)) return item;
    const next = normalizeQuantity(quantity, item.unit);
    if (next <= 0) return item;
    const merged = { ...item, quantity: next };
    return { ...merged, unitPriceUSD: resolveUnitPrice(merged) };
  });
}

export function removeFromCart(
  cart: CartLine[],
  productId: string,
  presentationId?: string | null,
): CartLine[] {
  return cart.filter(
    (item) =>
      !(
        item.productId === productId &&
        (item.presentationId ?? null) === (presentationId ?? null)
      ),
  );
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

export interface CreditPaymentInput {
  amountOriginal: number;
  currency: "USD" | "VES" | "USDT";
  paymentMethod: string;
}

/**
 * El pago inicial de una venta a crédito sale SOLO del campo "Pago inicial"
 * (creditInitial) — jamás del "monto cobrado", que la UI autocompleta con el
 * TOTAL de la venta (ese era el bug que marcaba las ventas a crédito como
 * pagadas y escondía el formulario de abono).
 */
export function creditInitialPayment(
  creditInitial: string,
  currency: "USD" | "VES" | "USDT",
  methodCode: string | null | undefined,
): CreditPaymentInput | undefined {
  if (!methodCode) return undefined;
  const initial = Number(creditInitial);
  if (!Number.isFinite(initial) || initial <= 0) return undefined;
  return { amountOriginal: initial, currency, paymentMethod: methodCode };
}

export interface PosPayloadInput {
  cart: CartLine[];
  clientId?: string;
  cashShiftId?: string;
  notes?: string;
  credit?: {
    cadence: "QUINCENAL" | "MONTHLY" | "EVERY_N_DAYS" | "FREE";
    everyNDays?: number;
    monthlyDay?: number;
  };
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
    ...(line.presentationId ? { presentationId: line.presentationId } : {}),
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
    ...(input.credit
      ? {
          creditCadence: input.credit.cadence,
          ...(input.credit.everyNDays
            ? { creditEveryNDays: input.credit.everyNDays }
            : {}),
          ...(input.credit.monthlyDay
            ? { creditMonthlyDay: input.credit.monthlyDay }
            : {}),
        }
      : {}),
    ...(payment ? { payments: [payment] } : {}),
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(input.cashShiftId ? { cashShiftId: input.cashShiftId } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  };
}
