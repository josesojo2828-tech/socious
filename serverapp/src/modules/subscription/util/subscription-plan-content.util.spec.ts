import {
  normalizeSubscriptionPlanContent,
  DEFAULT_PLAN_ENTITLEMENTS,
} from "./subscription-plan-content.util";

describe("normalizeSubscriptionPlanContent", () => {
  it("returns default PREMIUM grants and modules for flat array content with PREMIUM plan name", () => {
    const legacyContent = ["Feature 1", "Feature 2"];
    const result = normalizeSubscriptionPlanContent(legacyContent, "PREMIUM");

    expect(result.features).toEqual(legacyContent);
    expect(result.grants).toEqual(DEFAULT_PLAN_ENTITLEMENTS.PREMIUM.grants);
    expect(result.modules).toEqual(DEFAULT_PLAN_ENTITLEMENTS.PREMIUM.modules);
    expect(result.grants).toContain("INSTITUTIONAL_FOOD_ACCESS");
    expect(result.modules).toContain("INSTITUTIONAL_FOOD");
  });

  it("returns default CLINICA grants and modules for Clinica plan name", () => {
    const legacyContent = ["Feature Clinica"];
    const result = normalizeSubscriptionPlanContent(legacyContent, { id: "Clinica", name: "Clínica" });

    expect(result.grants).toEqual(DEFAULT_PLAN_ENTITLEMENTS.CLINICA.grants);
    expect(result.modules).toEqual(DEFAULT_PLAN_ENTITLEMENTS.CLINICA.modules);
    expect(result.grants).toContain("INSTITUTIONAL_FOOD_ACCESS");
    expect(result.modules).toContain("INSTITUTIONAL_FOOD");
  });

  it("returns default PRO grants and modules for PRO plan name", () => {
    const legacyContent = ["Feature PRO"];
    const result = normalizeSubscriptionPlanContent(legacyContent, "PRO");

    expect(result.grants).toEqual(DEFAULT_PLAN_ENTITLEMENTS.PRO.grants);
    expect(result.modules).toEqual(DEFAULT_PLAN_ENTITLEMENTS.PRO.modules);
    expect(result.grants).toContain("PRO_ACCESS");
    expect(result.grants).toContain("CALCULADORA_PREMIUM_ACCESS");
    expect(result.modules).toEqual(["COMMUNITY"]);
  });

  it("falls back to defaults when content is an object lacking grants or modules", () => {
    const partialContent = { features: ["Bullet 1"] };
    const result = normalizeSubscriptionPlanContent(partialContent, "Premium");

    expect(result.features).toEqual(["Bullet 1"]);
    expect(result.grants).toEqual(DEFAULT_PLAN_ENTITLEMENTS.PREMIUM.grants);
    expect(result.modules).toEqual(DEFAULT_PLAN_ENTITLEMENTS.PREMIUM.modules);
  });

  it("preserves explicit grants and modules when provided in canonical object shape", () => {
    const canonicalContent = {
      features: ["Custom Feature"],
      grants: ["CUSTOM_GRANT"],
      modules: ["CUSTOM_MODULE"],
    };
    const result = normalizeSubscriptionPlanContent(canonicalContent, "PREMIUM");

    expect(result.features).toEqual(["Custom Feature"]);
    expect(result.grants).toEqual(["CUSTOM_GRANT"]);
    expect(result.modules).toEqual(["CUSTOM_MODULE"]);
  });
});
