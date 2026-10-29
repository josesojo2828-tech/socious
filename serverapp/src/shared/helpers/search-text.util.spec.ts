import { normalizeSearchText } from "./search-text.util";

describe("normalizeSearchText", () => {
  it("folds accents so a query typed without them matches the stored row", () => {
    // The guarantee behind the exchange-list search: "Kefir" must match "Kéfir".
    expect(normalizeSearchText("Kéfir")).toBe(normalizeSearchText("Kefir"));
    expect(normalizeSearchText("Kéfir")).toBe("kefir");
  });

  it("folds the Spanish accented vowels and the eñe", () => {
    expect(normalizeSearchText("Piña colada")).toBe("pina colada");
    expect(normalizeSearchText("Berenjena asada")).toBe("berenjena asada");
    expect(normalizeSearchText("Papá frita")).toBe("papa frita");
    expect(normalizeSearchText("Sándwich de jamón")).toBe(
      "sandwich de jamon",
    );
  });

  it("lowercases so matching is case insensitive on both sides", () => {
    expect(normalizeSearchText("Palta")).toBe("palta");
    expect(normalizeSearchText("PALTAs")).toBe("paltas");
  });

  it("collapses runs of whitespace and trims the edges", () => {
    expect(normalizeSearchText("  Arroz   blanco ")).toBe("arroz blanco");
    expect(normalizeSearchText("Arroz\tblanco")).toBe("arroz blanco");
  });

  it("joins the row parts with a single space", () => {
    expect(normalizeSearchText("Leche descremada", "LECHE", "MUY BAJA")).toBe(
      "leche descremada leche muy baja",
    );
  });

  it("treats null, undefined and blank parts as absent", () => {
    expect(normalizeSearchText(null, undefined, "")).toBe("");
    expect(normalizeSearchText("Kéfir", null)).toBe("kefir");
    expect(normalizeSearchText("Kéfir", undefined, "  ")).toBe("kefir");
  });

  it("keeps numbers and punctuation that carry meaning in food names", () => {
    expect(normalizeSearchText("Leche descremada 1%")).toBe(
      "leche descremada 1%",
    );
    expect(normalizeSearchText("Tortilla de maíz (13 cm diámetro)")).toBe(
      "tortilla de maiz (13 cm diametro)",
    );
  });

  it("is idempotent, so rewriting a row never drifts its stored value", () => {
    const once = normalizeSearchText("Yogurt simple descremado", "LECHE");
    expect(normalizeSearchText(once)).toBe(once);
  });
});
