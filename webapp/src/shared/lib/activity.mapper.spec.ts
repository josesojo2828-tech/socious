import { describe, expect, it } from "vitest";
import {
  formatRelativeTime,
  getActionConfig,
  getUserFullName,
  getUserInitials,
} from "./activity.mapper";
import type { IActivityLog } from "@/types/backend/activity.type";

/**
 * Phase 7 (task 7.1) — frontend mapper: dotted taxonomy + legacy + unknown.
 * NOTE: no test runner is installed in this repo yet (`node_modules` absent),
 * so this spec is authored but not executed in this phase.
 */
const dict: Record<string, string> = {
  "dashboard.activity.actions.login": "Inicio de sesión",
  "dashboard.activity.actions.logout": "Cierre de sesión",
  "dashboard.activity.actions.failed_login": "Inicio de sesión fallido",
  "dashboard.activity.actions.created": "creado",
  "dashboard.activity.actions.archived": "archivado",
  "dashboard.activity.actions.viewed": "visto",
  "dashboard.activity.actions.renewed": "renovado",
  "dashboard.activity.actions.role_changed": "rol cambiado",
  "dashboard.activity.entities.patient": "Paciente",
  "dashboard.activity.entities.food": "Alimento",
  "dashboard.activity.entities.subscription": "Suscripción",
  "dashboard.activity.entities.user": "Usuario",
  "dashboard.activity.entities.workspace": "Workspace",
};

const t = (path: string) => dict[path] ?? path;

describe("activity.mapper — dotted taxonomy", () => {
  it("mapea clinical.patient.created a entidad+verbo con badge/icon de categoría", () => {
    const cfg = getActionConfig("clinical.patient.created", t);
    expect(cfg).toMatchObject({
      label: "Paciente creado",
      badgeClass: "badge-success",
      category: "clinical",
      icon: "clinical",
    });
    expect(cfg.legacy).toBeUndefined();
    expect(cfg.unknown).toBeUndefined();
  });

  it("mapea auth.session.login como verbo (sin entidad) con badge auth", () => {
    const cfg = getActionConfig("auth.session.login", t);
    expect(cfg).toMatchObject({
      label: "Inicio de sesión",
      badgeClass: "badge-primary",
      category: "auth.session",
      icon: "auth",
    });
  });

  it("mapea auth.session.failed_login", () => {
    expect(getActionConfig("auth.session.failed_login", t).label).toBe(
      "Inicio de sesión fallido",
    );
  });

  it("resuelve la sub-entidad de library.tools.food.viewed", () => {
    expect(getActionConfig("library.tools.food.viewed", t)).toMatchObject({
      label: "Alimento visto",
      category: "library.tools",
      icon: "library",
    });
  });

  it("mapea billing / admin / org", () => {
    expect(getActionConfig("billing.subscription.renewed", t)).toMatchObject({
      label: "Suscripción renovado",
      category: "billing",
      icon: "billing",
    });
    expect(getActionConfig("admin.user.role_changed", t)).toMatchObject({
      label: "Usuario rol cambiado",
      category: "admin",
      icon: "admin",
    });
    expect(getActionConfig("org.tenant.workspace.created", t)).toMatchObject({
      label: "Workspace creado",
      category: "org.tenant",
      icon: "org",
    });
  });

  it("un evento namespaced con verbo desconocido sigue siendo de su categoría", () => {
    const cfg = getActionConfig("clinical.patient.frobnicated", t);
    expect(cfg.category).toBe("clinical");
    expect(cfg.unknown).toBeUndefined();
    expect(cfg.label).toBe("Paciente frobnicated");
  });
});

describe("activity.mapper — legacy compatibility", () => {
  it("mantiene el formato legacy Entity_VERB con verbos nuevos (PATIENT_ARCHIVED)", () => {
    const cfg = getActionConfig("PATIENT_ARCHIVED", t);
    expect(cfg.label).toBe("Paciente archivado");
    expect(cfg.legacy).toBe(true);
  });

  it("mantiene Patient_CREATE con badge por verbo", () => {
    const cfg = getActionConfig("Patient_CREATE", t);
    expect(cfg.label).toBe("Paciente creado");
    expect(cfg.badgeClass).toBe("badge-success");
    expect(cfg.legacy).toBe(true);
  });

  it("mantiene LOGIN / LOGOUT planos", () => {
    expect(getActionConfig("LOGIN", t)).toMatchObject({
      label: "Inicio de sesión",
      badgeClass: "badge-primary",
      legacy: true,
    });
    expect(getActionConfig("LOGOUT", t)).toMatchObject({
      label: "Cierre de sesión",
      badgeClass: "badge-primary",
      legacy: true,
    });
  });

  it("renderiza filas legacy.* (eventName null) con badge ghost", () => {
    const cfg = getActionConfig("legacy.patient.created", t);
    expect(cfg).toMatchObject({
      label: "Paciente creado",
      badgeClass: "badge-ghost",
      legacy: true,
    });
  });
});

describe("activity.mapper — unknown fallback", () => {
  it("muestra el string crudo con badge ghost para foo.bar.baz", () => {
    const cfg = getActionConfig("foo.bar.baz", t);
    expect(cfg).toMatchObject({
      label: "foo.bar.baz",
      badgeClass: "badge-ghost",
      unknown: true,
    });
  });

  it("devuelve guion y ghost para acción vacía", () => {
    expect(getActionConfig("", t)).toMatchObject({
      label: "—",
      badgeClass: "badge-ghost",
    });
  });
});

describe("activity.mapper — helpers", () => {
  const log = (over: Partial<IActivityLog>): IActivityLog =>
    ({ id: "1", userId: "u", action: "a", createdAt: "2026-09-28T12:00:00Z", ...over }) as IActivityLog;

  it("getUserFullName prioriza fullName, luego email, luego fallback", () => {
    expect(getUserFullName(log({ user: { id: "u", fullName: "Ana", email: "a@x.com" } }))).toBe("Ana");
    expect(
      getUserFullName(log({ user: { id: "u", fullName: "", email: "a@x.com" } })),
    ).toBe("a@x.com");
    expect(getUserFullName(log({}))).toBe("Usuario desconocido");
  });

  it("getUserInitials toma la primera letra en mayúscula", () => {
    expect(getUserInitials(log({ user: { id: "u", fullName: "ana", email: "a@x.com" } }))).toBe("A");
  });

  it("formatRelativeTime devuelve un string no vacío", () => {
    expect(typeof formatRelativeTime(new Date().toISOString())).toBe("string");
    expect(formatRelativeTime(new Date().toISOString())).toBe("hace unos segundos");
  });
});
