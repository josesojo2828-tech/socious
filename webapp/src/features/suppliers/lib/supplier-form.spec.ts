import { describe, expect, it } from "vitest";
import {
  buildSupplierPayload,
  toSupplierForm,
  validateSupplierForm,
} from "./supplier-form";

const form = (overrides: Record<string, unknown> = {}) => ({
  name: "  Distribuidora Norte ",
  contactName: "  María ",
  email: " compras@norte.test ",
  address: "  Av. 5  ",
  ...overrides,
} as Parameters<typeof buildSupplierPayload>[0]);

describe("supplier-form (S8)", () => {
  it("requires a name", () => {
    expect(validateSupplierForm({ name: "  " })).toMatch(/nombre/i);
    expect(validateSupplierForm({ name: "Norte" })).toBeNull();
  });

  it("rejects a malformed email only when provided", () => {
    expect(validateSupplierForm({ name: "Norte", email: "xx" })).toMatch(
      /correo/i,
    );
    expect(validateSupplierForm({ name: "Norte", email: "" })).toBeNull();
  });

  it("trims and drops empty optional fields", () => {
    const payload = buildSupplierPayload(form({ city: "   " }));

    expect(payload.name).toBe("Distribuidora Norte");
    expect(payload.contactName).toBe("María");
    expect(payload.email).toBe("compras@norte.test");
    expect(payload.address).toBe("Av. 5");
    expect(payload).not.toHaveProperty("city");
    expect(payload).not.toHaveProperty("taxId");
  });

  it("maps nulls to empty strings for the form", () => {
    const parsed = toSupplierForm({
      id: "s-1",
      name: "Norte",
      taxId: null,
      contactName: null,
      email: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      currentBalanceUSD: "0",
      notes: null,
      isActive: true,
      organizationId: null,
    });

    expect(parsed.taxId).toBe("");
    expect(parsed.contactName).toBe("");
    expect(parsed.isActive).toBe(true);
  });
});
