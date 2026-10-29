import { ForbiddenException } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";

/**
 * Phase 6 (task 6.2) — adoption endpoint gating (the 5 scenarios from Phase 4).
 *
 * Contract under test (`resolveAdoptionScope`):
 * 1. Org member with `PERMIT_DASHBOARD` + workspace header -> org read (200).
 * 2. Missing dashboard permit on an org read -> 403.
 * 3. Global scope denied to a tenant role -> 403.
 * 4. Global scope allowed by `SUPERADMIN`/`ADMIN` role -> global read (200).
 * 5. Tenant without a resolvable org -> 403, and NEVER an implicit global fallback.
 *
 * The controller is constructed with its FULL constructor arity
 * (`dashboardService`, `adminAnalyticsService`, `userDetailService`,
 * `adoptionAnalyticsService`, `prisma`, `entitlementService`): the adoption
 * gate resolves entitlements through the entitlement service and the
 * organization through the shared `OrganizationScopeService`, so both
 * dependencies must be real.
 *
 * The organization is resolved with the shared rule (S6): a requested
 * organization is honored ONLY with an ACTIVE `OrganizationMember` row;
 * otherwise the caller's own ACTIVE membership organization, else the
 * personal context (never a foreign organization, never an implicit global).
 */
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = "user-1";

type Permits = { name: string; list: string[] };
type Member = { organizationId: string; userId: string; status: string };

const request = (permits: Permits, headers: Record<string, string> = {}) =>
  ({
    user: { id: USER_ID, email: "u@x.com", permits },
    headers,
  }) as any;

/** The org member used by the happy-path scenarios. */
const activeMember: Member = {
  organizationId: ORG_A,
  userId: USER_ID,
  status: "ACTIVE",
};

const makeController = (members: Member[] = [activeMember]) => {
  const dashboardService = { getSidebarSections: jest.fn(), getTabs: jest.fn(), getUserTabs: jest.fn() };
  const adminAnalyticsService = { getDashboardStats: jest.fn(), getOfficeLocations: jest.fn() };
  const userDetailService = { getUserDetail: jest.fn() };
  const adoptionAnalyticsService = {
    getActiveUsers: jest.fn().mockResolvedValue({ dau: 1 }),
    getActiveUsersGlobal: jest.fn().mockResolvedValue({ dau: 2 }),
    getDormantUsers: jest.fn().mockResolvedValue({}),
    getDormantUsersGlobal: jest.fn().mockResolvedValue({}),
    getCohortRetention: jest.fn().mockResolvedValue({}),
    getCohortRetentionGlobal: jest.fn().mockResolvedValue({}),
    getClinicalFunnel: jest.fn().mockResolvedValue({}),
    getClinicalFunnelGlobal: jest.fn().mockResolvedValue({}),
    getFeatureDepth: jest.fn().mockResolvedValue({}),
    getFeatureDepthGlobal: jest.fn().mockResolvedValue({}),
  };
  // The membership rows the shared organization-scope rule reads.
  const prisma = {
    organizationMember: {
      findFirst: jest.fn(async ({ where }: any) => {
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
  // The entitlements the adoption gate checks for `PERMIT_DASHBOARD`; they
  // mirror the permits carried by the authenticated user.
  const entitlementService = {
    resolve: jest.fn(async (_userId: string, _workspaceId: string | null, user?: any) => ({
      permissions: user?.permits?.list ?? [],
      modules: [],
    })),
  };

  const controller = new DashboardController(
    dashboardService as any,
    adminAnalyticsService as any,
    userDetailService as any,
    adoptionAnalyticsService as any,
    prisma as any,
    entitlementService as any,
  );
  return { controller, adoptionAnalyticsService, prisma, entitlementService };
};

const orgMember: Permits = { name: "CLINIC", list: ["PERMIT_DASHBOARD"] };
const noPermit: Permits = { name: "USER", list: ["PATIENT_LIST_OWN"] };
const admin: Permits = { name: "ADMIN", list: ["PERMIT_DASHBOARD"] };
const superadmin: Permits = { name: "SUPERADMIN", list: ["PERMIT_DASHBOARD"] };

describe("DashboardController adoption gating (task 6.2)", () => {
  it("1. org member with PERMIT_DASHBOARD + workspace header gets org data", async () => {
    const { controller, adoptionAnalyticsService } = makeController();

    await controller.getAdoptionActiveUsers(
      request(orgMember, { "x-workspace-id": ORG_A }),
      undefined,
      "UTC",
    );

    expect(adoptionAnalyticsService.getActiveUsers).toHaveBeenCalledWith(
      ORG_A,
      { tz: "UTC" },
    );
    expect(adoptionAnalyticsService.getActiveUsersGlobal).not.toHaveBeenCalled();
  });

  it("2. org read without the dashboard permit -> 403", async () => {
    const { controller, adoptionAnalyticsService } = makeController();

    await expect(
      controller.getAdoptionActiveUsers(
        request(noPermit, { "x-workspace-id": ORG_A }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(adoptionAnalyticsService.getActiveUsers).not.toHaveBeenCalled();
  });

  it("3. global scope denied to a tenant role -> 403", async () => {
    const { controller, adoptionAnalyticsService } = makeController();

    await expect(
      controller.getAdoptionActiveUsers(
        request(orgMember, { "x-workspace-id": ORG_A }),
        "global",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(adoptionAnalyticsService.getActiveUsersGlobal).not.toHaveBeenCalled();
  });

  it("4. global scope allowed by ADMIN role -> global data", async () => {
    const { controller, adoptionAnalyticsService } = makeController();

    await controller.getAdoptionActiveUsers(request(admin), "global");

    expect(adoptionAnalyticsService.getActiveUsersGlobal).toHaveBeenCalledTimes(1);
    expect(adoptionAnalyticsService.getActiveUsers).not.toHaveBeenCalled();
  });

  it("4b. global scope allowed by SUPERADMIN role -> global data", async () => {
    const { controller, adoptionAnalyticsService } = makeController();

    await controller.getAdoptionActiveUsers(request(superadmin), "global");

    expect(adoptionAnalyticsService.getActiveUsersGlobal).toHaveBeenCalledTimes(1);
  });

  it("5. tenant without a resolvable org -> 403 and NEVER an implicit global fallback", async () => {
    // No membership row at all: the scope resolves to the personal context.
    const { controller, adoptionAnalyticsService } = makeController([]);

    await expect(
      controller.getAdoptionActiveUsers(request(orgMember)),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(adoptionAnalyticsService.getActiveUsers).not.toHaveBeenCalled();
    expect(adoptionAnalyticsService.getActiveUsersGlobal).not.toHaveBeenCalled();
  });

  it("5b. tenant whose only membership is INACTIVE -> 403", async () => {
    const { controller, adoptionAnalyticsService } = makeController([
      { organizationId: ORG_A, userId: USER_ID, status: "INACTIVE" },
    ]);

    await expect(
      controller.getAdoptionActiveUsers(
        request(orgMember, { "x-workspace-id": ORG_A }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(adoptionAnalyticsService.getActiveUsers).not.toHaveBeenCalled();
    expect(adoptionAnalyticsService.getActiveUsersGlobal).not.toHaveBeenCalled();
  });

  it("admin asking for org scope without a workspace header -> 403 (explicit scope)", async () => {
    const { controller, adoptionAnalyticsService } = makeController();

    await expect(
      controller.getAdoptionActiveUsers(request(admin), "org"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(adoptionAnalyticsService.getActiveUsers).not.toHaveBeenCalled();
    expect(adoptionAnalyticsService.getActiveUsersGlobal).not.toHaveBeenCalled();
  });

  it("applies the same gating to funnel and depth routes", async () => {
    const { controller, adoptionAnalyticsService } = makeController();

    await controller.getAdoptionFunnel(
      request(orgMember, { "x-workspace-id": ORG_A }),
    );
    await controller.getAdoptionDepth(request(admin), "global");

    expect(adoptionAnalyticsService.getClinicalFunnel).toHaveBeenCalledWith(ORG_A);
    expect(adoptionAnalyticsService.getFeatureDepthGlobal).toHaveBeenCalledTimes(1);

    await expect(
      controller.getAdoptionFunnel(request(noPermit, { "x-workspace-id": ORG_A })),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // The global scope is reserved for the global roles on every adoption route.
    await expect(
      controller.getAdoptionDepth(request(orgMember, { "x-workspace-id": ORG_A }), "global"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(adoptionAnalyticsService.getFeatureDepth).not.toHaveBeenCalled();
  });
});
