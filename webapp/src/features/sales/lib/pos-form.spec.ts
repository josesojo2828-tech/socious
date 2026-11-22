import { describe, expect, it } from "vitest";
import {
  addToCart,
  buildPosPayload,
  creditInitialPayment,
  cartTotals,
  changeQuantity,
  lineTotal,
  normalizeQuantity,
  resolveUnitPrice,
  removeFromCart,
  roundMoney,
  suggestedAmount,
  type CartLine,
} from "./pos-form";

const arroz = {
  id: "p-1",
  name: "Arroz 1kg",
  salePriceUSD: "2.00",
  taxRate: "16.00",
  unit: "UND",
};

const carte = (overrides: Partial<CartLine> = {}): CartLine => ({
  productId: "p-1",
  productName: "Arroz 1kg",
  unitPriceUSD: 2,
  retailPriceUSD: 2,
  taxRate: 16,
  quantity: 1,
  ...overrides,
});

describe("pos-form (S6)", () => {
  describe("cart", () => {
    it("adds a product and increments when it repeats", () => {
      const one = addToCart([], arroz);
      expect(one).toHaveLength(1);
      expect(one[0].quantity).toBe(1);

      const two = addToCart(one, arroz);
      expect(two).toHaveLength(1);
      expect(two[0].quantity).toBe(2);
    });

    it("keeps prices and tax as numbers even when the API sent strings", () => {
      const [line] = addToCart([], arroz);
      expect(line.unitPriceUSD).toBe(2);
      expect(line.taxRate).toBe(16);
    });

    it("removes the line when the quantity drops to zero", () => {
      const cart = addToCart([], arroz);
      expect(changeQuantity(cart, "p-1", 0)).toEqual([]);
      expect(removeFromCart(cart, "p-1")).toEqual([]);
    });

    it("never leaves a negative quantity", () => {
      const cart = addToCart([], arroz, -5);
      expect(cart[0].quantity).toBe(1);
    });
  });

  describe("venta por metro (S2)", () => {
    const tela = {
      id: "p-tela",
      name: "Tela lino",
      salePriceUSD: "4.00",
      taxRate: "16.00",
      unit: "m",
    };

    it("guarda 1.5 metros sin redondear a entero", () => {
      const cart = addToCart([], tela, 1.5);
      expect(cart[0].quantity).toBe(1.5);
      expect(cart[0].unit).toBe("m");
      expect(lineTotal(cart[0])).toBe(6.96);
    });

    it("mantiene los metros al editar la cantidad a mano", () => {
      const cart = addToCart([], tela);
      expect(changeQuantity(cart, "p-tela", 2.25)[0].quantity).toBe(2.25);
      expect(changeQuantity(cart, "p-tela", 0.5)[0].quantity).toBe(0.5);
    });

    it("una unidad de conteo sigue siendo entera", () => {
      const cart = addToCart([], arroz);
      expect(changeQuantity(cart, "p-1", 1.5)[0].quantity).toBe(2);
      expect(addToCart([], arroz, 1.5)[0].quantity).toBe(2);
    });

    it("normaliza la cantidad según la unidad", () => {
      expect(normalizeQuantity(1.456, "m")).toBe(1.46);
      expect(normalizeQuantity(1.5, "UND")).toBe(2);
      expect(normalizeQuantity(2.75, "kg")).toBe(2.75);
    });
  });

  describe("totals", () => {
    it("adds tax on top of the subtotal", () => {
      const cart = [carte({ quantity: 10, taxRate: 16 })];
      expect(lineTotal(cart[0])).toBe(23.2);
      expect(cartTotals(cart)).toEqual({
        subtotalUSD: 20,
        taxUSD: 3.2,
        totalUSD: 23.2,
      });
    });

    it("sums mixed lines", () => {
      const cart = [
        carte({ quantity: 2, taxRate: 0 }),
        carte({
          productId: "p-2",
          productName: "Aceite",
          unitPriceUSD: 5,
          taxRate: 16,
          quantity: 1,
        }),
      ];

      expect(cartTotals(cart)).toEqual({
        subtotalUSD: 9,
        taxUSD: 0.8,
        totalUSD: 9.8,
      });
    });
  });

  describe("suggestedAmount", () => {
    const rates = { rateBcv: 800, rateUsdt: 1000 };

    it("keeps the total for USD", () => {
      expect(suggestedAmount("USD", 23.2, rates)).toBe(23.2);
    });

    it("converts to VES with the BCV rate", () => {
      expect(suggestedAmount("VES", 10, rates)).toBe(8000);
    });

    it("converts to USDT through VES", () => {
      expect(suggestedAmount("USDT", 10, rates)).toBe(8);
    });

    it("suggests nothing without rates", () => {
      expect(suggestedAmount("VES", 10, null)).toBe(0);
    });
  });

  describe("buildPosPayload", () => {
    it("maps the cart to the backend body with the payment", () => {
      const payload = buildPosPayload({
        cart: [carte({ quantity: 3 })],
        clientId: "c-1",
        cashShiftId: "sh-1",
        payment: {
          amountOriginal: 10000,
          currency: "VES",
          paymentMethod: "PAGO_MOVIL",
        },
        notes: "  cliente fiel  ",
      });

      expect(payload).toEqual({
        items: [
          {
            productId: "p-1",
            productName: "Arroz 1kg",
            quantity: 3,
            unitPriceUSD: 2,
            taxRate: 16,
          },
        ],
        payments: [
          {
            amountOriginal: 10000,
            currency: "VES",
            paymentMethod: "PAGO_MOVIL",
          },
        ],
        clientId: "c-1",
        cashShiftId: "sh-1",
        notes: "cliente fiel",
      });
    });

    it("omits the payment, client and shift when they were not set", () => {
      const payload = buildPosPayload({ cart: [carte()] });

      expect(payload.payments).toBeUndefined();
      expect(payload.clientId).toBeUndefined();
      expect(payload.cashShiftId).toBeUndefined();
      expect(payload.notes).toBeUndefined();
      expect(payload.items).toHaveLength(1);
    });
  });

  describe("roundMoney", () => {
    it("rounds binary noise away", () => {
      expect(roundMoney(0.1 + 0.2)).toBe(0.3);
      expect(roundMoney(Number.NaN)).toBe(0);
    });
  });
});

describe("precio de mayoreo (S3)", () => {
  const mayorista = {
    id: "p-may",
    name: "Arroz 1kg",
    salePriceUSD: "2.00",
    taxRate: "0",
    unit: "UND",
    wholesalePriceUSD: "5.00",
    wholesaleMinQuantity: "12.00",
  };

  it("cobra a mayorista cuando la cantidad llega al mínimo", () => {
    const [line] = addToCart([], mayorista, 12, undefined, true);
    expect(line.unitPriceUSD).toBe(5);
    expect(lineTotal(line)).toBe(60);
  });

  it("debajo del mínimo cobra al detal", () => {
    const [line] = addToCart([], mayorista, 11, undefined, true);
    expect(line.unitPriceUSD).toBe(2);
  });

  it("recalcula al subir la cantidad", () => {
    const cart = addToCart([], mayorista, 1, undefined, true);
    const updated = changeQuantity(cart, "p-may", 12);
    expect(updated[0].unitPriceUSD).toBe(5);
    const back = changeQuantity(updated, "p-may", 3);
    expect(back[0].unitPriceUSD).toBe(2);
  });

  it("sin el flag del cliente el mayoreo se ignora", () => {
    const [line] = addToCart([], mayorista, 12, undefined, false);
    expect(line.unitPriceUSD).toBe(2);
    expect(line.wholesalePriceUSD).toBeNull();
  });

  it("la presentación con precio propio manda sobre el mayoreo", () => {
    const [line] = addToCart([], mayorista, 12, {
      id: "pres-1",
      name: "Bulto 12",
      salePriceUSD: "18.00",
    }, true);
    expect(line.unitPriceUSD).toBe(18);
  });

  it("resolveUnitPrice es puro y no toca el precio al detal", () => {
    expect(
      resolveUnitPrice({
        quantity: 12,
        retailPriceUSD: 2,
        wholesalePriceUSD: 5,
        wholesaleMinQuantity: 12,
      }),
    ).toBe(5);
    expect(
      resolveUnitPrice({
        quantity: 12,
        retailPriceUSD: 2,
        wholesalePriceUSD: null,
        wholesaleMinQuantity: null,
      }),
    ).toBe(2);
  });
});

describe("presentations and credit (sales overhaul)", () => {
  const product = {
    id: "prod-1",
    name: "Pan",
    salePriceUSD: 2,
    taxRate: 0,
  };

  it("keeps bulk and presentation lines apart", () => {
    let cart = addToCart([], product);
    cart = addToCart(cart, product, 1, { id: "pres-1", name: "Bolsa 100 g" });
    expect(cart).toHaveLength(2);
    expect(cart[1].presentationId).toBe("pres-1");
    expect(cart[1].productName).toBe("Bolsa 100 g");
  });

  it("sends presentationId and credit terms in the payload", () => {
    const cart = addToCart([], product, 2, { id: "pres-1", name: "Bolsa" });
    const payload = buildPosPayload({
      cart,
      credit: { cadence: "QUINCENAL" },
      payment: { amountOriginal: 1, currency: "USD", paymentMethod: "CASH_USD" },
    });
    expect(payload.items[0].presentationId).toBe("pres-1");
    expect(payload.creditCadence).toBe("QUINCENAL");
    expect(payload.payments).toHaveLength(1);
  });

  it("sends the Cashea plan instead of credit terms when the sale is Cashea", () => {
    const cart = addToCart([], product, 1);
    const payload = buildPosPayload({
      cart,
      cashea: {
        initialUSD: 1,
        installmentCount: 2,
        installmentUSD: 0.5,
        firstDueDate: "2026-01-20T04:00:00.000Z",
      },
      payment: { amountOriginal: 1, currency: "USD", paymentMethod: "CASH_USD" },
    });

    expect(payload.cashea).toEqual({
      initialUSD: 1,
      installmentCount: 2,
      installmentUSD: 0.5,
      firstDueDate: "2026-01-20T04:00:00.000Z",
    });
    expect(payload).not.toHaveProperty("creditCadence");
  });

  it("prices the line with the presentation's own price when it has one", () => {
    const cart = addToCart([], product, 1, {
      id: "pres-1",
      name: "Bolsa 100 g",
      salePriceUSD: "2.50",
    });
    expect(cart[0].unitPriceUSD).toBe(2.5);
  });

  it("falls back to the product price when the presentation inherits it", () => {
    const inheriting = addToCart([], product, 1, {
      id: "pres-1",
      name: "Bolsa 100 g",
      salePriceUSD: null,
    });
    expect(inheriting[0].unitPriceUSD).toBe(2);

    const noField = addToCart([], product, 1, {
      id: "pres-1",
      name: "Bolsa 100 g",
    });
    expect(noField[0].unitPriceUSD).toBe(2);
  });
});

describe("creditInitialPayment (regresión: ventas a crédito no pagadas)", () => {
  it("no genera pago cuando el inicial está vacío o en cero", () => {
    expect(creditInitialPayment("", "USD", "CASH_USD")).toBeUndefined();
    expect(creditInitialPayment("0", "USD", "CASH_USD")).toBeUndefined();
    expect(creditInitialPayment("-5", "USD", "CASH_USD")).toBeUndefined();
  });

  it("no genera pago sin medio de cobro", () => {
    expect(creditInitialPayment("25", "USD", null)).toBeUndefined();
    expect(creditInitialPayment("25", "USD", "")).toBeUndefined();
  });

  it("usa SOLO el campo de inicial con su medio, en la moneda del método", () => {
    expect(creditInitialPayment("25.50", "VES", "PAGO_MOVIL")).toEqual({
      amountOriginal: 25.5,
      currency: "VES",
      paymentMethod: "PAGO_MOVIL",
    });
  });
});
