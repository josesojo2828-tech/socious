import { describe, expect, it } from "vitest";
import esCommon from "./es/common.json";
import notEnCommon from "./not_en/common.json";

/**
 * Guards S4 for the sidebar copy: short nouns, no `&`, no ` / ` and the
 * fallback locale never adds a sidebar key that Spanish does not define. The
 * labels are plain JSON, so this runs under the node test environment without
 * any renderer.
 */
type Sidebar = Record<string, string>;

const esSidebar = esCommon.sidebar as Sidebar;
const notEnSidebar = notEnCommon.sidebar as Sidebar;

describe("sidebar copy (S4)", () => {
  it("uses the simplified Spanish labels", () => {
    expect(esSidebar).toMatchObject({
      dashboard: "Inicio",
      feedback: "Comentarios",
      expand: "Expandir",
      general_panel: "Principal",
      online_store: "Tienda",
      storefront_metrics: "Resumen",
      shop: "Ver tienda",
      general_analytics: "Analíticas",
      user_management: "Administración",
      platform_config: "Plataforma",
      countries: "Países",
      permits: "Permisos",
      subscription_plans: "Planes",
      active_subscriptions: "Suscripciones",
      system_settings: "Ajustes",
    });
    expect(esCommon.auth.logout).toBe("Salir");
  });

  it("every fallback sidebar key exists in the Spanish source", () => {
    // Subset (not equality) on purpose: i18n.context.tsx falls back to Spanish
    // when a key is missing from `not_en`, so Spanish-first development must be
    // able to add sidebar keys without an English translation yet. Equality
    // here would block every new Spanish UI string; only a `not_en` key with
    // no `es` source is a real defect.
    const missingInEs = Object.keys(notEnSidebar).filter(
      (k) => !(k in esSidebar),
    );
    expect(missingInEs).toEqual([]);
  });

  it("never uses the banned separators in any sidebar label", () => {
    for (const [key, value] of Object.entries(esSidebar)) {
      expect(value, `es.sidebar.${key}`).not.toContain("&");
      expect(value, `es.sidebar.${key}`).not.toContain(" / ");
    }
    for (const [key, value] of Object.entries(notEnSidebar)) {
      expect(value, `not_en.sidebar.${key}`).not.toContain("&");
      expect(value, `not_en.sidebar.${key}`).not.toContain(" / ");
    }
  });
});
