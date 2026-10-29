import {
  EVENT_NAMES,
  EVENT_TAXONOMY,
  EventCategory,
  EventCategorySchema,
  EventNameSchema,
  RETENTION_DAYS,
  TAXONOMY_VERSION,
  UnknownEventError,
  getEventDefinition,
  isEventName,
} from "./event-taxonomy";

/**
 * Phase 7 (task 7.1) — versioned taxonomy registry + Zod validation.
 * NOTE: no test runner is installed in this repo yet (`node_modules` absent),
 * so this spec is authored but not executed in this phase.
 */
describe("event-taxonomy registry", () => {
  it("expone nombres namespaced <domain>.<entity>.<verb> en minúscula", () => {
    expect(EVENT_NAMES.length).toBeGreaterThan(0);
    for (const name of EVENT_NAMES) {
      expect(name).toMatch(/^[a-z][a-z0-9]*(?:\.[a-z0-9_]+)+$/);
    }
  });

  it("contiene las categorías representativas de la spec", () => {
    expect(EVENT_NAMES).toContain("auth.session.login");
    expect(EVENT_NAMES).toContain("clinical.patient.created");
    expect(EVENT_NAMES).toContain("library.tools.food.viewed");
    expect(EVENT_NAMES).toContain("billing.subscription.renewed");
    expect(EVENT_NAMES).toContain("admin.user.role_changed");
    expect(EVENT_NAMES).toContain("org.tenant.workspace.created");
  });

  it("cada definición trae categoría válida, versión v1 y retentionDays", () => {
    const categories = Object.values(EventCategory) as string[];
    for (const name of EVENT_NAMES) {
      const def = EVENT_TAXONOMY[name];
      expect(categories).toContain(def.category);
      expect(def.version).toBe(TAXONOMY_VERSION);
      expect(def.retentionDays).toBe(RETENTION_DAYS[def.category]);
    }
  });

  it("respeta las ventanas de retención de la spec", () => {
    expect(RETENTION_DAYS[EventCategory.AUTH]).toBe(365);
    expect(RETENTION_DAYS[EventCategory.CLINICAL]).toBe(730);
    expect(RETENTION_DAYS[EventCategory.LIBRARY]).toBe(365);
    expect(RETENTION_DAYS[EventCategory.BILLING]).toBe(2555);
    expect(RETENTION_DAYS[EventCategory.ADMIN]).toBe(730);
    expect(RETENTION_DAYS[EventCategory.ORG]).toBe(365);
  });

  describe("isEventName", () => {
    it("acepta un nombre conocido", () => {
      expect(isEventName("clinical.patient.created")).toBe(true);
    });

    it("rechaza el mangle legacy y nombres desconocidos", () => {
      expect(isEventName("Patient_CREATE")).toBe(false);
      expect(isEventName("foo.bar.baz")).toBe(false);
      expect(isEventName("")).toBe(false);
    });
  });

  describe("getEventDefinition", () => {
    it("devuelve la definición de un evento conocido", () => {
      expect(getEventDefinition("clinical.patient.created")).toMatchObject({
        category: EventCategory.CLINICAL,
        version: TAXONOMY_VERSION,
      });
    });

    it("lanza UnknownEventError para nombres desconocidos (rechazo pre-persistencia)", () => {
      expect(() => getEventDefinition("Patient_CREATE")).toThrow(UnknownEventError);
      expect(() => getEventDefinition("foo.bar.baz")).toThrow(
        /Unknown telemetry event name/,
      );
    });
  });

  describe("EventNameSchema (Zod)", () => {
    it("acepta un nombre válido de la taxonomía", () => {
      expect(EventNameSchema.safeParse("clinical.patient.created").success).toBe(true);
    });

    it("rechaza el formato legacy y los nombres desconocidos", () => {
      expect(EventNameSchema.safeParse("Patient_CREATE").success).toBe(false);
      expect(EventNameSchema.safeParse("foo.bar.baz").success).toBe(false);
    });
  });

  describe("EventCategorySchema", () => {
    it("acepta las categorías declaradas", () => {
      expect(EventCategorySchema.safeParse("auth.session").success).toBe(true);
      expect(EventCategorySchema.safeParse("clinical").success).toBe(true);
      expect(EventCategorySchema.safeParse("library.tools").success).toBe(true);
    });

    it("rechaza el dominio como categoría (no existe source/category 'auth')", () => {
      expect(EventCategorySchema.safeParse("auth").success).toBe(false);
    });
  });
});
