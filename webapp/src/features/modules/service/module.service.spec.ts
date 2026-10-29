import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * W2/W3 — module-framework assignment surface (`ModulesTab` / entitlement
 * service module methods).
 *
 * The webapp vitest runner exists (`vitest run`, `environment: "node"`) but has
 * NO React renderer (no @testing-library/react, no jsdom), so `ModulesTab.tsx`
 * cannot be mounted. The closest feasible layer is the API client the tab
 * drives: `moduleService` is where the assign-with/without-expiry payload and
 * the revoke URL are actually built. `apiClient` is mocked and its calls are
 * asserted.
 */
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/shared/api/api.client", () => ({
  apiClient: {
    get: mocks.get,
    post: mocks.post,
    delete: mocks.delete,
  },
}));

import {
  isModuleGrantActive,
  moduleService,
  type ModuleCatalogEntry,
  type ModuleGrant,
} from "./module.service";

const CATALOG: ModuleCatalogEntry = {
  id: "module-1",
  key: "ATTENDANCE_CONTROL",
  name: "Asistencia",
  description: null,
  icon: "calendar",
  category: null,
  scopes: ["TENANT", "ADMIN"],
  operatorPermit: null,
  dashboardKind: null,
  active: true,
  sortOrder: 0,
};

const makeGrant = (overrides: Partial<ModuleGrant> = {}): ModuleGrant => ({
  id: "grant-1",
  moduleId: "module-1",
  userId: "user-1",
  organizationId: null,
  source: "MANUAL",
  entitlementId: null,
  status: "ACTIVE",
  grantedAt: "2026-06-01T00:00:00.000Z",
  expiresAt: null,
  grantedById: "admin-1",
  module: CATALOG,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("moduleService — catalog & grants reads", () => {
  it("GET /api/modules returns the catalog and defaults to [] when empty", async () => {
    mocks.get.mockResolvedValueOnce({ data: [CATALOG] });
    await expect(moduleService.listCatalog()).resolves.toEqual([CATALOG]);
    expect(mocks.get).toHaveBeenCalledWith("/api/modules");

    mocks.get.mockResolvedValueOnce({ data: null });
    await expect(moduleService.listCatalog()).resolves.toEqual([]);
  });

  it("GET /api/modules/grants forwards the owner query as params", async () => {
    mocks.get.mockResolvedValueOnce({ data: [makeGrant()] });

    await expect(
      moduleService.listGrants({ userId: "user-1" }),
    ).resolves.toHaveLength(1);
    expect(mocks.get).toHaveBeenCalledWith("/api/modules/grants", {
      params: { userId: "user-1" },
    });
  });
});

describe("moduleService — assign (W2)", () => {
  it("POST /api/modules/grants sends the owner and the optional expiry", async () => {
    mocks.post.mockResolvedValueOnce({
      data: makeGrant({ expiresAt: "2026-12-31T00:00:00.000Z" }),
    });

    const result = await moduleService.assign({
      moduleKey: "ATTENDANCE_CONTROL",
      userId: "user-1",
      expiresAt: "2026-12-31T00:00:00.000Z",
    });

    expect(mocks.post).toHaveBeenCalledWith("/api/modules/grants", {
      moduleKey: "ATTENDANCE_CONTROL",
      userId: "user-1",
      expiresAt: "2026-12-31T00:00:00.000Z",
    });
    expect(result.expiresAt).toBe("2026-12-31T00:00:00.000Z");
  });

  it("omits expiresAt when the expiry is left empty (no-expiry assignment)", async () => {
    mocks.post.mockResolvedValueOnce({ data: makeGrant() });

    await moduleService.assign({
      moduleKey: "ATTENDANCE_CONTROL",
      userId: "user-1",
      expiresAt: undefined,
    });

    const [, payload] = mocks.post.mock.calls[0];
    expect(payload).toEqual({
      moduleKey: "ATTENDANCE_CONTROL",
      userId: "user-1",
      expiresAt: undefined,
    });
  });
});

describe("moduleService — revoke (W3)", () => {
  it("DELETE /api/modules/grants/:id revokes by grant id", async () => {
    mocks.delete.mockResolvedValueOnce({
      data: makeGrant({ status: "REVOKED" }),
    });

    const result = await moduleService.revoke("grant-1");

    expect(mocks.delete).toHaveBeenCalledWith("/api/modules/grants/grant-1");
    expect(result.status).toBe("REVOKED");
  });
});

describe("isModuleGrantActive — mirrors the backend `vigente` predicate", () => {
  it("is true for an ACTIVE grant without expiry", () => {
    expect(
      isModuleGrantActive({ status: "ACTIVE", expiresAt: null }),
    ).toBe(true);
  });

  it("is true for an ACTIVE grant expiring in the future", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isModuleGrantActive({ status: "ACTIVE", expiresAt: future })).toBe(
      true,
    );
  });

  it("is false for an ACTIVE grant already expired", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isModuleGrantActive({ status: "ACTIVE", expiresAt: past })).toBe(
      false,
    );
  });

  it("is false for a REVOKED grant regardless of expiry", () => {
    expect(
      isModuleGrantActive({ status: "REVOKED", expiresAt: null }),
    ).toBe(false);
  });

  it("treats an unparseable expiry as non-expiring", () => {
    expect(
      isModuleGrantActive({ status: "ACTIVE", expiresAt: "not-a-date" }),
    ).toBe(true);
  });
});
