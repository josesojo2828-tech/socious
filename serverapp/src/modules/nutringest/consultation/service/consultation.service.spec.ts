import { ConsultationService } from "./consultation.service";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";

function createService() {
  const eventEmitter = { emit: jest.fn() };
  const consultationRepository = {
    EVENT_CREATED: "consultation.created",
    EVENT_CREATED_SUCCESS: "consultation.created.success",
    EVENT_CREATED_FAILED: "consultation.created.failed",
    EVENT_UPDATED: "consultation.updated",
    EVENT_UPDATED_SUCCESS: "consultation.updated.success",
    EVENT_UPDATED_FAILED: "consultation.updated.failed",
    EVENT_DELETED: "consultation.deleted",
    EVENT_DELETED_SUCCESS: "consultation.deleted.success",
    EVENT_DELETED_FAILED: "consultation.deleted.failed",
    MODEL_NAME: "Consultation",
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
    CONSULTATION_UNIQUE: "CONSULTATION_UNIQUE",
    CONSULTATION_CREATED: "CONSULTATION_CREATED",
    CONSULTATION_UPDATE: "CONSULTATION_UPDATE",
    CONSULTATION_DELETE: "CONSULTATION_DELETE",
  };
  const i18n = { translate: jest.fn((s: string) => s) };
  const logger = { logInfo: jest.fn(), logError: jest.fn() };
  const workspaceContext = new WorkspaceContextService();

  const service = new ConsultationService(
    eventEmitter as any,
    consultationRepository as any,
    permitRepository as any,
    i18n as any,
    logger as any,
    workspaceContext,
  );

  return {
    eventEmitter,
    consultationRepository,
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

describe("ConsultationService — workspace isolation", () => {
  describe("create", () => {
    it("injects organizationId from org workspace context", async () => {
      const { consultationRepository, workspaceContext, service } = createService();
      const orgId = "org-uuid-123";

      workspaceContext.run(orgId, () => {});

      consultationRepository.create.mockResolvedValue({
        id: "c1",
        organizationId: orgId,
      });

      const result = await workspaceContext.run(orgId, () =>
        service.create({
          data: { patientId: "p1", scheduledAt: new Date(), type: "FOLLOW_UP" },
          userSession: userSession("nut-1"),
        }),
      );

      expect(consultationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
        }),
      );
      expect(result.organizationId).toBe(orgId);
    });

    it("injects null organizationId in personal workspace", async () => {
      const { consultationRepository, workspaceContext, service } = createService();

      workspaceContext.run(null, () => {});

      consultationRepository.create.mockResolvedValue({
        id: "c2",
        organizationId: null,
      });

      const result = await workspaceContext.run(null, () =>
        service.create({
          data: { patientId: "p1", scheduledAt: new Date(), type: "FOLLOW_UP" },
          userSession: userSession("nut-1"),
        }),
      );

      expect(consultationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: null,
        }),
      );
      expect(result.organizationId).toBeNull();
    });
  });

  describe("getPaginate — workspace filtering", () => {
    it("filters by organizationId when in org workspace", async () => {
      const { consultationRepository, workspaceContext, service } = createService();
      const orgId = "org-uuid-456";

      consultationRepository.findMany.mockResolvedValue([]);
      consultationRepository.count.mockResolvedValue(0);

      await workspaceContext.run(orgId, () =>
        (service as any).getPaginate(
          { page: 1, limit: 10 },
          "nut-1",
          userSession("nut-1"),
        ),
      );

      const whereArg = consultationRepository.findMany.mock.calls[0][0].where;
      expect(whereArg.organizationId).toBe(orgId);
    });

    it("filters by null organizationId when in personal workspace", async () => {
      const { consultationRepository, workspaceContext, service } = createService();

      consultationRepository.findMany.mockResolvedValue([]);
      consultationRepository.count.mockResolvedValue(0);

      await workspaceContext.run(null, () =>
        (service as any).getPaginate(
          { page: 1, limit: 10 },
          "nut-1",
          userSession("nut-1"),
        ),
      );

      const whereArg = consultationRepository.findMany.mock.calls[0][0].where;
      expect(whereArg.organizationId).toBeNull();
    });
  });
});
