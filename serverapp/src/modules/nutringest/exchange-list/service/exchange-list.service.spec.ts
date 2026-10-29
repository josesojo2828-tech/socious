import { ExchangeListService } from "./exchange-list.service";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";

function createService() {
  const eventEmitter = { emit: jest.fn() };
  const exchangeListRepository = {
    EVENT_CREATED: "exchange-list.created",
    EVENT_CREATED_SUCCESS: "exchange-list.created.success",
    EVENT_CREATED_FAILED: "exchange-list.created.failed",
    EVENT_UPDATED: "exchange-list.updated",
    EVENT_UPDATED_SUCCESS: "exchange-list.updated.success",
    EVENT_UPDATED_FAILED: "exchange-list.updated.failed",
    EVENT_DELETED: "exchange-list.deleted",
    EVENT_DELETED_SUCCESS: "exchange-list.deleted.success",
    EVENT_DELETED_FAILED: "exchange-list.deleted.failed",
    MODEL_NAME: "ExchangeList",
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    getColumns: jest.fn().mockReturnValue([]),
    getFormCreate: jest.fn().mockReturnValue({ inputs: [] }),
    getFormUpdate: jest.fn().mockReturnValue({ inputs: [] }),
    getFilters: jest.fn().mockReturnValue({}),
  };
  const prisma = {
    exchangeList: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    exchangeListItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    foodExchangeList: {
      findUnique: jest.fn(),
    },
    nutritionist: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const permitRepository = {};
  const i18n = { translate: jest.fn((s: string) => s) };
  const logger = { logInfo: jest.fn(), logError: jest.fn() };
  const dietRepository = {};
  const workspaceContext = new WorkspaceContextService();

  const service = new ExchangeListService(
    eventEmitter as any,
    exchangeListRepository as any,
    prisma as any,
    permitRepository as any,
    i18n as any,
    logger as any,
    dietRepository as any,
    workspaceContext,
  );

  return {
    eventEmitter,
    exchangeListRepository,
    prisma,
    permitRepository,
    i18n,
    logger,
    workspaceContext,
    service,
  };
}

function userSession(nutritionistId: string, userId = "user-1") {
  return {
    id: userId,
    firstName: "Carlos",
    lastName: "Pérez",
    email: "carlos@test.com",
    username: "carlos",
    password: "secret",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    permitId: "permit-1",
    permits: { list: [] },
    referredById: "user-0",
    referralCode: "ABC",
    nutritionistProfile: { id: nutritionistId },
  } as any;
}

describe("ExchangeListService — workspace isolation", () => {
  describe("create", () => {
    it("injects organizationId from org workspace context", async () => {
      const { exchangeListRepository, workspaceContext, service } = createService();
      const orgId = "org-uuid-def";

      exchangeListRepository.create.mockResolvedValue({
        id: "el1",
        organizationId: orgId,
      });

      await workspaceContext.run(orgId, () =>
        service.create({
          data: { name: "Test Exchange List" },
          userSession: userSession("nut-1"),
        }),
      );

      expect(exchangeListRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organization: { connect: { id: orgId } },
          }),
        }),
      );
    });

    it("does not set organizationId in personal workspace", async () => {
      const { exchangeListRepository, workspaceContext, service } = createService();

      exchangeListRepository.create.mockResolvedValue({
        id: "el2",
        organizationId: null,
      });

      await workspaceContext.run(null, () =>
        service.create({
          data: { name: "Personal List" },
          userSession: userSession("nut-1"),
        }),
      );

      const createCall = exchangeListRepository.create.mock.calls[0][0];
      expect(createCall.data.organization).toBeUndefined();
    });
  });

  describe("getPaginate — workspace filtering", () => {
    it("filters by organizationId when in org workspace", async () => {
      const { exchangeListRepository, workspaceContext, service } = createService();
      const orgId = "org-uuid-ghi";

      exchangeListRepository.findMany.mockResolvedValue([]);
      exchangeListRepository.count.mockResolvedValue(0);

      await workspaceContext.run(orgId, () =>
        (service as any).getPaginate({ page: 1, limit: 10 }, "nut-1"),
      );

      const whereArg = exchangeListRepository.findMany.mock.calls[0][0].where;
      expect(whereArg.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ organizationId: orgId }),
        ]),
      );
    });

    it("filters by null organizationId when in personal workspace", async () => {
      const { exchangeListRepository, workspaceContext, service } = createService();

      exchangeListRepository.findMany.mockResolvedValue([]);
      exchangeListRepository.count.mockResolvedValue(0);

      await workspaceContext.run(null, () =>
        (service as any).getPaginate({ page: 1, limit: 10 }, "nut-1"),
      );

      const whereArg = exchangeListRepository.findMany.mock.calls[0][0].where;
      expect(whereArg.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ organizationId: null }),
        ]),
      );
    });
  });

  describe("ensureNutritionistProfile", () => {
    it("returns existing nutritionistProfile from userSession without database query", async () => {
      const { prisma, service } = createService();
      const session = userSession("nut-123");

      const result = await service.ensureNutritionistProfile(session);

      expect(result).toEqual({ id: "nut-123" });
      expect(prisma.nutritionist.findUnique).not.toHaveBeenCalled();
      expect(prisma.nutritionist.create).not.toHaveBeenCalled();
    });

    it("finds existing profile in DB when missing from userSession", async () => {
      const { prisma, service } = createService();
      const session = { id: "user-456", nutritionistProfile: null } as any;

      prisma.nutritionist.findUnique.mockResolvedValue({ id: "nut-found", userId: "user-456" });

      const result = await service.ensureNutritionistProfile(session);

      expect(result).toEqual({ id: "nut-found", userId: "user-456" });
      expect(session.nutritionistProfile).toEqual({ id: "nut-found", userId: "user-456" });
      expect(prisma.nutritionist.create).not.toHaveBeenCalled();
    });

    it("auto-provisions profile when missing from userSession and not found in DB", async () => {
      const { prisma, service } = createService();
      const session = { id: "user-789", nutritionistProfile: null } as any;

      prisma.nutritionist.findUnique.mockResolvedValueOnce(null);
      prisma.nutritionist.create.mockResolvedValue({ id: "nut-created", userId: "user-789" });

      const result = await service.ensureNutritionistProfile(session);

      expect(result).toEqual({ id: "nut-created", userId: "user-789" });
      expect(prisma.nutritionist.create).toHaveBeenCalledWith({
        data: { userId: "user-789" },
      });
      expect(session.nutritionistProfile).toEqual({ id: "nut-created", userId: "user-789" });
    });
  });
});


describe("ExchangeListService — archive lifecycle", () => {
  const archived = new Date("2026-10-22T10:00:00.000Z");

  it("archive stamps archivedAt on an owned active list", async () => {
    const { exchangeListRepository, service } = createService();
    exchangeListRepository.findOne.mockResolvedValue({ id: "el1", archivedAt: null });

    await service.archive({ id: "el1", userSession: userSession("nut-1") });

    expect(exchangeListRepository.findOne).toHaveBeenCalledWith({
      where: { id: "el1", deletedAt: null, nutritionistId: "nut-1" },
    });
    const call = exchangeListRepository.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "el1" });
    expect(call.data.archivedAt).toBeInstanceOf(Date);
  });

  it("archive refuses a list that is already archived", async () => {
    const { exchangeListRepository, service } = createService();
    exchangeListRepository.findOne.mockResolvedValue({ id: "el1", archivedAt: archived });

    await expect(
      service.archive({ id: "el1", userSession: userSession("nut-1") }),
    ).rejects.toThrow("La lista de intercambio ya está archivada.");
    expect(exchangeListRepository.update).not.toHaveBeenCalled();
  });

  it("archive refuses a deleted or foreign list", async () => {
    const { exchangeListRepository, service } = createService();
    exchangeListRepository.findOne.mockResolvedValue(null);

    await expect(
      service.archive({ id: "gone", userSession: userSession("nut-1") }),
    ).rejects.toThrow();
    expect(exchangeListRepository.update).not.toHaveBeenCalled();
  });

  it("unarchive clears archivedAt", async () => {
    const { exchangeListRepository, service } = createService();
    exchangeListRepository.findOne.mockResolvedValue({ id: "el1", archivedAt: archived });

    await service.unarchive({ id: "el1", userSession: userSession("nut-1") });

    expect(exchangeListRepository.update).toHaveBeenCalledWith({
      where: { id: "el1" },
      data: { archivedAt: null },
    });
  });

  it("unarchive refuses a list that is not archived", async () => {
    const { exchangeListRepository, service } = createService();
    exchangeListRepository.findOne.mockResolvedValue({ id: "el1", archivedAt: null });

    await expect(
      service.unarchive({ id: "el1", userSession: userSession("nut-1") }),
    ).rejects.toThrow("La lista de intercambio no está archivada.");
    expect(exchangeListRepository.update).not.toHaveBeenCalled();
  });

  it("update only accepts lists that are neither archived nor deleted", async () => {
    const { exchangeListRepository, service } = createService();
    exchangeListRepository.findOne.mockResolvedValue({ id: "el1" });
    exchangeListRepository.update.mockResolvedValue({ id: "el1" });

    await service.update({
      id: "el1",
      data: { name: "Renamed" },
      userSession: userSession("nut-1"),
    });

    expect(exchangeListRepository.findOne.mock.calls[0][0].where).toEqual({
      id: "el1",
      deletedAt: null,
      archivedAt: null,
      nutritionistId: "nut-1",
    });
  });

  it("delete still accepts an archived list (mobile compatibility)", async () => {
    const { exchangeListRepository, service } = createService();
    exchangeListRepository.findOne.mockResolvedValue({ id: "el1", archivedAt: archived });
    exchangeListRepository.delete.mockResolvedValue({ id: "el1" });

    await service.delete({ id: "el1", userSession: userSession("nut-1") });

    const where = exchangeListRepository.findOne.mock.calls[0][0].where;
    expect(where).toEqual({ id: "el1", deletedAt: null, nutritionistId: "nut-1" });
    expect(exchangeListRepository.delete).toHaveBeenCalledWith({ where: { id: "el1" } });
  });

  it("getPaginate lists only active lists by default", async () => {
    const { exchangeListRepository, service } = createService();
    exchangeListRepository.findMany.mockResolvedValue([]);
    exchangeListRepository.count.mockResolvedValue(0);

    await (service as any).getPaginate({ page: 1, limit: 10 }, "nut-1");

    const whereArg = exchangeListRepository.findMany.mock.calls[0][0].where;
    expect(whereArg.AND).toEqual(
      expect.arrayContaining([expect.objectContaining({ archivedAt: null })]),
    );
  });

  it("getPaginate lists only archived lists when includeArchived is true", async () => {
    const { exchangeListRepository, service } = createService();
    exchangeListRepository.findMany.mockResolvedValue([]);
    exchangeListRepository.count.mockResolvedValue(0);

    await (service as any).getPaginate(
      { page: 1, limit: 10, includeArchived: true },
      "nut-1",
    );

    const whereArg = exchangeListRepository.findMany.mock.calls[0][0].where;
    expect(whereArg.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ archivedAt: { not: null } }),
      ]),
    );
  });
});
