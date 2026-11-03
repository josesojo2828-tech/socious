import { describe, expect, it } from "vitest";
import {
  buildCreatePayload,
  emptyPurchaseLine,
  grandTotalUSD,
  lineTotalUSD,
  paymentCurrencyForMethod,
  purchaseCurrencyEquivalents,
  purchaseSummary,
  validatePurchaseForm,
  type PurchaseForm,
} from "./purchase-form";

const baseForm = (): PurchaseForm => ({
  supplierId: "",
  issueDate: "2026-10-31",
  dueDate: "",
  notes: "",
  paymentMode: "PENDING",
  paymentMethod: "CASH_USD",
  initialAmount: "",
  items: [
    { productName: "Harina", quantity: "2", unitCostUSD: "10.5" },
    { productName: "", quantity: "1", unitCostUSD: "" },
  ],
});

describe("lineTotalUSD / grandTotalUSD", () => {
  it("multiplies quantity by unit cost and rounds to cents", () => {
    expect(lineTotalUSD(emptyPurchaseLineWith("3", "0.333"))).toBe(1);
  });

  it("ignores unparsable amounts", () => {
    expect(lineTotalUSD(emptyPurchaseLineWith("x", "y"))).toBe(0);
  });

  it("sums only the parsed lines", () => {
    expect(grandTotalUSD(baseForm().items)).toBe(21);
  });
});

describe("validatePurchaseForm", () => {
  it("rejects a form without any named article", () => {
    const form = baseForm();
    form.items = [{ productName: "  ", quantity: "1", unitCostUSD: "5" }];
    expect(validatePurchaseForm(form)).toBe(
      "Agregá al menos un artículo con nombre.",
    );
  });

  it("rejects a non-positive quantity naming the article", () => {
    const form = baseForm();
    form.items[0].quantity = "0";
    expect(validatePurchaseForm(form)).toContain("Harina");
  });

  it("rejects a negative cost naming the article", () => {
    const form = baseForm();
    form.items[0].unitCostUSD = "-1";
    expect(validatePurchaseForm(form)).toContain("Harina");
  });

  it("rejects a due date before the issue date", () => {
    const form = baseForm();
    form.dueDate = "2026-10-01";
    expect(validatePurchaseForm(form)).toBe(
      "La fecha de pago no puede ser anterior a la fecha de emisión.",
    );
  });

  it("accepts a valid form ignoring empty trailing lines", () => {
    expect(validatePurchaseForm(baseForm())).toBeNull();
  });

  it("requires a payment method when the purchase is marked PAID", () => {
    const form = baseForm();
    form.paymentMode = "PAID";
    form.paymentMethod = "";
    expect(validatePurchaseForm(form)).toBe(
      "Elegí un método de pago para marcar la compra como pagada.",
    );
  });

  it("rejects PAID in a non-USD method when rates are missing", () => {
    const form = baseForm();
    form.paymentMode = "PAID";
    form.paymentMethod = "PAGO_MOVIL";
    expect(validatePurchaseForm(form, null)).toBe(
      "Necesitás la tasa de hoy para marcar Pagada en esa moneda.",
    );
  });

  it("rejects an initial that is empty, zero or not numeric", () => {
    const form = baseForm();
    form.paymentMode = "PARTIAL";
    form.initialAmount = "0";
    expect(validatePurchaseForm(form)).toBe(
      "Ingresá un monto de inicial mayor que cero.",
    );
  });

  it("rejects an initial that covers or exceeds the total", () => {
    const form = baseForm();
    form.paymentMode = "PARTIAL";
    form.paymentMethod = "CASH_USD";
    form.initialAmount = "21";
    expect(validatePurchaseForm(form)).toBe(
      "El inicial no puede cubrir el total: usá Pagada.",
    );
  });

  it("requires a due date when the purchase is on credit", () => {
    const form = baseForm();
    form.paymentMode = "CREDIT";
    expect(validatePurchaseForm(form)).toBe(
      "Marcá la fecha de pago para la compra a crédito.",
    );
  });

  it("rejects a credit due date before the issue date", () => {
    const form = baseForm();
    form.paymentMode = "CREDIT";
    form.dueDate = "2026-10-01";
    expect(validatePurchaseForm(form)).toBe(
      "La fecha de pago no puede ser anterior a la fecha de emisión.",
    );
  });
});

describe("buildCreatePayload", () => {
  it("drops empty lines and converts amounts to numbers", () => {
    expect(buildCreatePayload(baseForm())).toEqual({
      issueDate: "2026-10-31",
      items: [{ productName: "Harina", quantity: 2, unitCostUSD: 10.5 }],
    });
  });

  it("keeps supplier, due date and notes when present", () => {
    const form = baseForm();
    form.supplierId = "sup-1";
    form.paymentMode = "CREDIT";
    form.dueDate = "2026-11-15";
    form.notes = "  Factura 001  ";
    const payload = buildCreatePayload(form);
    expect(payload.supplierId).toBe("sup-1");
    expect(payload.dueDate).toBe("2026-11-15");
    expect(payload.notes).toBe("Factura 001");
  });

  it("drops dueDate when the mode is not credit-flavoured", () => {
    const form = baseForm();
    form.paymentMode = "PENDING";
    form.dueDate = "2026-11-15";
    expect(buildCreatePayload(form)).not.toHaveProperty("dueDate");
  });

  it("passes the productId through when a catalog item was picked", () => {
    const form = baseForm();
    form.items[0].productId = "prod-9";
    expect(buildCreatePayload(form).items[0].productId).toBe("prod-9");
  });

  it("includes the invoiceKey only when an invoice is attached (S14 #5)", () => {
    expect(buildCreatePayload(baseForm())).not.toHaveProperty("invoiceKey");

    const form = baseForm();
    form.invoiceKey = "purchase_1730000000_ab12cd.pdf";
    expect(buildCreatePayload(form).invoiceKey).toBe(
      "purchase_1730000000_ab12cd.pdf",
    );
  });

  it("omits payments entirely for PENDING mode", () => {
    expect(buildCreatePayload(baseForm())).not.toHaveProperty("payments");
  });

  it("books a full USD payment when marked PAID", () => {
    const form = baseForm();
    form.paymentMode = "PAID";
    form.paymentMethod = "CASH_USD";
    const payload = buildCreatePayload(form);
    expect(payload.payments).toEqual([
      { amountOriginal: 21, currency: "USD", paymentMethod: "CASH_USD" },
    ]);
  });

  it("converts the total into the method currency for PAID with rates", () => {
    const form = baseForm();
    form.paymentMode = "PAID";
    form.paymentMethod = "PAGO_MOVIL"; // VES
    const payload = buildCreatePayload(form, { rateBcv: 36.5, rateUsdt: 40 });
    expect(payload.payments).toEqual([
      { amountOriginal: 766.5, currency: "VES", paymentMethod: "PAGO_MOVIL" },
    ]);
  });

  it("sends the initial amount as-is for PARTIAL", () => {
    const form = baseForm();
    form.paymentMode = "PARTIAL";
    form.paymentMethod = "ZELLE";
    form.initialAmount = "10";
    const payload = buildCreatePayload(form);
    expect(payload.payments).toEqual([
      { amountOriginal: 10, currency: "USD", paymentMethod: "ZELLE" },
    ]);
  });

  it("keeps dueDate for CREDIT and never sends an empty payments array", () => {
    const form = baseForm();
    form.paymentMode = "CREDIT";
    form.dueDate = "2026-11-15";
    const payload = buildCreatePayload(form);
    expect(payload.dueDate).toBe("2026-11-15");
    expect(payload.payments).toBeUndefined();
  });
});

describe("paymentCurrencyForMethod", () => {
  it("derives the currency from the payment method", () => {
    expect(paymentCurrencyForMethod("PAGO_MOVIL")).toBe("VES");
    expect(paymentCurrencyForMethod("USDT_BINANCE")).toBe("USDT");
    expect(paymentCurrencyForMethod("ZELLE")).toBe("USD");
    expect(paymentCurrencyForMethod("unknown")).toBe("USD");
  });
});

describe("purchaseSummary (S14 #6)", () => {
  it("counts only the filled lines and sums their units and totals", () => {
    const summary = purchaseSummary([
      { productName: "Harina", quantity: "2", unitCostUSD: "10.5" },
      { productName: "Azúcar", quantity: "3", unitCostUSD: "2" },
      { productName: "   ", quantity: "1", unitCostUSD: "5" },
    ]);

    expect(summary.articleCount).toBe(2);
    expect(summary.units).toBe(5);
    expect(summary.subtotalUSD).toBe(27);
    expect(summary.totalUSD).toBe(27);
  });

  it("ignores unparsable quantities and costs instead of failing", () => {
    const summary = purchaseSummary([
      { productName: "X", quantity: "x", unitCostUSD: "y" },
    ]);

    expect(summary.articleCount).toBe(1);
    expect(summary.units).toBe(0);
    expect(summary.subtotalUSD).toBe(0);
    expect(summary.totalUSD).toBe(0);
  });

  it("answers zeroes for an empty line list", () => {
    expect(purchaseSummary([])).toEqual({
      articleCount: 0,
      units: 0,
      subtotalUSD: 0,
      totalUSD: 0,
    });
  });
});

describe("purchaseCurrencyEquivalents (S14 #7)", () => {
  const rates = { rateBcv: 800, rateUsdt: 960 };

  it("answers nothing while the rates are unknown", () => {
    expect(
      purchaseCurrencyEquivalents(10, null, { showVES: true, showUSDT: true }),
    ).toEqual([]);
  });

  it("uses the same conversion as the POS (VES = USD×BCV, USDT = USD×BCV/rateUsdt)", () => {
    expect(
      purchaseCurrencyEquivalents(10, rates, { showVES: true, showUSDT: true }),
    ).toEqual([
      { currency: "VES", amount: 8000 },
      { currency: "USDT", amount: 8.33 },
    ]);
  });

  it("gates every currency on its visibility check", () => {
    expect(
      purchaseCurrencyEquivalents(10, rates, {
        showVES: false,
        showUSDT: false,
      }),
    ).toEqual([]);
    expect(
      purchaseCurrencyEquivalents(10, rates, {
        showVES: false,
        showUSDT: true,
      }),
    ).toEqual([{ currency: "USDT", amount: 8.33 }]);
    expect(
      purchaseCurrencyEquivalents(10, rates, {
        showVES: true,
        showUSDT: false,
      }),
    ).toEqual([{ currency: "VES", amount: 8000 }]);
  });
});

function emptyPurchaseLineWith(
  quantity: string,
  unitCostUSD: string,
): ReturnType<typeof emptyPurchaseLine> {
  return { productName: "X", quantity, unitCostUSD };
}
