import { describe, it, expect } from "vitest";
import {
    cleanRecommendationsToPlainText,
    extractDistributionMetadata,
    attachDistributionMetadata,
} from "./recommendations.util";

describe("recommendations.util", () => {
    describe("cleanRecommendationsToPlainText", () => {
        it("retorna string vacío ante valores nulos, indefinidos o vacíos", () => {
            expect(cleanRecommendationsToPlainText(null)).toBe("");
            expect(cleanRecommendationsToPlainText(undefined)).toBe("");
            expect(cleanRecommendationsToPlainText("")).toBe("");
            expect(cleanRecommendationsToPlainText("   ")).toBe("");
        });

        it("elimina comentarios HTML de metadatos NUTRINGEST_DISTRIBUTION", () => {
            const raw = '<!--NUTRINGEST_DISTRIBUTION:{"splits":{"breakfast":25}}-->';
            expect(cleanRecommendationsToPlainText(raw)).toBe("");
        });

        it("elimina comentarios HTML mezclados con texto plano", () => {
            const raw = `Tomar 2L de agua diariamente.\n<!--NUTRINGEST_DISTRIBUTION:{"splits":{"breakfast":25}}-->`;
            expect(cleanRecommendationsToPlainText(raw)).toBe("Tomar 2L de agua diariamente.");
        });

        it("remueve etiquetas HTML básicas y convierte listas a viñetas de texto plano", () => {
            const raw = "<p>Pautas generales:</p><ul><li>Evitar ultraprocesados</li><li>Priorizar vegetales</li></ul>";
            const cleaned = cleanRecommendationsToPlainText(raw);
            expect(cleaned).toContain("Pautas generales:");
            expect(cleaned).toContain("• Evitar ultraprocesados");
            expect(cleaned).toContain("• Priorizar vegetales");
            expect(cleaned).not.toContain("<p>");
            expect(cleaned).not.toContain("<ul>");
            expect(cleaned).not.toContain("<li>");
        });

        it("convierte <br> y </p> a saltos de línea", () => {
            const raw = "Línea 1<br/>Línea 2<br>Línea 3";
            const cleaned = cleanRecommendationsToPlainText(raw);
            expect(cleaned).toBe("Línea 1\nLínea 2\nLínea 3");
        });

        it("decodifica entidades HTML habituales", () => {
            const raw = "Manzanas &amp; peras &nbsp;&lt;saludables&gt; &quot;siempre&quot;";
            const cleaned = cleanRecommendationsToPlainText(raw);
            expect(cleaned).toBe('Manzanas & peras  <saludables> "siempre"');
        });

        it("normaliza múltiples saltos de línea consecutivos a máximo 2", () => {
            const raw = "Párrafo 1\n\n\n\n\nPárrafo 2";
            const cleaned = cleanRecommendationsToPlainText(raw);
            expect(cleaned).toBe("Párrafo 1\n\nPárrafo 2");
        });
    });

    describe("extractDistributionMetadata", () => {
        it("extrae objeto de metadata válido desde comentario", () => {
            const raw = 'Texto\n<!--NUTRINGEST_DISTRIBUTION:{"splits":{"breakfast":30,"lunch":40}}-->';
            const meta = extractDistributionMetadata(raw);
            expect(meta).toEqual({ splits: { breakfast: 30, lunch: 40 } });
        });

        it("retorna null si no hay metadata o es inválida", () => {
            expect(extractDistributionMetadata("Solo texto sin metadata")).toBeNull();
            expect(extractDistributionMetadata("<!--NUTRINGEST_DISTRIBUTION:invalido-->")).toBeNull();
            expect(extractDistributionMetadata(null)).toBeNull();
        });
    });

    describe("attachDistributionMetadata", () => {
        it("adjunta comentario de metadata a texto plano", () => {
            const meta = { splits: { breakfast: 25 } };
            const attached = attachDistributionMetadata("Recomendación básica", meta);
            expect(attached).toBe('Recomendación básica\n<!--NUTRINGEST_DISTRIBUTION:{"splits":{"breakfast":25}}-->');
        });

        it("si metadata es null o vacía, retorna solo el texto plano", () => {
            expect(attachDistributionMetadata("Solo texto", null)).toBe("Solo texto");
            expect(attachDistributionMetadata("Solo texto", {})).toBe("Solo texto");
        });

        it("limpia el texto plano antes de adjuntar", () => {
            const raw = "<p>Texto con html</p>";
            const meta = { test: 123 };
            const attached = attachDistributionMetadata(raw, meta);
            expect(attached).toBe('Texto con html\n<!--NUTRINGEST_DISTRIBUTION:{"test":123}-->');
        });
    });
});
