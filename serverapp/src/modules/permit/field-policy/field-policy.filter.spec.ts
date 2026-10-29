import { resolveOrganizationRole, omitFieldsDeep } from "./field-policy.filter";

describe("resolveOrganizationRole", () => {
  const memberships = [
    {
      organizationId: "org-a",
      role: "RECEPTIONIST",
      status: "ACTIVE",
    },
    {
      organizationId: "org-b",
      role: "CLINIC_ADMIN",
      status: "ACTIVE",
    },
    {
      organizationId: "org-a",
      role: "NUTRITIONIST",
      status: "INACTIVE",
    },
  ];

  it("returns the ACTIVE role for the requested organization", () => {
    expect(resolveOrganizationRole(memberships, "org-a")).toBe("RECEPTIONIST");
    expect(resolveOrganizationRole(memberships, "org-b")).toBe("CLINIC_ADMIN");
  });

  it("ignores memberships of other organizations", () => {
    expect(resolveOrganizationRole(memberships, "org-c")).toBeNull();
  });

  it("ignores inactive memberships", () => {
    const onlyInactive = [
      { organizationId: "org-a", role: "NUTRITIONIST", status: "INACTIVE" },
    ];
    expect(resolveOrganizationRole(onlyInactive, "org-a")).toBeNull();
  });

  it("returns null without a workspace or memberships", () => {
    expect(resolveOrganizationRole(memberships, null)).toBeNull();
    expect(resolveOrganizationRole(memberships, undefined)).toBeNull();
    expect(resolveOrganizationRole([], "org-a")).toBeNull();
    expect(resolveOrganizationRole(undefined, "org-a")).toBeNull();
  });
});

describe("omitFieldsDeep", () => {
  it("returns the same reference when there are no fields (default visible)", () => {
    const payload = { id: 1, notes: "secret" };
    expect(omitFieldsDeep(payload, new Set())).toBe(payload);
  });

  it("omits a top-level field and keeps the rest", () => {
    const payload = { id: 1, notes: "secret", status: "SCHEDULED" };
    const result = omitFieldsDeep(payload, new Set(["notes"]));
    expect(result).toEqual({ id: 1, status: "SCHEDULED" });
    expect("notes" in result).toBe(false);
  });

  it("omits fields at any depth (nested objects)", () => {
    const payload = {
      record: { id: 1, patient: { name: "Ana", diagnosis: "X" } },
      summary: { total: 1 },
    };
    const result = omitFieldsDeep(payload, new Set(["diagnosis"]));
    expect(result).toEqual({
      record: { id: 1, patient: { name: "Ana" } },
      summary: { total: 1 },
    });
  });

  it("omits fields inside arrays of objects", () => {
    const payload = {
      records: [
        { id: "a", notes: "n1", reason: "r1" },
        { id: "b", notes: "n2", reason: "r2" },
      ],
    };
    const result = omitFieldsDeep(payload, new Set(["notes", "reason"]));
    expect(result).toEqual({ records: [{ id: "a" }, { id: "b" }] });
  });

  it("does not mutate the original payload", () => {
    const payload = { id: 1, notes: "secret" };
    const result = omitFieldsDeep(payload, new Set(["notes"]));
    expect(payload).toEqual({ id: 1, notes: "secret" });
    expect(result).not.toBe(payload);
  });

  it("preserves non-plain objects (Date) by reference", () => {
    const when = new Date("2026-01-01T00:00:00.000Z");
    const payload = { id: 1, scheduledAt: when, notes: "secret" };
    const result = omitFieldsDeep(payload, new Set(["notes"]));
    expect(result.scheduledAt).toBe(when);
    expect(result).toEqual({ id: 1, scheduledAt: when });
  });
});
