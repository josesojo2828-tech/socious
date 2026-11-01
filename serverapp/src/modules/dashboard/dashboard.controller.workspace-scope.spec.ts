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
 *
 * Probed through the sidebar endpoint (the old stats probe was replaced by
 * /platform-stats, a global-role-only read with no org scope — covered at the
 * end of this file by its own describe).
 */
type Member = { organizationId: string; userId: string; status: string };

const makeController = (members: Member[]) => {
  const dashboardService = {
    getSidebarSections: jest.fn(),
    getTabs: jest.fn(),
    getUserTabs: jest.fn(),
  };
  const userDetailService = { getUserDetail: jest.fn() };
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
    organization: { count: jest.fn(async () => 7) },
    user: { count: jest.fn(async () => 42) },
    subscription: {
      findMany: jest.fn(async () => [
        {
          plan: { id: "BASICO", name: "Básico", price: 9.99 },
        },
      ]),
    },
  };

  const controller = new DashboardController(
    dashboardService as any,
    userDetailService as any,
    prisma as any,
    entitlementService as any,
  );

  return { controller, prisma, queries, dashboardService };
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

/** The sidebar endpoint funnels every request through getOrganizationId. */
const probeSidebar = async (controller: DashboardController, req: any) =>
  await (controller as unknown as { sidebar: (r: any) => Promise<unknown> })
    .sidebar(req);

const sidebarCall = (dashboardService: { getSidebarSections: jest.Mock }) =>
  dashboardService.getSidebarSections.mock.calls[0]?.[0] as
    | { organizationId?: string | null }
    | undefined;

describe("DashboardController — x-workspace-id tenant isolation (S6)", () => {
  it("resolves the OWN membership org when the header points to a foreign org", async () => {
    const { controller, dashboardService, queries } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    await probeSidebar(
      controller,
      request("USER", { "x-workspace-id": "org-OTHER" }),
    );

    expect(sidebarCall(dashboardService)?.organizationId).toBe("org-MINE");
    expect(sidebarCall(dashboardService)?.organizationId).not.toBe(
      "org-OTHER",
    );
    expect(queries.every((q) => q.userId === "u1")).toBe(true);
  });

  it("degrades a foreign header to the personal context when the caller has no membership", async () => {
    const { controller, dashboardService, queries } = makeController([]);

    await probeSidebar(
      controller,
      request("USER", { "x-workspace-id": "org-OTHER" }),
    );

    // Never the foreign org: unresolved → personal (null) context.
    expect(sidebarCall(dashboardService)?.organizationId).toBeNull();
    expect(queries.every((q) => q.userId === "u1")).toBe(true);
  });

  it("keeps the requested org when the caller IS an ACTIVE member of it", async () => {
    const { controller, dashboardService } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    await probeSidebar(
      controller,
      request("USER", { "x-workspace-id": "org-MINE" }),
    );

    expect(sidebarCall(dashboardService)?.organizationId).toBe("org-MINE");
  });

  it("does not honor an org whose only membership is INACTIVE", async () => {
    const { controller, dashboardService, queries } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "INACTIVE" },
    ]);

    await probeSidebar(
      controller,
      request("USER", { "x-workspace-id": "org-MINE" }),
    );

    expect(sidebarCall(dashboardService)?.organizationId).toBeNull();
    expect(queries.every((q) => q.userId === "u1")).toBe(true);
  });

  it("keeps the platform-global behavior for ADMIN / SUPERADMIN", async () => {
    const { controller, dashboardService, queries } = makeController([]);

    await probeSidebar(
      controller,
      request("ADMIN", { "x-workspace-id": "org-OTHER" }),
    );

    // A global role needs no membership row and the header is honored as-is.
    expect(sidebarCall(dashboardService)?.organizationId).toBe("org-OTHER");
    expect(queries).toHaveLength(0);
  });

  it("falls back to the own membership org when no header is present", async () => {
    const { controller, dashboardService } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    await probeSidebar(controller, request("CLINIC_ADMIN"));

    expect(sidebarCall(dashboardService)?.organizationId).toBe("org-MINE");
  });
});

/**
 * The analytics rewrite: /platform-stats replaces the nutrition-era stats
 * read with real platform counts, available to GLOBAL ROLES ONLY (there is
 * no organization scope to leak — a tenant never reaches the aggregates).
 */
describe("DashboardController — /platform-stats (ERP analytics)", () => {
  it("rejects non-global callers", async () => {
    const { controller } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    await expect(
      controller.getPlatformStats(request("USER")),
    ).rejects.toThrow(ForbiddenException);
  });

  it("returns real platform counts for a global role", async () => {
    const { controller } = makeController([]);

    const stats = await controller.getPlatformStats(request("ADMIN"));

    expect(stats).toEqual({
      organizations: 7,
      users: 42,
      activeSubscriptions: 1,
      mrrUSD: 9.99,
      plans: [
        { planId: "BASICO", name: "Básico", priceUSD: 9.99, count: 1 },
      ],
    });
  });
});
