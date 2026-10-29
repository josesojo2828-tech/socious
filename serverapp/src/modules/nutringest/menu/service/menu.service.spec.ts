import { MenuService } from "./menu.service";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";

function createService() {
  const eventEmitter = { emit: jest.fn() };
  const menuRepository = {
    EVENT_CREATED: "menu.created",
    EVENT_CREATED_SUCCESS: "menu.created.success",
    EVENT_CREATED_FAILED: "menu.created.failed",
    EVENT_UPDATED: "menu.updated",
    EVENT_UPDATED_SUCCESS: "menu.updated.success",
    EVENT_UPDATED_FAILED: "menu.updated.failed",
    EVENT_DELETED: "menu.deleted",
    EVENT_DELETED_SUCCESS: "menu.deleted.success",
    EVENT_DELETED_FAILED: "menu.deleted.failed",
    MODEL_NAME: "Menu",
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
  const permitRepository = {
    CONSULTATION_LIST_OWN: "CONSULTATION_LIST_OWN",
    CONSULTATION_LIST_ALL: "CONSULTATION_LIST_ALL",
  };
  const i18n = { translate: jest.fn((s: string) => s) };
  const logger = { logInfo: jest.fn(), logError: jest.fn() };
  const dietRepository = {};
  const prisma = {
    menu: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    menuItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    menuCondiment: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    communityMetadata: {
      findUnique: jest.fn(),
    },
    assignedMenu: {
      findFirst: jest.fn(),
    },
  };
  const permissionService = { hasCommunityAccess: jest.fn().mockReturnValue(false) };
  const storageService = { uploadFile: jest.fn(), getFileUrl: jest.fn(), deleteFile: jest.fn() };
  const workspaceContext = new WorkspaceContextService();

  const service = new MenuService(
    eventEmitter as any,
    menuRepository as any,
    permitRepository as any,
    i18n as any,
    logger as any,
    dietRepository as any,
    prisma as any,
    permissionService as any,
    storageService as any,
    workspaceContext,
  );

  return {
    eventEmitter,
    menuRepository,
    permitRepository,
    i18n,
    logger,
    prisma,
    permissionService,
    storageService,
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

describe("MenuService — workspace isolation", () => {
  describe("create", () => {
    it("injects organizationId from org workspace context", async () => {
      const { menuRepository, workspaceContext, service } = createService();
      const orgId = "org-uuid-789";

      menuRepository.create.mockResolvedValue({
        id: "m1",
        organizationId: orgId,
        items: [],
      });

      const result = await workspaceContext.run(orgId, () =>
        service.create({
          data: { name: "Test Menu" },
          userSession: userSession("nut-1"),
        }),
      );

      expect(menuRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organization: { connect: { id: orgId } },
          }),
        }),
      );
    });

    it("does not set organizationId in personal workspace", async () => {
      const { menuRepository, workspaceContext, service } = createService();

      menuRepository.create.mockResolvedValue({
        id: "m2",
        organizationId: null,
        items: [],
      });

      await workspaceContext.run(null, () =>
        service.create({
          data: { name: "Personal Menu" },
          userSession: userSession("nut-1"),
        }),
      );

      const createCall = menuRepository.create.mock.calls[0][0];
      expect(createCall.data.organizationId).toBeUndefined();
    });
  });

  describe("getPaginate — workspace filtering", () => {
    it("filters by organizationId when in org workspace", async () => {
      const { menuRepository, workspaceContext, service } = createService();
      const orgId = "org-uuid-abc";

      menuRepository.findMany.mockResolvedValue([]);
      menuRepository.count.mockResolvedValue(0);

      await workspaceContext.run(orgId, () =>
        (service as any).getPaginate({ page: 1, limit: 10 }, "nut-1"),
      );

      const whereArg = menuRepository.findMany.mock.calls[0][0].where;
      expect(whereArg.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ organizationId: orgId }),
        ]),
      );
    });

    it("filters by null organizationId when in personal workspace", async () => {
      const { menuRepository, workspaceContext, service } = createService();

      menuRepository.findMany.mockResolvedValue([]);
      menuRepository.count.mockResolvedValue(0);

      await workspaceContext.run(null, () =>
        (service as any).getPaginate({ page: 1, limit: 10 }, "nut-1"),
      );

      const whereArg = menuRepository.findMany.mock.calls[0][0].where;
      expect(whereArg.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ organizationId: null }),
        ]),
      );
    });
  });
});

describe("MenuService — archive lifecycle", () => {
  const archived = new Date("2026-10-22T10:00:00.000Z");

  it("archive stamps archivedAt on an owned active menu", async () => {
    const { menuRepository, service } = createService();
    menuRepository.findOne.mockResolvedValue({ id: "m1", archivedAt: null });

    await service.archive({ id: "m1", userSession: userSession("nut-1") });

    expect(menuRepository.findOne).toHaveBeenCalledWith({
      where: { id: "m1", deletedAt: null, nutritionistId: "nut-1" },
    });
    const call = menuRepository.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "m1" });
    expect(call.data.archivedAt).toBeInstanceOf(Date);
  });

  it("archive refuses a menu that is already archived", async () => {
    const { menuRepository, service } = createService();
    menuRepository.findOne.mockResolvedValue({ id: "m1", archivedAt: archived });

    await expect(
      service.archive({ id: "m1", userSession: userSession("nut-1") }),
    ).rejects.toThrow("El menú ya está archivado.");
    expect(menuRepository.update).not.toHaveBeenCalled();
  });

  it("archive refuses a deleted or foreign menu", async () => {
    const { menuRepository, service } = createService();
    menuRepository.findOne.mockResolvedValue(null);

    await expect(
      service.archive({ id: "gone", userSession: userSession("nut-1") }),
    ).rejects.toThrow();
    expect(menuRepository.update).not.toHaveBeenCalled();
  });

  it("unarchive clears archivedAt", async () => {
    const { menuRepository, service } = createService();
    menuRepository.findOne.mockResolvedValue({ id: "m1", archivedAt: archived });

    await service.unarchive({ id: "m1", userSession: userSession("nut-1") });

    expect(menuRepository.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { archivedAt: null },
    });
  });

  it("unarchive refuses a menu that is not archived", async () => {
    const { menuRepository, service } = createService();
    menuRepository.findOne.mockResolvedValue({ id: "m1", archivedAt: null });

    await expect(
      service.unarchive({ id: "m1", userSession: userSession("nut-1") }),
    ).rejects.toThrow("El menú no está archivado.");
    expect(menuRepository.update).not.toHaveBeenCalled();
  });

  it("update only accepts menus that are neither archived nor deleted", async () => {
    const { menuRepository, service } = createService();
    menuRepository.findOne.mockResolvedValue({ id: "m1" });

    await service.update({
      id: "m1",
      data: { name: "Renamed" },
      userSession: userSession("nut-1"),
    });

    expect(menuRepository.findOne.mock.calls[0][0].where).toEqual({
      id: "m1",
      deletedAt: null,
      archivedAt: null,
      nutritionistId: "nut-1",
    });
  });

  it("delete still accepts an archived menu (mobile compatibility)", async () => {
    const { menuRepository, service } = createService();
    menuRepository.findOne.mockResolvedValue({ id: "m1", archivedAt: archived });
    menuRepository.delete.mockResolvedValue({ id: "m1" });

    await service.delete({ id: "m1", userSession: userSession("nut-1") });

    const where = menuRepository.findOne.mock.calls[0][0].where;
    expect(where).toEqual({ id: "m1", deletedAt: null, nutritionistId: "nut-1" });
    expect(menuRepository.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
  });

  it("getPaginate lists only active menus by default", async () => {
    const { menuRepository, service } = createService();
    menuRepository.findMany.mockResolvedValue([]);
    menuRepository.count.mockResolvedValue(0);

    await (service as any).getPaginate({ page: 1, limit: 10 }, "nut-1");

    const whereArg = menuRepository.findMany.mock.calls[0][0].where;
    expect(whereArg.AND).toEqual(
      expect.arrayContaining([expect.objectContaining({ archivedAt: null })]),
    );
  });

  it("getPaginate lists only archived menus when includeArchived is true", async () => {
    const { menuRepository, service } = createService();
    menuRepository.findMany.mockResolvedValue([]);
    menuRepository.count.mockResolvedValue(0);

    await (service as any).getPaginate(
      { page: 1, limit: 10, includeArchived: true },
      "nut-1",
    );

    const whereArg = menuRepository.findMany.mock.calls[0][0].where;
    expect(whereArg.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ archivedAt: { not: null } }),
      ]),
    );
  });
});
