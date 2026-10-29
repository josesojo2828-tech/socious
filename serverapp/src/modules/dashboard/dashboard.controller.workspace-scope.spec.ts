import { ForbiddenException } from "@nestjs/common";

import { DashboardController } from "./dashboard.controller";

/**
 * S6 (legal-compliance): the `x-workspace-id` header must NEVER let a tenant
 * read another organization's data.
 *
 * The rule (shared with the entitlement service and the activity controller):
 *  - ADMIN / SUPERADMIN (global role): the header is honored as-is.
 *  - Any other caller: the requested organization is honored ONLY when the
 *    caller has an ACTIVE `OrganizationMember` row there. A foreign
 *    organization id degrades to the caller's OWN ACTIVE membership
 *    organization (or the personal context) and never reaches a query.
 */
type Member = { organizationId: string; userId: string; status: string };

const makeController = (members: Member[]) => {
  const dashboardService = {
    getSidebarSections: jest.fn(),
    getTabs: jest.fn(),
    getUserTabs: jest.fn(),
  };
  const adminAnalyticsService = {
    getDashboardStats: jest.fn().mockResolvedValue({}),
    getOfficeLocations: jest.fn().mockResolvedValue([]),
  };
  const userDetailService = { getUserDetail: jest.fn() };
  const adoptionAnalyticsService = {
    getActiveUsers: jest.fn(),
    getActiveUsersGlobal: jest.fn(),
    getDormantUsers: jest.fn(),
    getDormantUsersGlobal: jest.fn(),
    getCohortRetention: jest.fn(),
    getCohortRetentionGlobal: jest.fn(),
    getClinicalFunnel: jest.fn(),
    getClinicalFunnelGlobal: jest.fn(),
    getFeatureDepth: jest.fn(),
    getFeatureDepthGlobal: jest.fn(),
  };
  const entitlementService = {
    resolve: jest.fn().mockResolvedValue({ permissions: [], modules: [] }),
  };
  const queries: any[] = [];
  const prisma = {
    organizationMember: {
      findFirst: jest.fn(async ({ where }: any) => {
        queries.push(where);
        const rows = members.filter(
          (m) =>
            (!where.organizationId ||
              m.organizationId === where.organizationId) &&
            (!where.userId || m.userId === where.userId) &&
            (!where.status || m.status === where.status),
        );
        return rows[0] ?? null;
      }),
    },
  };

  const controller = new DashboardController(
    dashboardService as any,
    adminAnalyticsService as any,
    userDetailService as any,
    adoptionAnalyticsService as any,
    prisma as any,
    entitlementService as any,
  );

  return { controller, adminAnalyticsService, prisma, queries };
};

const request = (permitName: string, headers: Record<string, string> = {}) =>
  ({
    user: {
      id: "u1",
      email: "u@x.dev",
      permits: { name: permitName },
    },
    headers,
  }) as any;

describe("DashboardController — x-workspace-id tenant isolation (S6)", () => {
  it("resolves the OWN membership org when the header points to a foreign org", async () => {
    const { controller, adminAnalyticsService, queries } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    await controller.getStatsJson(
      request("NUTRITIONIST", { "x-workspace-id": "org-OTHER" }),
    );

    expect(adminAnalyticsService.getDashboardStats).toHaveBeenCalledWith(
      "org-MINE",
    );
    expect(adminAnalyticsService.getDashboardStats).not.toHaveBeenCalledWith(
      "org-OTHER",
    );
    // The foreign organization id never reaches the data query, and every
    // membership lookup stays scoped to the caller.
    expect(queries.every((q) => q.userId === "u1")).toBe(true);
  });

  it("never lets a foreign header reach the query when the caller has no membership", async () => {
    const { controller, adminAnalyticsService, queries } = makeController([]);

    // T26: a null organization on this endpoint means platform-wide, so a
    // tenant without membership is rejected instead of reading it.
    await expect(
      controller.getStatsJson(
        request("NUTRITIONIST", { "x-workspace-id": "org-OTHER" }),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(adminAnalyticsService.getDashboardStats).not.toHaveBeenCalled();
    expect(queries.every((q) => q.userId === "u1")).toBe(true);
  });

  it("keeps the requested org when the caller IS an ACTIVE member of it", async () => {
    const { controller, adminAnalyticsService } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    await controller.getStatsJson(
      request("NUTRITIONIST", { "x-workspace-id": "org-MINE" }),
    );

    expect(adminAnalyticsService.getDashboardStats).toHaveBeenCalledWith(
      "org-MINE",
    );
  });

  it("does not honor an org whose only membership is INACTIVE", async () => {
    const { controller, adminAnalyticsService, queries } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "INACTIVE" },
    ]);

    await expect(
      controller.getStatsJson(
        request("NUTRITIONIST", { "x-workspace-id": "org-MINE" }),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(adminAnalyticsService.getDashboardStats).not.toHaveBeenCalled();
    expect(queries.every((q) => q.userId === "u1")).toBe(true);
  });

  it("keeps the platform-global behavior for ADMIN / SUPERADMIN", async () => {
    const { controller, adminAnalyticsService, queries } = makeController([]);

    await controller.getStatsJson(
      request("ADMIN", { "x-workspace-id": "org-OTHER" }),
    );

    expect(adminAnalyticsService.getDashboardStats).toHaveBeenCalledWith(
      "org-OTHER",
    );
    // A global role needs no membership row.
    expect(queries).toHaveLength(0);
  });

  it("falls back to the own membership org when no header is present", async () => {
    const { controller, adminAnalyticsService } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    await controller.getStatsJson(request("CLINIC_ADMIN"));

    expect(adminAnalyticsService.getDashboardStats).toHaveBeenCalledWith(
      "org-MINE",
    );
  });
});

/**
 * T26 (security-hardening-followups): on the stats endpoint a null
 * organization means PLATFORM-WIDE, not "the caller's personal scope". A
 * tenant without a resolvable organization must therefore be rejected instead
 * of receiving platform-wide statistics.
 */
describe("DashboardController — stats scope (T26)", () => {
  it("rejects a tenant with no resolvable organization instead of returning platform-wide stats", async () => {
    const { controller, adminAnalyticsService } = makeController([]);

    await expect(
      controller.getStatsJson(
        request("NUTRITIONIST", { "x-workspace-id": "org-OTHER" }),
      ),
    ).rejects.toThrow(ForbiddenException);

    // The platform-wide read must never be reached by a tenant.
    expect(adminAnalyticsService.getDashboardStats).not.toHaveBeenCalled();
  });

  it("rejects a tenant whose only membership is INACTIVE", async () => {
    const { controller, adminAnalyticsService } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "INACTIVE" },
    ]);

    await expect(
      controller.getStatsJson(
        request("NUTRITIONIST", { "x-workspace-id": "org-MINE" }),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(adminAnalyticsService.getDashboardStats).not.toHaveBeenCalled();
  });

  it("keeps platform-wide stats available for ADMIN / SUPERADMIN", async () => {
    const { controller, adminAnalyticsService } = makeController([]);

    await controller.getStatsJson(request("ADMIN"));

    expect(adminAnalyticsService.getDashboardStats).toHaveBeenCalledWith(null);
  });

  it("scopes a tenant with an ACTIVE membership to its own organization", async () => {
    const { controller, adminAnalyticsService } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    await controller.getStatsJson(request("CLINIC_ADMIN"));

    expect(adminAnalyticsService.getDashboardStats).toHaveBeenCalledWith(
      "org-MINE",
    );
  });
});
