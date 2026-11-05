import { describe, expect, it } from "vitest";
import { roleLabel } from "./role-label";

describe("roleLabel", () => {
  it("labels a global superadmin without printing a clinic role", () => {
    expect(roleLabel({ permitName: "SUPERADMIN" })).toBe("Superadmin");
    expect(roleLabel({ permitName: "ADMIN" })).toBe("Administrador");
  });

  it("maps organization roles to the ERP vocabulary", () => {
    expect(
      roleLabel({ workspaceType: "ORGANIZATION", organizationRole: "OWNER" }),
    ).toBe("Dueño");
    expect(
      roleLabel({ workspaceType: "ORGANIZATION", organizationRole: "SELLER" }),
    ).toBe("Vendedor");
  });

  it("strips the legacy CLINIC_ prefix instead of showing it", () => {
    expect(
      roleLabel({
        workspaceType: "ORGANIZATION",
        organizationRole: "CLINIC_ADMIN",
      }),
    ).toBe("Admin");
    expect(
      roleLabel({
        workspaceType: "ORGANIZATION",
        organizationRole: "CLINIC_MANAGER",
      }),
    ).toBe("Gerente");
  });

  it("falls back to Colaborador for an unknown organization role", () => {
    expect(
      roleLabel({ workspaceType: "ORGANIZATION", organizationRole: "MYSTERY" }),
    ).toBe("Colaborador");
  });

  it("uses the plan name for a personal workspace", () => {
    expect(roleLabel({ planName: "Premium" })).toBe("Premium");
    expect(roleLabel({})).toBe("Free");
  });
});
