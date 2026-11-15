import { describe, expect, it } from "vitest";
import {
  moneyText,
  parseMoneyDigits,
  parseQuantityDraft,
  quantityTextFromDraft,
  quantityTextFromValue,
  sanitizeMoneyDigits,
  sanitizeQuantityDraft,
  toMoneyDigits,
} from "./decimal-input";

describe("sanitizeQuantityDraft", () => {
  it("elimina los ceros a la izquierda del entero", () => {
    expect(sanitizeQuantityDraft("01")).toBe("1");
    expect(sanitizeQuantityDraft("00.5")).toBe("0.5");
    expect(sanitizeQuantityDraft("000")).toBe("0");
  });

  it("conserva el cero decimal y los ceros significativos", () => {
    expect(sanitizeQuantityDraft("0.05")).toBe("0.05");
    expect(sanitizeQuantityDraft("1.50")).toBe("1.50");
  });

  it("acepta coma o punto y deja un solo separador", () => {
    expect(sanitizeQuantityDraft("1,5")).toBe("1.5");
    expect(sanitizeQuantityDraft("1.2.3")).toBe("1.23");
  });

  it("permite empezar por el separador", () => {
    expect(sanitizeQuantityDraft(".")).toBe("0.");
  });

  it("recorta al máximo de decimales", () => {
    expect(sanitizeQuantityDraft("1.234", 2)).toBe("1.23");
    expect(sanitizeQuantityDraft("1.2345", 3)).toBe("1.234");
  });

  it("descarta signos, letras y espacios", () => {
    expect(sanitizeQuantityDraft("-5")).toBe("5");
    expect(sanitizeQuantityDraft("abc")).toBe("");
    expect(sanitizeQuantityDraft(" 12 ")).toBe("12");
  });

  it("con cero decimales solo acepta enteros", () => {
    expect(sanitizeQuantityDraft("5", 0)).toBe("5");
    expect(sanitizeQuantityDraft("5.9", 0)).toBe("5");
    expect(sanitizeQuantityDraft("01", 0)).toBe("1");
  });
});

describe("quantityTextFromDraft", () => {
  it("formatea a decimales fijos", () => {
    expect(quantityTextFromDraft("1", 2, false)).toBe("1.00");
    expect(quantityTextFromDraft("1.5", 2, false)).toBe("1.50");
    expect(quantityTextFromDraft("0.", 2, false)).toBe("0.00");
    expect(quantityTextFromDraft("5", 0, false)).toBe("5");
  });

  it("vacío respeta allowEmpty", () => {
    expect(quantityTextFromDraft("", 2, false)).toBe("0.00");
    expect(quantityTextFromDraft("", 2, true)).toBe("");
  });
});

describe("parseQuantityDraft", () => {
  it("parsea el valor o devuelve null", () => {
    expect(parseQuantityDraft("1.5")).toBe(1.5);
    expect(parseQuantityDraft("0.")).toBe(0);
    expect(parseQuantityDraft("")).toBeNull();
    expect(parseQuantityDraft(".")).toBeNull();
  });
});

describe("quantityTextFromValue", () => {
  it("formatea valores del estado", () => {
    expect(quantityTextFromValue(1, 2)).toBe("1.00");
    expect(quantityTextFromValue("2.5", 2)).toBe("2.50");
    expect(quantityTextFromValue(0, 2)).toBe("0.00");
  });

  it("vacío se queda vacío", () => {
    expect(quantityTextFromValue(null, 2)).toBe("");
    expect(quantityTextFromValue(undefined, 2)).toBe("");
    expect(quantityTextFromValue("", 2)).toBe("");
  });
});

describe("money digits", () => {
  it("convierte un valor a dígitos de centavos", () => {
    expect(toMoneyDigits(0)).toBe("0");
    expect(toMoneyDigits(25.5)).toBe("2550");
    expect(toMoneyDigits("12.50")).toBe("1250");
    expect(toMoneyDigits("0.01")).toBe("1");
  });

  it("vacío se queda vacío", () => {
    expect(toMoneyDigits(null)).toBe("");
    expect(toMoneyDigits(undefined)).toBe("");
    expect(toMoneyDigits("")).toBe("");
  });

  it("conserva solo dígitos al tipear o pegar", () => {
    expect(sanitizeMoneyDigits("12.50")).toBe("1250");
    expect(sanitizeMoneyDigits("1.234,56")).toBe("123456");
    expect(sanitizeMoneyDigits("abc")).toBe("");
  });

  it("renderiza la máscara de centavos", () => {
    expect(moneyText("1", 2, false)).toBe("0.01");
    expect(moneyText("2550", 2, false)).toBe("25.50");
    expect(moneyText("0", 2, false)).toBe("0.00");
  });

  it("vacío respeta allowEmpty", () => {
    expect(moneyText("", 2, false)).toBe("0.00");
    expect(moneyText("", 2, true)).toBe("");
  });

  it("parsea los dígitos al número", () => {
    expect(parseMoneyDigits("2550", 2)).toBe(25.5);
    expect(parseMoneyDigits("1", 2)).toBe(0.01);
    expect(parseMoneyDigits("", 2)).toBeNull();
  });
});
