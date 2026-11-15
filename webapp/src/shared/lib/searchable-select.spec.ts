import { describe, expect, it } from "vitest";
import {
  filterSearchableOptions,
  nextActiveIndex,
  normalizeSearchText,
  selectedOptionLabel,
  type SearchableOption,
} from "./searchable-select";

const options: SearchableOption[] = [
  { value: "1", label: "Bebidas" },
  { value: "2", label: "Aguas y refrescos" },
  { value: "3", label: "Café molido", hint: "Desayuno" },
  { value: "4", label: "Granos" },
];

describe("normalizeSearchText", () => {
  it("ignora mayúsculas, acentos y espacios de los bordes", () => {
    expect(normalizeSearchText("  Café  ")).toBe("cafe");
    expect(normalizeSearchText("AGUAS")).toBe("aguas");
  });
});

describe("filterSearchableOptions", () => {
  it("sin consulta devuelve todas las opciones", () => {
    expect(filterSearchableOptions(options, "")).toEqual(options);
    expect(filterSearchableOptions(options, "   ")).toEqual(options);
  });

  it("filtra por nombre sin distinguir mayúsculas ni acentos", () => {
    expect(filterSearchableOptions(options, "cafe").map((o) => o.value)).toEqual([
      "3",
    ]);
    expect(filterSearchableOptions(options, "AGUAS").map((o) => o.value)).toEqual([
      "2",
    ]);
  });

  it("también busca en el hint", () => {
    expect(
      filterSearchableOptions(options, "desayuno").map((o) => o.value),
    ).toEqual(["3"]);
  });

  it("devuelve vacío cuando nada coincide", () => {
    expect(filterSearchableOptions(options, "zzz")).toEqual([]);
  });
});

describe("selectedOptionLabel", () => {
  it("devuelve la etiqueta del valor vigente", () => {
    expect(selectedOptionLabel(options, "2")).toBe("Aguas y refrescos");
  });

  it("usa la etiqueta vacía para el valor vacío", () => {
    expect(selectedOptionLabel(options, "", "Sin categoría")).toBe(
      "Sin categoría",
    );
  });

  it("no inventa una etiqueta para un valor que ya no está", () => {
    expect(selectedOptionLabel(options, "99", "Sin categoría")).toBe("");
  });
});

describe("nextActiveIndex", () => {
  it("baja y sube con wrap", () => {
    expect(nextActiveIndex(-1, 1, 3)).toBe(0);
    expect(nextActiveIndex(0, 1, 3)).toBe(1);
    expect(nextActiveIndex(2, 1, 3)).toBe(0);
    expect(nextActiveIndex(0, -1, 3)).toBe(2);
  });

  it("sin opciones no hay activa", () => {
    expect(nextActiveIndex(0, 1, 0)).toBe(-1);
  });
});
