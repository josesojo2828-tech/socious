/**
 * Phase 7 (integration/unit) — cross-tenant isolation for activity reads.
 *
 * NOTE: there is NO test runner installed in this project yet (`node_modules`
 * absent), so this spec is authored but CANNOT be executed in Phase 4. It is
 * written now to be runnable once the runner is available (task 7.2).
 */
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ActivityController } from "./activity.controller";

const makeController = (opts?: {
  workspaceId?: string | null;
  membership?: { organizationId: string } | null;
}) => {
  const activityService = {
    getUserActivity: jest.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getGlobalFeed: jest.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getActivityStats: jest.fn().mockResolvedValue({}),
  };
  const workspaceContext = {
    getWorkspaceId: jest.fn().mockReturnValue(opts?.workspaceId ?? null),
  };
  const prisma = {
    organizationMember: {
      // S6: the membership lookup is scoped to the organization being
      // resolved — a caller without an ACTIVE membership there is not
      // authorized for it (the tenant cases below declare their own row).
      findFirst: jest.fn(async ({ where }: any) => {
        const membership = opts?.membership ?? null;
        if (!membership) return null;
        if (
          where.organizationId &&
          where.organizationId !== membership.organizationId
        ) {
          return null;
        }
        return membership;
      }),
    },
  };

  const controller = new ActivityController(
    activityService as any,
    workspaceContext as any,
    prisma as any,
  );

  return { controller, activityService, workspaceContext, prisma };
};

const makeRequest = (
  permitName: string,
  headers: Record<string, string> = {},
): any => ({
  user: {
    id: "user-1",
    email: "user@test.dev",
    permits: { name: permitName },
  },
  headers,
});

describe("ActivityController — Phase 4 org scoping (cross-tenant isolation)", () => {
  describe("tenant callers (non SUPERADMIN/ADMIN)", () => {
    it("scopes the feed to the x-workspace-id resolved from context", async () => {
      const { controller, activityService } = makeController({
        workspaceId: "org-a",
        membership: { organizationId: "org-a" },
      });

      await controller.getGlobalFeed(
        makeRequest("NUTRITIONIST", { "x-workspace-id": "org-a" }),
        undefined,
        20,
      );

      expect(activityService.getGlobalFeed).toHaveBeenCalledTimes(1);
      const [filters] = activityService.getGlobalFeed.mock.calls[0];
      expect(filters.organizationId).toBe("org-a");
    });

    it("falls back to the active membership org when no workspace is present", async () => {
      const { controller, activityService } = makeController({
        workspaceId: null,
        membership: { organizationId: "org-membership" },
      });

      await controller.getStats(makeRequest("CLINIC_ADMIN"));

      const [filters] = activityService.getActivityStats.mock.calls[0];
      expect(filters.organizationId).toBe("org-membership");
    });

    it("REJECTS a tenant when no organization can be resolved (never global)", async () => {
      const { controller, activityService } = makeController({
        workspaceId: null,
        membership: null,
      });

      await expect(
        controller.getUserActivity(makeRequest("NUTRITIONIST"), "user-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(activityService.getUserActivity).not.toHaveBeenCalled();
    });

    it("never forwards a null/undefined org to tenant reads", async () => {
      const { controller, activityService } = makeController({
        workspaceId: "org-a",
        membership: { organizationId: "org-a" },
      });

      await controller.getUserActivity(
        makeRequest("NUTRITIONIST", { "x-workspace-id": "org-a" }),
        "user-1",
      );

      const [, , , , organizationId] =
        activityService.getUserActivity.mock.calls[0];
      expect(organizationId).toBe("org-a");
      expect(organizationId).not.toBeNull();
    });

    it("isolates org A from org B — each call is scoped to its own org", async () => {
      const orgA = makeController({
        workspaceId: "org-a",
        membership: { organizationId: "org-a" },
      });
      const orgB = makeController({
        workspaceId: "org-b",
        membership: { organizationId: "org-b" },
      });

      await orgA.controller.getGlobalFeed(
        makeRequest("NUTRITIONIST", { "x-workspace-id": "org-a" }),
      );
      await orgB.controller.getGlobalFeed(
        makeRequest("NUTRITIONIST", { "x-workspace-id": "org-b" }),
      );

      expect(
        orgA.activityService.getGlobalFeed.mock.calls[0][0].organizationId,
      ).toBe("org-a");
      expect(
        orgB.activityService.getGlobalFeed.mock.calls[0][0].organizationId,
      ).toBe("org-b");
    });
  });

  describe("global callers (SUPERADMIN/ADMIN)", () => {
    it("allows a global read with no workspace (null-org rows included)", async () => {
      const { controller, activityService } = makeController({
        workspaceId: null,
        membership: null,
      });

      await controller.getStats(makeRequest("SUPERADMIN"));

      const [filters] = activityService.getActivityStats.mock.calls[0];
      expect(filters.organizationId).toBeUndefined();
    });

    it("scopes a global read when a workspace header is provided", async () => {
      const { controller, activityService } = makeController({
        workspaceId: "org-a",
      });

      await controller.getGlobalFeed(
        makeRequest("ADMIN", { "x-workspace-id": "org-a" }),
      );

      const [filters] = activityService.getGlobalFeed.mock.calls[0];
      expect(filters.organizationId).toBe("org-a");
    });

    it("marks the feed as GLOBAL (undefined org) when no workspace is present", async () => {
      const { controller, activityService } = makeController({
        workspaceId: null,
        membership: null,
      });

      await controller.getGlobalFeed(makeRequest("SUPERADMIN"));

      const [filters] = activityService.getGlobalFeed.mock.calls[0];
      expect(filters.organizationId).toBeUndefined();
    });
  });

  describe("guard rails", () => {
    it("rejects an unauthenticated request defensively", async () => {
      const { controller } = makeController({});
      const request = { user: undefined, headers: {} } as any;

      await expect(
        controller.getStats(request),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
