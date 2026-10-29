import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";

// uuid resuelve a ESM puro (dist-node) que ts-jest no transforma en node_modules.
jest.mock("uuid", () => ({ v4: () => "00000000-0000-4000-8000-000000000000" }));

import { NutritionalPlanService } from "./nutritional-plan.service";
import { PLAN_DEFAULT_INCLUDE } from "../dto/nutritional-plan.type";

/**
 * S2/S8 (legal-compliance): uniquePublic solo resuelve planes
 * compartidos EXPLÍCITAMENTE (isShared=true). Sin sesión, un id crudo
 * de plan/paciente nunca expone datos clínicos.
 */
describe("NutritionalPlanService.uniquePublic", () => {
  const build = (findOne: jest.Mock) => {
    const planRepository = { findOne } as any;
    return new NutritionalPlanService(
      {} as any, // eventEmitter
      planRepository,
      {} as any, // prisma
      {} as any, // i18n
      {} as any, // logger
      {} as any, // workspaceContext
    );
  };

  it("devuelve el plan cuando llega por shareToken y está compartido", async () => {
    const plan = { id: "p1", shareToken: "tok-1", isShared: true };
    const service = build(jest.fn().mockResolvedValue(plan));

    const result = await service.uniquePublic({ id: "tok-1" });

    expect(result.object).toEqual(plan);
    expect(planRepositoryWhereArg(findOneOf(service))).toMatchObject({
      OR: [{ id: "tok-1" }, { shareToken: "tok-1" }],
      isShared: true,
    });
  });

  it("lanza NotFoundException cuando el plan existe pero NO está compartido", async () => {
    // El repositorio ya no debe devolverlo (where exige isShared),
    // pero aunque lo hiciera, el servicio no lo expone.
    const plan = { id: "p1", shareToken: null, isShared: false };
    const service = build(jest.fn().mockResolvedValue(plan));

    await expect(service.uniquePublic({ id: "p1" })).rejects.toThrow(
      NotFoundException,
    );
  });

  it("lanza NotFoundException para un patientId no compartido (fuga eliminada)", async () => {
    // Antes: fallback patientId/userId devolvía el plan activo sin compartir.
    const service = build(
      jest.fn().mockImplementation(async ({ where }: any) => {
        const clauses: any[] = where?.OR ?? [];
        const asksByPatient = clauses.some(
          (c) => c.patientId || c.patient?.userId,
        );
        return asksByPatient
          ? { id: "p9", patientId: "pat-1", isShared: false }
          : null;
      }),
    );

    await expect(service.uniquePublic({ id: "pat-1" })).rejects.toThrow(
      NotFoundException,
    );
    // Nunca consultó por patientId: el where solo admite id/shareToken.
    const firstWhere = (
      service as unknown as { planRepository: { findOne: jest.Mock } }
    ).planRepository.findOne.mock.calls[0][0].where;
    expect(firstWhere.OR).toEqual([{ id: "pat-1" }, { shareToken: "pat-1" }]);
  });

  it("un token de plan no compartido también devuelve NotFound", async () => {
    const service = build(
      jest.fn().mockResolvedValue({ id: "p2", isShared: false }),
    );
    await expect(service.uniquePublic({ id: "tok-2" })).rejects.toThrow(
      NotFoundException,
    );
  });
});

/**
 * S2 (legal-compliance): shared links must expire, be revocable and
 * record access — never live forever as a static uuid.
 */
describe("NutritionalPlanService — share token lifecycle (S2)", () => {
  const build = (prisma: Record<string, any>) => {
    return new NutritionalPlanService(
      {} as any, // eventEmitter
      {} as any, // planRepository
      prisma as any, // prisma
      {} as any, // i18n
      { debug: jest.fn() } as any, // logger
      {} as any, // workspaceContext
    );
  };

  const doctorSession = {
    id: "doctor-1",
    nutritionistProfile: { id: "nutritionist-1" },
  } as any;

  it("generateShareToken sets an expiry date (~30 days) on the plan", async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      nutritionalPlan: {
        findFirst: jest.fn().mockResolvedValue({ id: "plan-1" }),
        update,
      },
    };
    const service = build(prisma);

    await service.generateShareToken("plan-1", doctorSession);

    const data = update.mock.calls[0][0].data;
    expect(data.isShared).toBe(true);
    expect(data.shareToken).toEqual(expect.any(String));
    expect(data.shareTokenExpiresAt).toBeInstanceOf(Date);
    const days = (data.shareTokenExpiresAt.getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThanOrEqual(30);
  });

  it("revokeShareToken clears the token, unshares and stamps revokedAt", async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      nutritionalPlan: {
        findFirst: jest.fn().mockResolvedValue({ id: "plan-1" }),
        update,
      },
    };
    const service = build(prisma);

    await service.revokeShareToken("plan-1", doctorSession);

    const data = update.mock.calls[0][0].data;
    expect(data.isShared).toBe(false);
    expect(data.shareToken).toBeNull();
    expect(data.shareTokenExpiresAt).toBeNull();
    expect(data.shareTokenRevokedAt).toBeInstanceOf(Date);
  });

  it("revokeShareToken throws NotFound without write access", async () => {
    const prisma = {
      nutritionalPlan: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const service = build(prisma);

    await expect(
      service.revokeShareToken("plan-x", doctorSession),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.nutritionalPlan.update).not.toHaveBeenCalled();
  });

  it("findByShareToken rejects an expired link", async () => {
    const prisma = {
      nutritionalPlan: {
        findUnique: jest.fn().mockResolvedValue({
          id: "plan-1",
          isShared: true,
          shareTokenExpiresAt: new Date(Date.now() - 1000),
        }),
      },
      sharedLinkAccess: { create: jest.fn() },
    };
    const service = build(prisma);

    await expect(service.findByShareToken("expired-token")).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.sharedLinkAccess.create).not.toHaveBeenCalled();
  });

  it("findByShareToken records an access for a valid link", async () => {
    const prisma = {
      nutritionalPlan: {
        findUnique: jest.fn().mockResolvedValue({
          id: "plan-1",
          isShared: true,
          shareTokenExpiresAt: new Date(Date.now() + 86400000),
        }),
      },
      sharedLinkAccess: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = build(prisma);

    await service.findByShareToken("valid-token");

    expect(prisma.sharedLinkAccess.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nutritionalPlanId: "plan-1" }),
      }),
    );
  });
});

/**
 * Patient visibility: archived and soft-deleted menus and exchange lists
 * never reach the patient plan, including the shared link.
 */
function createService() {
  const eventEmitter = { emit: jest.fn() };
  const planRepository = {};
  const i18n = { translate: jest.fn((s: string) => s) };
  const logger = { logInfo: jest.fn(), logError: jest.fn(), debug: jest.fn() };
  const workspaceContext = { getWorkspaceId: jest.fn().mockReturnValue(null) };
  const prisma = {
    nutritionalPlan: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    sharedLinkAccess: { create: jest.fn().mockResolvedValue({}) },
  };

  const service = new NutritionalPlanService(
    eventEmitter as any,
    planRepository as any,
    prisma as any,
    i18n as any,
    logger as any,
    workspaceContext as any,
  );

  return {
    eventEmitter,
    planRepository,
    prisma,
    i18n,
    logger,
    workspaceContext,
    service,
  };
}

describe("NutritionalPlanService — patient visibility of archived records", () => {
  it("PLAN_DEFAULT_INCLUDE hides archived and deleted menus and exchange lists", () => {
    expect(PLAN_DEFAULT_INCLUDE).toEqual(
      expect.objectContaining({
        assignedMenus: expect.objectContaining({
          where: { menu: { archivedAt: null, deletedAt: null } },
        }),
        assignedLists: expect.objectContaining({
          where: { exchangeList: { archivedAt: null, deletedAt: null } },
        }),
      }),
    );
  });

  it("findByShareToken filters archived and deleted menus from the shared plan", async () => {
    const { prisma, service } = createService();
    prisma.nutritionalPlan.findUnique.mockResolvedValue({
      id: "plan-1",
      isShared: true,
      assignedMenus: [],
    });

    const plan = await service.findByShareToken("token-abc");

    expect(plan).toEqual({
      id: "plan-1",
      isShared: true,
      assignedMenus: [],
    });

    const include = prisma.nutritionalPlan.findUnique.mock.calls[0][0].include;
    expect(include.assignedMenus.where).toEqual({
      menu: { archivedAt: null, deletedAt: null },
    });
  });

  it("findByShareToken rejects an unknown or unshared token", async () => {
    const { prisma, service } = createService();
    prisma.nutritionalPlan.findUnique.mockResolvedValue({
      id: "plan-1",
      isShared: false,
    });

    await expect(service.findByShareToken("token-abc")).rejects.toThrow(
      "Este enlace ha expirado o no existe.",
    );
  });
});

// helpers
type RepoMock = { planRepository: { findOne: jest.Mock } };
function findOneOf(service: NutritionalPlanService) {
  return (service as unknown as RepoMock).planRepository.findOne;
}
function planRepositoryWhereArg(findOne: jest.Mock) {
  return findOne.mock.calls[0][0].where;
}
