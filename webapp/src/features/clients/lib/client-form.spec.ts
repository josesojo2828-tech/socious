import { describe, expect, it } from "vitest";
import {
  balanceState,
  buildClientPayload,
  portfolioSummary,
  toClientForm,
  validateClientForm,
  type ClientForm,
} from "./client-form";
import type { Client } from "../types/client.type";

const form = (overrides: Partial<ClientForm> = {}): ClientForm => ({
  name: " Almacén El Sol ",
  taxId: "  J-31012345-6 ",
  email: "  ventas@elsol.test ",
  phone: "  +58 412-1112233 ",
  creditLimitUSD: 500,
  notes: "   cliente fiel  ",
  ...overrides,
});

describe("client-form (S8)", () => {
  describe("validateClientForm", () => {
    it("accepts a complete form", () => {
      expect(validateClientForm(form())).toBeNull();
    });

    it("requires a name", () => {
      expect(validateClientForm(form({ name: "   " }))).toMatch(/nombre/i);
    });

    it("requires the email and rejects a malformed one", () => {
      expect(validateClientForm(form({ email: "" }))).toBe(
        "El correo es obligatorio.",
      );
      expect(validateClientForm(form({ email: "no-es-correo" }))).toMatch(
        /formato válido/,
      );
      expect(validateClientForm(form({ email: " ok@x.com " }))).toBeNull();
    });

    it("rejects a negative credit limit", () => {
      expect(validateClientForm(form({ creditLimitUSD: -1 }))).toMatch(
        /negativo/i,
      );
    });
  });

  describe("buildClientPayload", () => {
    it("trims every field and keeps only the filled ones", () => {
      const payload = buildClientPayload(form());

      expect(payload.name).toBe("Almacén El Sol");
      expect(payload.taxId).toBe("J-31012345-6");
      expect(payload.email).toBe("ventas@elsol.test");
      expect(payload.phone).toBe("+58 412-1112233");
      expect(payload.notes).toBe("cliente fiel");
      expect(payload.creditLimitUSD).toBe(500);
      expect(payload).not.toHaveProperty("city");
      expect(payload).not.toHaveProperty("state");
    });

    it("never sends a negative credit limit", () => {
      const payload = buildClientPayload(form({ creditLimitUSD: -20 }));
      expect(payload.creditLimitUSD).toBe(0);
    });
  });

  describe("balanceState", () => {
    it("reports a client with no debt as current", () => {
      expect(balanceState(0, 100)).toEqual({ tone: "ok", label: "Al día" });
    });

    it("warns near the limit and flags the limit reached", () => {
      expect(balanceState(80, 100).label).toBe("Cerca del límite");
      expect(balanceState(100, 100).label).toBe("Límite alcanzado");
      expect(balanceState(150, 100).label).toBe("Límite alcanzado");
    });

    it("shows the amount when there is no credit limit", () => {
      expect(balanceState(42.5, 0)).toEqual({
        tone: "attention",
        label: "Debe $42.50",
      });
    });

    it("stays sane with missing numbers", () => {
      expect(balanceState(Number.NaN, Number.NaN).tone).toBe("ok");
    });
  });

  describe("toClientForm", () => {
    it("maps stored decimals to editable numbers", () => {
      const parsed = toClientForm({
        id: "c-1",
        name: "Sol",
        taxId: null,
        email: null,
        creditLimitUSD: "500.00",
        currentBalanceUSD: "10.00",
        isActive: true,
      });

      expect(parsed.creditLimitUSD).toBe(500);
      expect(parsed.taxId).toBe("");
      expect(parsed.isActive).toBe(true);
    });
  });

  describe("portfolioSummary", () => {
    const client = (overrides: Partial<Client>): Client => ({
      id: "c-1",
      name: "Cliente",
      creditLimitUSD: 0,
      currentBalanceUSD: 0,
      isActive: true,
      ...overrides,
    });

    it("counts the portfolio, the active ones and the ones with balance", () => {
      const summary = portfolioSummary([
        client({ id: "c-1", isActive: true, currentBalanceUSD: "0.00" }),
        client({ id: "c-2", isActive: true, currentBalanceUSD: "42.50" }),
        client({ id: "c-3", isActive: false, currentBalanceUSD: "10.00" }),
        client({ id: "c-4", isActive: false, currentBalanceUSD: 0 }),
      ]);

      expect(summary).toEqual({ total: 4, active: 2, withBalance: 2 });
    });

    it("treats stored decimal strings as numbers", () => {
      const summary = portfolioSummary([
        client({ currentBalanceUSD: "0.00" }),
        client({ currentBalanceUSD: "-3.00" }),
        client({ currentBalanceUSD: Number.NaN }),
      ]);

      expect(summary.withBalance).toBe(0);
    });

    it("stays sane on an empty portfolio", () => {
      expect(portfolioSummary([])).toEqual({
        total: 0,
        active: 0,
        withBalance: 0,
      });
    });
  });
});
