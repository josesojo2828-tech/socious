import {
  cleanRecommendationsToPlainText,
  sanitizeRecommendationsForStorage,
} from "./recommendations.util";

describe("recommendations.util (serverapp)", () => {
  describe("cleanRecommendationsToPlainText", () => {
    it("debe retornar string vacío para nulo o indefinido", () => {
      expect(cleanRecommendationsToPlainText(null)).toBe("");
      expect(cleanRecommendationsToPlainText(undefined)).toBe("");
      expect(cleanRecommendationsToPlainText("")).toBe("");
    });

    it("debe limpiar etiquetas HTML y comentarios", () => {
      const raw =
        "<p>Pautas de alimentación:</p><ul><li>Beber agua</li></ul><!--NUTRINGEST_DISTRIBUTION:{}-->";
      const cleaned = cleanRecommendationsToPlainText(raw);
      expect(cleaned).toContain("Pautas de alimentación:");
      expect(cleaned).toContain("• Beber agua");
      expect(cleaned).not.toContain("<p>");
      expect(cleaned).not.toContain("<!--");
    });
  });

  describe("sanitizeRecommendationsForStorage", () => {
    it("debe limpiar HTML pero preservar el bloque de metadata intacto", () => {
      const raw =
        "<p>Comer frutas y verduras</p>\n<!--NUTRINGEST_DISTRIBUTION:{\"splits\":{\"breakfast\":25}}-->";
      const res = sanitizeRecommendationsForStorage(raw);
      expect(res).toBe(
        "Comer frutas y verduras\n<!--NUTRINGEST_DISTRIBUTION:{\"splits\":{\"breakfast\":25}}-->",
      );
    });

    it("debe retornar solo metadata si no había texto", () => {
      const raw = '<!--NUTRINGEST_DISTRIBUTION:{"test":true}-->';
      const res = sanitizeRecommendationsForStorage(raw);
      expect(res).toBe('<!--NUTRINGEST_DISTRIBUTION:{"test":true}-->');
    });

    it("debe retornar null si no hay texto ni metadata", () => {
      expect(sanitizeRecommendationsForStorage("   ")).toBeNull();
      expect(sanitizeRecommendationsForStorage(null)).toBeNull();
    });
  });
});
