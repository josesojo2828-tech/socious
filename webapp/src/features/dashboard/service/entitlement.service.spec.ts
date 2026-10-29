import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * W2/W3 — `entitlementService` module-framework surface.
 *
 * `ModulesTab` talks to the backend through these wrappers, which delegate to
 * `moduleService` (the single `/api/modules` client). The webapp vitest runner
 * has no React renderer, so the tab cannot be mounted; this pins the delegation
 * path the tab relies on (assign with optional expiry + revoke).
 */
const mocks = vi.hoisted(() => ({
  listCatalog: vi.fn(),
  listGrants: vi.fn(),
  assign: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("@/features/modules/service/module.service", () => ({
  moduleService: {
    listCatalog: mocks.listCatalog,
    listGrants: mocks.listGrants,
    assign: mocks.assign,
    revoke: mocks.revoke,
  },
  isModuleGrantActive: vi.fn(),
}));

import { entitlementService } from "./entitlement.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("entitlementService — module-framework delegation", () => {
  it("listModules delegates to moduleService.listCatalog", async () => {
    mocks.listCatalog.mockResolvedValue([]);
    await entitlementService.listModules();
    expect(mocks.listCatalog).toHaveBeenCalledTimes(1);
  });

  it("listModuleGrants forwards the owner query", async () => {
    mocks.listGrants.mockResolvedValue([]);
    await entitlementService.listModuleGrants({ userId: "user-1" });
    expect(mocks.listGrants).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("assignModule forwards the payload (with optional expiry)", async () => {
    mocks.assign.mockResolvedValue({ id: "grant-1" });
    const payload = {
      moduleKey: "ATTENDANCE_CONTROL",
      userId: "user-1",
      expiresAt: "2026-12-31T00:00:00.000Z",
    };
    await entitlementService.assignModule(payload);
    expect(mocks.assign).toHaveBeenCalledWith(payload);
  });

  it("revokeModule forwards the grant id", async () => {
    mocks.revoke.mockResolvedValue({ id: "grant-1", status: "REVOKED" });
    await entitlementService.revokeModule("grant-1");
    expect(mocks.revoke).toHaveBeenCalledWith("grant-1");
  });
});
