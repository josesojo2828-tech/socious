import { ForbiddenException } from "@nestjs/common";
import { ActivityController } from "./activity.controller";

/**
 * S6 (legal-compliance): the `x-workspace-id` header must NEVER let a tenant
 * read another organization's data.
 *
 * The rule (shared with the entitlement service and the dashboard controller):
 *  - ADMIN / SUPERADMIN (global role): the header is honored as-is.
 *  - Any other caller: the requested organization is honored ONLY when the
 *    caller has an ACTIVE `OrganizationMember` row there. A foreign
 *    organization id degrades to the caller's OWN ACTIVE membership
 *    organization and never reaches a query.
 */
type Member = { organizationId: string; userId: string; status: string };

const makeController = (members: Member[]) => {
  const activityService = {
    getUserActivity: jest.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getGlobalFeed: jest.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getActivityStats: jest.fn().mockResolvedValue({}),
  };
  const workspaceContext = { getWorkspaceId: jest.fn().mockReturnValue(null) };
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

  const controller = new ActivityController(
    activityService as any,
    workspaceContext as any,
    prisma as any,
  );

  return { controller, activityService, prisma, queries };
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

describe("ActivityController — x-workspace-id tenant isolation (S6)", () => {
  it("resolves the OWN membership org when the header points to a foreign org", async () => {
    const { controller, activityService, queries } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    await controller.getGlobalFeed(
      request("NUTRITIONIST", { "x-workspace-id": "org-OTHER" }),
    );

    const [filters] = activityService.getGlobalFeed.mock.calls[0];
    expect(filters.organizationId).toBe("org-MINE");
    expect(filters.organizationId).not.toBe("org-OTHER");
    // The foreign organization id never reaches the data query, and every
    // membership lookup stays scoped to the caller.
    expect(queries.every((q) => q.userId === "u1")).toBe(true);
  });

  it("REJECTS a tenant whose foreign header has no membership at all (never global)", async () => {
    const { controller, activityService, queries } = makeController([]);

    await expect(
      controller.getGlobalFeed(
        request("NUTRITIONIST", { "x-workspace-id": "org-OTHER" }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(activityService.getGlobalFeed).not.toHaveBeenCalled();
    expect(queries.every((q) => q.userId === "u1")).toBe(true);
  });

  it("keeps the requested org when the caller IS an ACTIVE member of it", async () => {
    const { controller, activityService } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    await controller.getGlobalFeed(
      request("NUTRITIONIST", { "x-workspace-id": "org-MINE" }),
    );

    const [filters] = activityService.getGlobalFeed.mock.calls[0];
    expect(filters.organizationId).toBe("org-MINE");
  });

  it("does not honor an org whose only membership is INACTIVE", async () => {
    const { controller, activityService, queries } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "INACTIVE" },
    ]);

    await expect(
      controller.getGlobalFeed(
        request("NUTRITIONIST", { "x-workspace-id": "org-MINE" }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(activityService.getGlobalFeed).not.toHaveBeenCalled();
    expect(queries.every((q) => q.userId === "u1")).toBe(true);
  });

  it("keeps the platform-global behavior for ADMIN / SUPERADMIN", async () => {
    const { controller, activityService, queries } = makeController([]);

    await controller.getGlobalFeed(
      request("ADMIN", { "x-workspace-id": "org-OTHER" }),
    );

    const [filters] = activityService.getGlobalFeed.mock.calls[0];
    expect(filters.organizationId).toBe("org-OTHER");
    // A global role needs no membership row.
    expect(queries).toHaveLength(0);
  });

  it("falls back to the own membership org when no header is present", async () => {
    const { controller, activityService } = makeController([
      { organizationId: "org-MINE", userId: "u1", status: "ACTIVE" },
    ]);

    await controller.getGlobalFeed(request("CLINIC_ADMIN"));

    const [filters] = activityService.getGlobalFeed.mock.calls[0];
    expect(filters.organizationId).toBe("org-MINE");
  });
});
