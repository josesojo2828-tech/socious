import { describe, expect, it } from "vitest";
import {
  isNutritionist,
  normalizePathname,
  resolveTour,
  resolveTourRoute,
} from "./tour-routes";

describe("resolveTourRoute — exact dashboard route allowlist", () => {
  it("matches the dashboard root only", () => {
    expect(resolveTourRoute("/dashboard")).toEqual({
      kind: "dashboard",
      storageKey: "nutringest.dashboard.tour.v1",
    });
  });

  it("matches the profile route with its own tour", () => {
    expect(resolveTourRoute("/dashboard/profile")).toEqual({
      kind: "profile",
      storageKey: "nutringest.profile.tour.v1",
    });
  });

  it("matches the wallet route with its own tour", () => {
    expect(resolveTourRoute("/dashboard/wallet")).toEqual({
      kind: "wallet",
      storageKey: "nutringest.wallet.tour.v1",
    });
  });

  it("does NOT leak the dashboard tour into dashboard subroutes", () => {
    for (const route of [
      "/dashboard/adoption",
      "/dashboard/patients",
      "/dashboard/patients/123",
      "/dashboard/profile/security",
      "/dashboard/analytics",
      "/dashboard/crud",
      "/dashboard/[entity]",
      "/dashboard/foods",
      "/dashboard/marketplace/wallet",
      "/dashboard/wallets",
    ]) {
      expect(resolveTourRoute(route), route).toBeNull();
    }
  });

  it("does not inherit tours by prefix (profile/wallet subroutes are null)", () => {
    expect(resolveTourRoute("/dashboard/profile/payments")).toBeNull();
    expect(resolveTourRoute("/dashboard/wallet/history")).toBeNull();
  });

  it("tolerates trailing slashes and query/hash", () => {
    expect(resolveTourRoute("/dashboard/")?.kind).toBe("dashboard");
    expect(resolveTourRoute("/dashboard/profile/")?.kind).toBe("profile");
    expect(resolveTourRoute("/dashboard?tab=1")?.kind).toBe("dashboard");
    expect(resolveTourRoute("/dashboard/profile#bio")?.kind).toBe("profile");
  });

  it("returns null for empty/unknown pathnames", () => {
    expect(resolveTourRoute("")).toBeNull();
    expect(resolveTourRoute(null)).toBeNull();
    expect(resolveTourRoute(undefined)).toBeNull();
    expect(resolveTourRoute("/")).toBeNull();
    expect(resolveTourRoute("/login")).toBeNull();
  });
});

describe("resolveTour — role gate for the dashboard tour", () => {
  const nutritionist = { permits: { name: "USER" } };
  const admin = { permits: { name: "ADMIN" } };
  const superadmin = { permits: { name: "SUPERADMIN" } };
  const patient = { permits: { name: "PATIENT" } };
  const clinicAdmin = { permits: { name: "CLINIC_ADMIN" } };
  const clinicStaff = { permits: { name: "CLINIC_STAFF" } };
  const clinic = { permits: { name: "CLINIC" } };

  it("lets a nutritionist (USER permit) run the dashboard tour", () => {
    expect(resolveTour("/dashboard", nutritionist)).toEqual({
      kind: "dashboard",
      storageKey: "nutringest.dashboard.tour.v1",
    });
  });

  it("accepts a NUTRITIONIST permit defensively", () => {
    expect(resolveTour("/dashboard", { permits: { name: "NUTRITIONIST" } })?.kind).toBe(
      "dashboard",
    );
  });

  it("blocks ADMIN and SUPERADMIN from the dashboard tour", () => {
    expect(resolveTour("/dashboard", admin)).toBeNull();
    expect(resolveTour("/dashboard", superadmin)).toBeNull();
  });

  it("blocks PATIENT and clinic roles from the dashboard tour", () => {
    expect(resolveTour("/dashboard", patient)).toBeNull();
    expect(resolveTour("/dashboard", clinicAdmin)).toBeNull();
    expect(resolveTour("/dashboard", clinicStaff)).toBeNull();
    expect(resolveTour("/dashboard", clinic)).toBeNull();
  });

  it("blocks the dashboard tour without a resolved permit", () => {
    expect(resolveTour("/dashboard", null)).toBeNull();
    expect(resolveTour("/dashboard", undefined)).toBeNull();
    expect(resolveTour("/dashboard", {})).toBeNull();
    expect(resolveTour("/dashboard", { permits: null })).toBeNull();
    expect(resolveTour("/dashboard", { permits: {} })).toBeNull();
  });

  it("does NOT role-gate the profile and wallet tours", () => {
    expect(resolveTour("/dashboard/profile", admin)?.kind).toBe("profile");
    expect(resolveTour("/dashboard/wallet", patient)?.kind).toBe("wallet");
    expect(resolveTour("/dashboard/profile", null)?.kind).toBe("profile");
  });

  it("still returns null for non-tour routes regardless of role", () => {
    expect(resolveTour("/dashboard/patients", nutritionist)).toBeNull();
    expect(resolveTour("/dashboard/adoption", admin)).toBeNull();
  });
});

describe("resolveTour — clinic workspace gate for the dashboard tour", () => {
  const nutritionist = { permits: { name: "USER" } };

  it("hides the dashboard tour for a nutritionist inside a clinic workspace", () => {
    expect(resolveTour("/dashboard", nutritionist, true)).toBeNull();
  });

  it("shows the dashboard tour for a nutritionist in a personal workspace", () => {
    expect(resolveTour("/dashboard", nutritionist, false)?.kind).toBe("dashboard");
    expect(resolveTour("/dashboard", nutritionist)?.kind).toBe("dashboard");
  });

  it("does NOT gate the profile/wallet tours by workspace", () => {
    expect(resolveTour("/dashboard/profile", nutritionist, true)?.kind).toBe("profile");
    expect(resolveTour("/dashboard/wallet", nutritionist, true)?.kind).toBe("wallet");
  });
});

describe("isNutritionist", () => {
  it("is true only for nutritionist permits", () => {
    expect(isNutritionist({ permits: { name: "USER" } })).toBe(true);
    expect(isNutritionist({ permits: { name: "NUTRITIONIST" } })).toBe(true);
  });

  it("is false for admins, patients, clinic roles and missing permits", () => {
    expect(isNutritionist({ permits: { name: "SUPERADMIN" } })).toBe(false);
    expect(isNutritionist({ permits: { name: "ADMIN" } })).toBe(false);
    expect(isNutritionist({ permits: { name: "PATIENT" } })).toBe(false);
    expect(isNutritionist({ permits: { name: "CLINIC_ADMIN" } })).toBe(false);
    expect(isNutritionist({ permits: { name: "CLINIC_STAFF" } })).toBe(false);
    expect(isNutritionist({ permits: { name: "CLINIC" } })).toBe(false);
    expect(isNutritionist(null)).toBe(false);
    expect(isNutritionist({})).toBe(false);
  });
});

describe("normalizePathname", () => {
  it("strips trailing slashes and keeps a leading slash", () => {
    expect(normalizePathname("/dashboard/")).toBe("/dashboard");
    expect(normalizePathname("/dashboard///")).toBe("/dashboard");
    expect(normalizePathname("")).toBe("");
  });
});
