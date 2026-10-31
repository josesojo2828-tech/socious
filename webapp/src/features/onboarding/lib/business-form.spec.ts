import { describe, expect, it } from "vitest";
import { buildBusinessPayload, validateBusinessForm } from "./business-form";

describe("validateBusinessForm", () => {
  it("rejects an empty name", () => {
    expect(validateBusinessForm({ name: "   " })).toBe(
      "Ingresá el nombre de tu negocio.",
    );
  });

  it("rejects a name shorter than 2 characters", () => {
    expect(validateBusinessForm({ name: "A" })).toBe(
      "El nombre debe tener al menos 2 caracteres.",
    );
  });

  it("rejects a name longer than 80 characters", () => {
    expect(validateBusinessForm({ name: "x".repeat(81) })).toBe(
      "El nombre no puede exceder 80 caracteres.",
    );
  });

  it("accepts a valid name ignoring surrounding whitespace", () => {
    expect(validateBusinessForm({ name: "  Panadería Sol  " })).toBeNull();
  });
});

describe("buildBusinessPayload", () => {
  it("trims the name before sending it", () => {
    expect(buildBusinessPayload({ name: "  Kiosco Luna  " })).toEqual({
      name: "Kiosco Luna",
    });
  });
});
