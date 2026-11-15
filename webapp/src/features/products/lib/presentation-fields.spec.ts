import { describe, expect, it } from "vitest";
import {
  presentationMeasureLabel,
  presentationSizeLabel,
} from "./presentation-fields";

describe("presentationMeasureLabel", () => {
  it("compone el valor con la unidad", () => {
    expect(presentationMeasureLabel("70", "cm")).toBe("70 cm");
    expect(presentationMeasureLabel("10×10", "cm")).toBe("10×10 cm");
  });

  it("muestra solo lo que existe", () => {
    expect(presentationMeasureLabel("500", null)).toBe("500");
    expect(presentationMeasureLabel(null, "g")).toBe("g");
  });

  it("cae a un guion cuando no hay medida", () => {
    expect(presentationMeasureLabel()).toBe("—");
    expect(presentationMeasureLabel("", "  ")).toBe("—");
  });
});

describe("presentationSizeLabel", () => {
  it("muestra la etiqueta guardada, sea del catálogo o propia", () => {
    expect(presentationSizeLabel("M")).toBe("M");
    expect(presentationSizeLabel("  Talla 38 especial ")).toBe(
      "Talla 38 especial",
    );
  });

  it("cae a un guion sin talla", () => {
    expect(presentationSizeLabel(null)).toBe("—");
    expect(presentationSizeLabel("   ")).toBe("—");
  });
});
