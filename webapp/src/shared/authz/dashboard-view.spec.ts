import { describe, expect, it } from "vitest";
import { resolveDashboardView } from "./dashboard-view";

const nutritionist = { permits: { name: "USER" } };
const patient = { permits: { name: "PATIENT" } };
const admin = { permits: { name: "ADMIN" } };
const superadmin = { permits: { name: "SUPERADMIN" } };
const clinicAdmin = { permits: { name: "CLINIC_ADMIN" } };
const userListHolder = { permits: { name: "USER", list: ["USER_LIST"] } };

describe("resolveDashboardView", () => {
  it("routes PATIENT to the patient dashboard regardless of workspace", () => {
    expect(resolveDashboardView(patient, false)).toBe("patient");
    expect(resolveDashboardView(patient, true)).toBe("patient");
  });

  it("routes platform admins to admin analytics outside a clinic workspace", () => {
    expect(resolveDashboardView(admin, false)).toBe("admin");
    expect(resolveDashboardView(superadmin, false)).toBe("admin");
  });

  it("routes USER_LIST permit holders to admin analytics outside a clinic workspace", () => {
    expect(resolveDashboardView(userListHolder, false)).toBe("admin");
  });

  it("routes a clinic workspace to the clinic dashboard (admins included)", () => {
    expect(resolveDashboardView(clinicAdmin, true)).toBe("clinic");
    expect(resolveDashboardView(admin, true)).toBe("clinic");
    expect(resolveDashboardView(superadmin, true)).toBe("clinic");
  });

  it("routes an individual nutritionist to the user dashboard", () => {
    expect(resolveDashboardView(nutritionist, false)).toBe("user");
  });

  it("falls back to the user dashboard for missing/unknown users", () => {
    expect(resolveDashboardView(null, false)).toBe("user");
    expect(resolveDashboardView(undefined, false)).toBe("user");
    expect(resolveDashboardView({}, false)).toBe("user");
    expect(resolveDashboardView({ permits: null }, false)).toBe("user");
  });
});
