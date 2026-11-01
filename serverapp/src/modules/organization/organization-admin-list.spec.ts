import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { OrganizationController } from "./organization.controller";
import { OrganizationService } from "./organization.service";

/**
 * Platform-wide organization list for the admin panel.
 *
 * `GET /api/organizations` answers every non-deleted organization with its
 * ACTIVE org subscription plan and its ACTIVE module grants (shaped as
 * `{ id, moduleKey, status }` so the BRANCHES admin screen can toggle it).
 * Global roles only (SUPERADMIN/ADMIN) — same rule as
 * `GET /api/dashboard/platform-stats`.
 */

const makePrisma = (orgs: any[] = []) => ({
  organization: {
    findMany: jest.fn().mockResolvedValue(orgs),
  },
});

const makeService = (orgs: any[] = []) => {
  const prisma = makePrisma(orgs);
  const service = new OrganizationService(prisma as any, {} as any, {} as any);
  return { service, prisma };
};

describe("OrganizationService.listAllForAdmin", () => {
  it("maps each row to { id, name, slug, status, plan, grants }", async () => {
    const { service } = makeService([
      {
        id: "org-1",
        name: "Clínica Norte",
        slug: "clinica-norte",
        status: "ACTIVE",
        subscriptions: [{ plan: { id: "PREMIUM", name: "Premium" } }],
        moduleGrants: [
          {
            id: "grant-1",
            status: "ACTIVE",
            module: { key: "BRANCHES" },
          },
        ],
      },
    ]);

    const result = await service.listAllForAdmin();

    expect(result).toEqual([
      {
        id: "org-1",
        name: "Clínica Norte",
        slug: "clinica-norte",
        status: "ACTIVE",
        plan: { id: "PREMIUM", name: "Premium" },
        grants: [{ id: "grant-1", moduleKey: "BRANCHES", status: "ACTIVE" }],
      },
    ]);
  });

  it("answers plan null when the organization has no active subscription", async () => {
    const { service } = makeService([
      {
        id: "org-1",
        name: "Sin plan",
        slug: "sin-plan",
        status: "ACTIVE",
        subscriptions: [],
        moduleGrants: [],
      },
    ]);

    const result = await service.listAllForAdmin();

    expect(result[0].plan).toBeNull();
    expect(result[0].grants).toEqual([]);
  });

  it("skips soft-deleted organizations", async () => {
    const { service, prisma } = makeService([]);

    await service.listAllForAdmin();

    expect(prisma.organization.findMany.mock.calls[0][0].where).toEqual({
      deletedAt: null,
    });
  });
});

describe("OrganizationController.listAll (global roles only)", () => {
  const makeController = () => {
    const service = {
      listAllForAdmin: jest.fn().mockResolvedValue([]),
    } as unknown as OrganizationService;
    const controller = new OrganizationController(service);
    return { controller, service };
  };

  it("rejects non-global roles with 403", async () => {
    const { controller } = makeController();
    const req = { user: { permits: { name: "NUTRITIONIST" } } } as any;

    await expect(controller.listAll(req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("rejects anonymous requests with 401 (SessionAuthGuard is the first wall)", async () => {
    const { controller } = makeController();
    const req = { user: null } as any;

    await expect(controller.listAll(req)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("answers the mapped list for SUPERADMIN", async () => {
    const { controller, service } = makeController();
    const rows = [
      {
        id: "org-1",
        name: "Clínica Norte",
        slug: "clinica-norte",
        status: "ACTIVE",
        plan: null,
        grants: [],
      },
    ];
    (service.listAllForAdmin as jest.Mock).mockResolvedValue(rows);
    const req = { user: { permits: { name: "SUPERADMIN" } } } as any;

    await expect(controller.listAll(req)).resolves.toEqual(rows);
    expect(service.listAllForAdmin).toHaveBeenCalledTimes(1);
  });
});
