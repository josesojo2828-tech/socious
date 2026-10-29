import {
  assertValidRates,
  buildDocumentTotals,
  buildPaymentAmounts,
  derivePaymentStatus,
  remainingBalance,
  round2,
  toDecimal,
  usdToUsdt,
  usdToVes,
  vesToUsd,
  vesToUsdt,
} from "./money";

const rates = { rateBcv: 795, rateUsdt: 938 };

describe("money utils", () => {
  describe("round2", () => {
    it("rounds to cents without binary noise", () => {
      expect(round2(0.1 + 0.2)).toBe(0.3);
      expect(round2(10.005)).toBe(10.01);
      expect(round2(-0.004)).toBe(-0);
    });
  });

  describe("assertValidRates", () => {
    it("rejects zero, negative and non-finite rates", () => {
      expect(() => assertValidRates({ rateBcv: 0, rateUsdt: 938 })).toThrow(
        /Invalid BCV rate/,
      );
      expect(() => assertValidRates({ rateBcv: 795, rateUsdt: -1 })).toThrow(
        /Invalid USDT rate/,
      );
      expect(() => assertValidRates({ rateBcv: NaN, rateUsdt: 938 })).toThrow(
        /Invalid BCV rate/,
      );
      expect(() => assertValidRates(rates)).not.toThrow();
    });
  });

  describe("single-currency conversions", () => {
    it("converts USD to VES with the BCV rate", () => {
      expect(usdToVes(10, rates)).toBe(7950);
    });

    it("converts VES to USD with the BCV rate", () => {
      expect(vesToUsd(7950, rates)).toBe(10);
    });

    it("converts USD to USDT through VES", () => {
      // 10 USD = 7950 VES / 938 VES per USDT
      expect(usdToUsdt(10, rates)).toBe(8.48);
    });

    it("converts VES to USDT with the Binance rate", () => {
      expect(vesToUsdt(938, rates)).toBe(1);
    });
  });

  describe("buildDocumentTotals", () => {
    it("freezes the three currencies from one snapshot", () => {
      const totals = buildDocumentTotals(
        { subtotalUSD: 100, discountUSD: 10, taxUSD: 16 },
        rates,
      );

      expect(totals).toEqual({
        subtotalUSD: 100,
        discountUSD: 10,
        taxUSD: 16,
        totalUSD: 106,
        totalVES: 84270,
        totalUSDT: 89.84,
      });
    });

    it("clamps a discount bigger than the document to zero", () => {
      const totals = buildDocumentTotals(
        { subtotalUSD: 10, discountUSD: 50 },
        rates,
      );

      expect(totals.totalUSD).toBe(0);
      expect(totals.totalVES).toBe(0);
      expect(totals.totalUSDT).toBe(0);
    });

    it("defaults discount and tax to zero", () => {
      const totals = buildDocumentTotals({ subtotalUSD: 25 }, rates);
      expect(totals.discountUSD).toBe(0);
      expect(totals.taxUSD).toBe(0);
      expect(totals.totalUSD).toBe(25);
    });
  });

  describe("buildPaymentAmounts", () => {
    it("normalizes a USD payment", () => {
      expect(buildPaymentAmounts(10, "USD", rates)).toEqual({
        amountOriginal: 10,
        amountUSD: 10,
        amountVES: 7950,
        amountUSDT: 8.48,
      });
    });

    it("normalizes a VES payment", () => {
      expect(buildPaymentAmounts(7950, "VES", rates)).toEqual({
        amountOriginal: 7950,
        amountUSD: 10,
        amountVES: 7950,
        amountUSDT: 8.48,
      });
    });

    it("normalizes a USDT payment", () => {
      expect(buildPaymentAmounts(8.48, "USDT", rates)).toEqual({
        amountOriginal: 8.48,
        amountUSD: 10.01,
        amountVES: 7954.24,
        amountUSDT: 8.48,
      });
    });

    it("rejects non-positive amounts", () => {
      expect(() => buildPaymentAmounts(0, "USD", rates)).toThrow(
        /Invalid payment amount/,
      );
      expect(() => buildPaymentAmounts(-5, "USD", rates)).toThrow(
        /Invalid payment amount/,
      );
    });
  });

  describe("derivePaymentStatus", () => {
    it("reports UNPAID, PARTIAL and PAID", () => {
      expect(derivePaymentStatus(100, 0)).toBe("UNPAID");
      expect(derivePaymentStatus(100, 40)).toBe("PARTIAL");
      expect(derivePaymentStatus(100, 100)).toBe("PAID");
    });

    it("tolerates one-cent rounding so a document can close", () => {
      expect(derivePaymentStatus(100, 99.99)).toBe("PAID");
      expect(derivePaymentStatus(100, 99.9)).toBe("PARTIAL");
    });

    it("treats a zero-total document as paid", () => {
      expect(derivePaymentStatus(0, 0)).toBe("PAID");
    });
  });

  describe("remainingBalance", () => {
    it("never returns a negative balance", () => {
      expect(remainingBalance(100, 40)).toBe(60);
      expect(remainingBalance(100, 150)).toBe(0);
    });
  });

  describe("toDecimal", () => {
    it("renders a fixed 2-decimal string for Prisma Decimal columns", () => {
      expect(toDecimal(89.8438)).toBe("89.84");
      expect(toDecimal(10)).toBe("10.00");
    });
  });
});
