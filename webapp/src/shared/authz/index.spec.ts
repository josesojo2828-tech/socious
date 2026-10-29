import { describe, expect, it } from "vitest";
import {
  hasAnyPermit,
  hasPermit,
  isAdmin,
  isNutritionist,
  isSuperadmin,
  type AuthzUser,
} from "./index";

const future = new Date(Date.now() + 60_000);
const past = new Date(Date.now() - 60_000);

describe("authz predicates — permit class", () => {
  it("SUPERADMIN is both superadmin and admin (isAdmin superset)", () => {
    const u: AuthzUser = { permits: { name: "SUPERADMIN" } };
    expect(isSuperadmin(u)).toBe(true);
    expect(isAdmin(u)).toBe(true);
    expect(isNutritionist(u)).toBe(false);
  });

  it("ADMIN is admin but not superadmin", () => {
    const u: AuthzUser = { permits: { name: "ADMIN" } };
    expect(isAdmin(u)).toBe(true);
    expect(isSuperadmin(u)).toBe(false);
    expect(isNutritionist(u)).toBe(false);
  });

  it("USER is the nutritionist permit and is not admin", () => {
    const u: AuthzUser = { permits: { name: "USER" } };
    expect(isNutritionist(u)).toBe(true);
    expect(isAdmin(u)).toBe(false);
    expect(isSuperadmin(u)).toBe(false);
  });

  it("missing or unknown permits resolve to false without throwing", () => {
    expect(isSuperadmin(undefined)).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isNutritionist(undefined)).toBe(false);
    expect(isNutritionist({})).toBe(false);
    expect(isAdmin({ permits: null })).toBe(false);
    expect(isAdmin({ permits: {} })).toBe(false);
    expect(isAdmin({ permits: { name: "OWNER" } })).toBe(false);
    expect(isNutritionist({ permits: { name: "OWNER" } })).toBe(false);
  });
});

describe("hasPermit — permits.list", () => {
  it("grants when the list includes the permission", () => {
    expect(hasPermit({ permits: { list: ["A", "B"] } }, "A")).toBe(true);
  });

  it("denies when the list does not include it", () => {
    expect(hasPermit({ permits: { list: ["A"] } }, "B")).toBe(false);
  });

  it("handles missing user, permits and list safely", () => {
    expect(hasPermit(null, "A")).toBe(false);
    expect(hasPermit(undefined, "A")).toBe(false);
    expect(hasPermit({}, "A")).toBe(false);
    expect(hasPermit({ permits: {} }, "A")).toBe(false);
    expect(hasPermit({ permits: { list: null } }, "A")).toBe(false);
  });
});

describe("hasPermit — userPermissions grants and expiry", () => {
  it("grants when an active (future expiry) entry matches", () => {
    const u: AuthzUser = {
      userPermissions: [{ permission: "X", expiresAt: future }],
    };
    expect(hasPermit(u, "X")).toBe(true);
  });

  it("grants when expiry is null (no expiry)", () => {
    expect(
      hasPermit({ userPermissions: [{ permission: "X", expiresAt: null }] }, "X"),
    ).toBe(true);
  });

  it("grants when expiresAt is omitted", () => {
    expect(hasPermit({ userPermissions: [{ permission: "X" }] }, "X")).toBe(true);
  });

  it("accepts ISO string expiry dates in the future", () => {
    const futureIso = new Date(Date.now() + 60_000).toISOString();
    expect(
      hasPermit({ userPermissions: [{ permission: "X", expiresAt: futureIso }] }, "X"),
    ).toBe(true);
  });

  it("denies when the entry is expired (past)", () => {
    expect(
      hasPermit({ userPermissions: [{ permission: "X", expiresAt: past }] }, "X"),
    ).toBe(false);
  });

  it("denies when the permission name differs", () => {
    expect(hasPermit({ userPermissions: [{ permission: "X" }] }, "Y")).toBe(false);
  });

  it("handles missing userPermissions safely", () => {
    expect(hasPermit({}, "X")).toBe(false);
    expect(hasPermit({ userPermissions: null }, "X")).toBe(false);
  });
});

describe("hasAnyPermit", () => {
  it("is true when any permission matches", () => {
    expect(hasAnyPermit({ permits: { list: ["B"] } }, ["A", "B"])).toBe(true);
  });

  it("is false when none match", () => {
    expect(hasAnyPermit({ permits: { list: ["C"] } }, ["A", "B"])).toBe(false);
  });

  it("is false for a missing user", () => {
    expect(hasAnyPermit(null, ["A", "B"])).toBe(false);
  });
});

describe("grants do not elevate class", () => {
  it("a USER with an elevated grant is not admin but holds the permit", () => {
    const u: AuthzUser = {
      permits: { name: "USER" },
      userPermissions: [{ permission: "USER_DELETE" }],
    };
    expect(isAdmin(u)).toBe(false);
    expect(isSuperadmin(u)).toBe(false);
    expect(isNutritionist(u)).toBe(true);
    expect(hasPermit(u, "USER_DELETE")).toBe(true);
  });
});
