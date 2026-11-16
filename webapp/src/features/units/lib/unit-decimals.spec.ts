import { describe, expect, it } from "vitest";
import { resolveUnitDecimals } from "./unit-decimals";
import type { UnitOfMeasure } from "../types/unit.type";

function unit(
  abbreviation: string,
  kind: UnitOfMeasure["kind"],
): UnitOfMeasure {
  return {
    id: abbreviation,
    organizationId: null,
    name: abbreviation,
    abbreviation,
    kind,
    active: true,
  };
}

describe("resolveUnitDecimals", () => {
  it("las unidades del sistema de conteo son enteras", () => {
    expect(resolveUnitDecimals("UND")).toBe(0);
  });

  it("las unidades del sistema de peso y volumen admiten decimales", () => {
    for (const abbreviation of ["kg", "g", "lb", "oz", "L", "mL"]) {
      expect(resolveUnitDecimals(abbreviation)).toBe(2);
    }
  });

  it("las unidades de longitud admiten decimales (venta de telas)", () => {
    for (const abbreviation of ["m", "cm"]) {
      expect(resolveUnitDecimals(abbreviation)).toBe(2);
    }
  });

  it("ignora mayúsculas y minúsculas en el mapa del sistema", () => {
    expect(resolveUnitDecimals("und")).toBe(0);
    expect(resolveUnitDecimals("KG")).toBe(2);
    expect(resolveUnitDecimals("ml")).toBe(2);
  });

  it("usa el catálogo cargado cuando la abreviatura está", () => {
    expect(resolveUnitDecimals("CAJA", [unit("CAJA", "COUNT")])).toBe(0);
    expect(resolveUnitDecimals("TN", [unit("TN", "WEIGHT")])).toBe(2);
    expect(resolveUnitDecimals("GAL", [unit("GAL", "VOLUME")])).toBe(2);
  });

  it("una unidad de conteo propia queda entera cuando el catálogo está cargado", () => {
    expect(resolveUnitDecimals("par", [unit("par", "COUNT")])).toBe(0);
  });

  it("sin catálogo una abreviatura desconocida es permisiva", () => {
    // El POS consulta solo la abreviatura: una unidad propia de conteo se
    // comporta como decimal hasta que la pantalla cargue el catálogo.
    expect(resolveUnitDecimals("par")).toBe(2);
  });

  it("el catálogo tiene prioridad sobre el mapa del sistema", () => {
    expect(resolveUnitDecimals("UND", [unit("UND", "WEIGHT")])).toBe(2);
  });

  it("una unidad desconocida sin catálogo es permisiva", () => {
    expect(resolveUnitDecimals("CAJA")).toBe(2);
    expect(resolveUnitDecimals("")).toBe(2);
    expect(resolveUnitDecimals(undefined)).toBe(2);
  });
});
