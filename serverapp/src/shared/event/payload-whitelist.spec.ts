import { EventCategory } from "./event-taxonomy";
import {
  sanitizeDescription,
  sanitizeEventPayload,
} from "./payload-whitelist";

/**
 * Phase 7 (task 7.1) — unit coverage for the per-category payload whitelist.
 * NOTE: no test runner installed yet (`node_modules` absent) — authored for
 * task 7.1, cannot execute in Phase 5.
 */
describe("payload-whitelist.sanitizeEventPayload", () => {
  it("conserva solo claves permitidas para una categoría conocida", () => {
    const result = sanitizeEventPayload(EventCategory.AUTH, {
      method: "password",
      durationMs: 120,
      mfaUsed: false,
      note: "el usuario escribió una nota libre",
      password: "secreto",
    });

    expect(result).toEqual({
      method: "password",
      durationMs: 120,
      mfaUsed: false,
    });
  });

  it("descarta texto clínico libre y conserva IDs/counts", () => {
    const result = sanitizeEventPayload(EventCategory.CLINICAL, {
      patientId: "p-1",
      consultationId: "c-1",
      counts: 3,
      note: "paciente con dolor abdominal",
    });

    expect(result).toEqual({
      patientId: "p-1",
      consultationId: "c-1",
      counts: 3,
    });
    expect(JSON.stringify(result)).not.toContain("dolor");
  });

  it("guarda queryHash y no la query cruda", () => {
    const result = sanitizeEventPayload(EventCategory.LIBRARY, {
      queryHash: "abc123",
      query: "avena con leche",
      resultType: "food",
    });

    expect(result).toEqual({ queryHash: "abc123", resultType: "food" });
    expect(JSON.stringify(result)).not.toContain("avena");
  });

  it("modo legacy (sin categoría): descarta nombres y objetos anidados", () => {
    const result = sanitizeEventPayload(null, {
      entityType: "Patient",
      entityId: "p-1",
      patientName: "Juan Perez",
      archivedBy: { id: "u-1", fullName: "Ana Gomez" },
    });

    expect(result).toEqual({ entityType: "Patient", entityId: "p-1" });
    expect(JSON.stringify(result)).not.toContain("Juan");
    expect(JSON.stringify(result)).not.toContain("Ana");
  });

  it("ignora payloads no-objeto", () => {
    expect(sanitizeEventPayload(EventCategory.AUTH, null)).toEqual({});
    expect(sanitizeEventPayload(EventCategory.AUTH, "texto")).toEqual({});
    expect(sanitizeEventPayload(EventCategory.AUTH, ["a"])).toEqual({});
  });
});

describe("payload-whitelist.sanitizeDescription", () => {
  it("conserva tokens de acción/evento", () => {
    expect(sanitizeDescription("auth.session.login")).toBe("auth.session.login");
    expect(sanitizeDescription("PATIENT_ARCHIVED")).toBe("PATIENT_ARCHIVED");
  });

  it("descarta texto libre y emails", () => {
    expect(sanitizeDescription("Paciente Juan Perez archivado")).toBeUndefined();
    expect(sanitizeDescription("user@example.com")).toBeUndefined();
    expect(sanitizeDescription("")).toBeUndefined();
  });
});
