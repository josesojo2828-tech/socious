import { describe, expect, it } from "vitest";
import {
  CLIENT_HIDDEN_SECTIONS,
  canSeeSettingsSection,
  isPlatformAdmin,
} from "./settings-visibility";

describe("isPlatformAdmin", () => {
  it("reconoce los roles de plataforma", () => {
    expect(isPlatformAdmin({ permits: { name: "ADMIN" } })).toBe(true);
    expect(isPlatformAdmin({ permits: { name: "SUPERADMIN" } })).toBe(true);
    expect(isPlatformAdmin({ permitId: "ADMIN" })).toBe(true);
  });

  it("el dueño del cliente no es admin de plataforma", () => {
    expect(isPlatformAdmin({ permits: { name: "USER" } })).toBe(false);
    expect(isPlatformAdmin({ permits: { name: "CLINIC_ADMIN" } })).toBe(false);
    expect(isPlatformAdmin({ permitId: "USER" })).toBe(false);
  });

  it("sin usuario no hay privilegio", () => {
    expect(isPlatformAdmin(null)).toBe(false);
    expect(isPlatformAdmin(undefined)).toBe(false);
    expect(isPlatformAdmin({})).toBe(false);
  });
});

describe("canSeeSettingsSection (S2)", () => {
  it("el admin ve todas las secciones", () => {
    for (const section of CLIENT_HIDDEN_SECTIONS) {
      expect(canSeeSettingsSection(section, true)).toBe(true);
    }
  });

  it("el cliente no ve caja, planes, rutas, materia prima, servicios ni las pestañas ocultas", () => {
    for (const section of [
      "cash",
      "shipping",
      "routes",
      "plans",
      "rawMaterials",
      "services",
      "returns",
      "notifications",
      "store",
    ] as const) {
      expect(canSeeSettingsSection(section, false)).toBe(false);
    }
  });
});
