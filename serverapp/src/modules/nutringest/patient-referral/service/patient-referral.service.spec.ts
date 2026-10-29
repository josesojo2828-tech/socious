import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import {
  PatientNutritionistRole,
  PatientReferralStatus,
  ReferralType,
} from "@prisma/client";
import { User } from "src/shared/types/schema.types";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import PatientReferralModel from "../model/patient-referral.model";
import {
  CreateReferralDto,
  RespondReferralDto,
  AddCollaboratorDto,
  InviteCollaboratorDto,
} from "../dto/patient-referral.dto";
import { PatientReferralService } from "./patient-referral.service";

class TestModel extends PatientReferralModel {}

const EVENTS = new TestModel();

const NUT_FROM = "nut-from";
const NUT_TO = "nut-to";
const PATIENT_ID = "patient-1";
const REFERRAL_ID = "referral-1";

function userSession(nutritionistId: string, userId = "user-1"): User {
  return {
    id: userId,
    firstName: "Ana",
    lastName: "Pérez",
    email: "ana@test.com",
    username: "ana",
    password: "secret",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    permitId: "permit-1",
    permits: { list: [] },
    referredById: "user-0",
    referralCode: "ABC",
    nutritionistProfile: { id: nutritionistId },
  } as unknown as User;
}

function userWithoutNutritionist(): User {
  return { ...userSession(NUT_FROM), nutritionistProfile: null } as unknown as User;
}

function patientWith(
  memberships: Array<{ nutritionistId: string; isActive: boolean; role: PatientNutritionistRole }>,
): any {
  return {
    id: PATIENT_ID,
    firstName: "Juan",
    lastName: "Gómez",
    email: "juan@test.com",
    nutritionists: memberships,
  };
}

function activeMembership(
  nutritionistId: string,
  role: PatientNutritionistRole = PatientNutritionistRole.PRIMARY,
) {
  return { nutritionistId, isActive: true, role };
}

function referral(overrides: Partial<any> = {}): any {
  return {
    id: REFERRAL_ID,
    patientId: PATIENT_ID,
    fromNutritionistId: NUT_FROM,
    toNutritionistId: NUT_TO,
    status: PatientReferralStatus.PENDING,
    type: ReferralType.TRANSFER,
    message: null,
    responseMessage: null,
    respondedById: null,
    createdAt: new Date(),
    respondedAt: null,
    ...overrides,
  };
}

function createdView(overrides: Partial<any> = {}): any {
  return {
    id: REFERRAL_ID,
    patientId: PATIENT_ID,
    fromNutritionistId: NUT_FROM,
    toNutritionistId: NUT_TO,
    status: PatientReferralStatus.PENDING,
    ...overrides,
  };
}

function createDto(overrides: Partial<CreateReferralDto> = {}): CreateReferralDto {
  return {
    patientId: PATIENT_ID,
    toNutritionistId: NUT_TO,
    message: "contexto del referido",
    ...overrides,
  } as CreateReferralDto;
}

function respondDto(): RespondReferralDto {
  return { responseMessage: "gracias por el referido" };
}

function addCollaboratorDto(
  overrides: Partial<AddCollaboratorDto> = {},
): AddCollaboratorDto {
  return {
    nutritionistId: NUT_TO,
    message: "bienvenida al equipo",
    ...overrides,
  } as AddCollaboratorDto;
}

function inviteCollaboratorDto(
  overrides: Partial<InviteCollaboratorDto> = {},
): InviteCollaboratorDto {
  return {
    email: "colega@test.com",
    message: "te invito a colaborar",
    ...overrides,
  } as InviteCollaboratorDto;
}

function teamMember(overrides: Partial<any> = {}): any {
  return {
    id: "membership-1",
    patientId: PATIENT_ID,
    nutritionistId: NUT_TO,
    role: PatientNutritionistRole.SUPPORT,
    isActive: true,
    assignedById: NUT_FROM,
    assignedAt: new Date(),
    nutritionist: { id: NUT_TO },
    assignedBy: { id: NUT_FROM },
    ...overrides,
  };
}

function createService() {
  const prisma = {
    patient: { findUnique: jest.fn() },
    patientNutritionist: { findFirst: jest.fn() },
    patientReferral: { findUnique: jest.fn() },
    nutritionist: { findUnique: jest.fn() },
    user: { findMany: jest.fn() },
  };
  const referralRepository = {
    ...EVENTS,
    create: jest.fn(),
    update: jest.fn(),
    accept: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    findActiveTeamMembers: jest.fn(),
    findMembership: jest.fn(),
    countActivePrimaries: jest.fn(),
    updateMembershipRole: jest.fn(),
    deactivateMembership: jest.fn(),
    createMembership: jest.fn(),
    reactivateMembership: jest.fn(),
    count: jest.fn(),
  };
  const eventEmitter = { emit: jest.fn() };
  const logger = { logInfo: jest.fn(), logError: jest.fn() };
  const userService = { findOneByEmail: jest.fn() };
  const workspaceContext = { getWorkspaceId: jest.fn().mockReturnValue(null) };

  const service = new PatientReferralService(
    prisma as any,
    referralRepository as any,
    eventEmitter as any,
    logger as any,
    userService as any,
    workspaceContext as any,
  );

  return {
    prisma,
    referralRepository,
    eventEmitter,
    logger,
    userService,
    workspaceContext,
    service,
  };
}

function emittedActions(eventEmitter: { emit: jest.Mock }): string[] {
  return eventEmitter.emit.mock.calls.map((call) => call[0]);
}

describe("PatientReferralService", () => {
  describe("request", () => {
    it("happy path: crea un referido PENDING con from/to correctos y emite los eventos de dominio", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      prisma.patientNutritionist.findFirst.mockResolvedValue(null);
      const created = createdView();
      referralRepository.create.mockResolvedValue(created);

      const result = await service.request({
        dto: createDto(),
        userSession: userSession(NUT_FROM),
      });

      expect(prisma.patient.findUnique).toHaveBeenCalledWith({
        where: { id: PATIENT_ID },
        include: { nutritionists: true },
      });
      expect(prisma.patientNutritionist.findFirst).toHaveBeenCalledWith({
        where: { patientId: PATIENT_ID, nutritionistId: NUT_TO, isActive: true },
      });
      expect(referralRepository.create).toHaveBeenCalledWith({
        data: {
          message: "contexto del referido",
          status: PatientReferralStatus.PENDING,
          type: ReferralType.TRANSFER,
          patient: { connect: { id: PATIENT_ID } },
          fromNutritionist: { connect: { id: NUT_FROM } },
          toNutritionist: { connect: { id: NUT_TO } },
        },
      });
      expect(result).toBe(created);

      expect(emittedActions(eventEmitter)).toEqual([
        EVENTS.EVENT_CREATED,
        EVENTS.EVENT_CREATED_SUCCESS,
      ]);
    });

    it("emite el payload del evento previo con dto + userId", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      prisma.patientNutritionist.findFirst.mockResolvedValue(null);
      referralRepository.create.mockResolvedValue(createdView());

      await service.request({ dto: createDto(), userSession: userSession(NUT_FROM, "user-42") });

      const prevPayload = eventEmitter.emit.mock.calls[0][1].payload;
      expect(prevPayload).toMatchObject({
        patientId: PATIENT_ID,
        toNutritionistId: NUT_TO,
        userId: "user-42",
      });
    });

    it.each([
      ["sin membresías", []],
      [
        "membresía inactiva",
        [{ nutritionistId: NUT_FROM, isActive: false, role: PatientNutritionistRole.PRIMARY }],
      ],
      [
        "membresía SUPPORT (primaryOnly deniega)",
        [activeMembership(NUT_FROM, PatientNutritionistRole.SUPPORT)],
      ],
    ])(
      "guard (a): lanza ForbiddenException cuando el requirente no es PRIMARY activo — %s",
      async (_label, memberships) => {
        const { prisma, referralRepository, eventEmitter, service } = createService();
        prisma.patient.findUnique.mockResolvedValue(patientWith(memberships));

        await expect(
          service.request({ dto: createDto(), userSession: userSession(NUT_FROM) }),
        ).rejects.toThrow(ForbiddenException);

        expect(prisma.patientNutritionist.findFirst).not.toHaveBeenCalled();
        expect(referralRepository.create).not.toHaveBeenCalled();
        expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.EVENT_CREATED_FAILED, expect.anything());
      },
    );

    it("guard (a): lanza ForbiddenException cuando el paciente no existe en nutritionists", async () => {
      const { prisma, eventEmitter, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(patientWith([]));

      await expect(
        service.request({ dto: createDto(), userSession: userSession(NUT_FROM) }),
      ).rejects.toThrow(ForbiddenException);

      expect(emittedActions(eventEmitter).sort().join(",")).toBe(
        [EVENTS.EVENT_CREATED, EVENTS.EVENT_CREATED_FAILED].sort().join(","),
      );
    });

    it("guard (b): lanza BadRequestException cuando el destinatario ya es miembro activo", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      prisma.patientNutritionist.findFirst.mockResolvedValue(
        activeMembership(NUT_TO, PatientNutritionistRole.SUPPORT),
      );

      await expect(
        service.request({ dto: createDto(), userSession: userSession(NUT_FROM) }),
      ).rejects.toThrow(BadRequestException);

      expect(referralRepository.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.EVENT_CREATED_FAILED, expect.anything());
    });

    it("guard (c): lanza BadRequestException cuando to == from", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      prisma.patientNutritionist.findFirst.mockResolvedValue(null);

      await expect(
        service.request({ dto: createDto({ toNutritionistId: NUT_FROM }), userSession: userSession(NUT_FROM) }),
      ).rejects.toThrow(BadRequestException);

      expect(referralRepository.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.EVENT_CREATED_FAILED, expect.anything());
    });

    it("lanza EntityNotFound cuando el paciente no existe", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.request({ dto: createDto(), userSession: userSession(NUT_FROM) }),
      ).rejects.toThrow(EntityNotFoundException);

      expect(referralRepository.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.EVENT_CREATED_FAILED, expect.anything());
    });

    it("lanza ForbiddenException cuando la sesión no tiene perfil de nutricionista", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();

      await expect(
        service.request({ dto: createDto(), userSession: userWithoutNutritionist() }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.patient.findUnique).not.toHaveBeenCalled();
      expect(referralRepository.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe("searchPremiumNutritionists", () => {
    function premiumUser(
      nutritionistId: string,
      email = "premium@test.com",
    ): any {
      return {
        id: "user-x",
        firstName: "Premium",
        lastName: "User",
        email,
        nutritionistProfile: { id: nutritionistId },
      };
    }

    it("devuelve solo nutricionistas PREMIUM, excluye al actor y usa el shape correcto", async () => {
      const { prisma, service } = createService();
      prisma.user.findMany.mockResolvedValue([
        premiumUser("nut-premium", "ana@premium.com"),
        premiumUser("nut-pro", "bob@premium.com"),
      ]);

      const result = await service.searchPremiumNutritionists({
        email: "pre",
        userSession: userSession(NUT_FROM),
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { contains: "pre", mode: "insensitive" },
            subscriptions: {
              some: {
                status: "ACTIVE",
                plan: { name: { in: ["PREMIUM", "Clínica"] } },
              },
            },
            NOT: { nutritionistProfile: { is: { id: NUT_FROM } } },
          }),
          take: 10,
        }),
      );
      expect(result).toEqual([
        { id: "nut-premium", email: "ana@premium.com", fullName: "Premium User" },
        { id: "nut-pro", email: "bob@premium.com", fullName: "Premium User" },
      ]);
    });

    it("devuelve [] (sin query) cuando el prefijo tiene menos de 3 caracteres", async () => {
      const { prisma, service } = createService();

      for (const prefix of ["", "a", "ab"]) {
        const result = await service.searchPremiumNutritionists({
          email: prefix,
          userSession: userSession(NUT_FROM),
        });
        expect(result).toEqual([]);
      }

      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it("lanza ForbiddenException cuando la sesión no tiene perfil de nutricionista", async () => {
      const { prisma, service } = createService();

      await expect(
        service.searchPremiumNutritionists({
          email: "pre",
          userSession: userWithoutNutritionist(),
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe("inviteCollaborator", () => {
    function premiumUser(
      nutritionistId: string,
      overrides: Partial<any> = {},
    ): any {
      return {
        id: "user-target",
        email: "colega@test.com",
        nutritionistProfile: { id: nutritionistId },
        subscriptions: [
          { status: "ACTIVE", plan: { name: "PREMIUM" } },
        ],
        ...overrides,
      };
    }

    it("happy path: crea un referido PENDING COLLABORATOR con toNutritionistId resuelto por email y emite los eventos", async () => {
      const {
        prisma,
        referralRepository,
        eventEmitter,
        userService,
        service,
      } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      prisma.patientNutritionist.findFirst.mockResolvedValue(null);
      userService.findOneByEmail.mockResolvedValue(premiumUser(NUT_TO));
      const created = createdView({ type: ReferralType.COLLABORATOR });
      referralRepository.create.mockResolvedValue(created);

      const result = await service.inviteCollaborator({
        patientId: PATIENT_ID,
        dto: inviteCollaboratorDto(),
        userSession: userSession(NUT_FROM),
      });

      expect(userService.findOneByEmail).toHaveBeenCalledWith("colega@test.com");
      expect(referralRepository.create).toHaveBeenCalledWith({
        data: {
          message: "te invito a colaborar",
          status: PatientReferralStatus.PENDING,
          type: ReferralType.COLLABORATOR,
          patient: { connect: { id: PATIENT_ID } },
          fromNutritionist: { connect: { id: NUT_FROM } },
          toNutritionist: { connect: { id: NUT_TO } },
        },
      });
      expect(result).toBe(created);
      expect(emittedActions(eventEmitter)).toEqual([
        EVENTS.EVENT_CREATED,
        EVENTS.EVENT_CREATED_SUCCESS,
      ]);
    });

    it("lanza ForbiddenException cuando el actor no es PRIMARY activo (antes de resolver el email)", async () => {
      const { prisma, userService, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.SUPPORT)]),
      );

      await expect(
        service.inviteCollaborator({
          patientId: PATIENT_ID,
          dto: inviteCollaboratorDto(),
          userSession: userSession(NUT_FROM),
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(userService.findOneByEmail).not.toHaveBeenCalled();
    });

    it("lanza ForbiddenException (403) cuando el destinatario no tiene plan PREMIUM/Clínica activo", async () => {
      const { prisma, userService, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      userService.findOneByEmail.mockResolvedValue(
        premiumUser(NUT_TO, {
          subscriptions: [{ status: "ACTIVE", plan: { name: "PRO" } }],
        }),
      );

      await expect(
        service.inviteCollaborator({
          patientId: PATIENT_ID,
          dto: inviteCollaboratorDto(),
          userSession: userSession(NUT_FROM),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lanza EntityNotFoundException (404) cuando el email no existe o no tiene perfil de nutricionista", async () => {
      const { prisma, userService, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );

      userService.findOneByEmail.mockResolvedValueOnce(null);
      await expect(
        service.inviteCollaborator({
          patientId: PATIENT_ID,
          dto: inviteCollaboratorDto(),
          userSession: userSession(NUT_FROM),
        }),
      ).rejects.toThrow(EntityNotFoundException);

      userService.findOneByEmail.mockResolvedValueOnce(
        premiumUser(null, { nutritionistProfile: null }),
      );
      await expect(
        service.inviteCollaborator({
          patientId: PATIENT_ID,
          dto: inviteCollaboratorDto(),
          userSession: userSession(NUT_FROM),
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it("lanza BadRequestException (400) cuando el destinatario es el propio actor", async () => {
      const { prisma, userService, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      prisma.patientNutritionist.findFirst.mockResolvedValue(null);
      userService.findOneByEmail.mockResolvedValue(premiumUser(NUT_FROM));

      await expect(
        service.inviteCollaborator({
          patientId: PATIENT_ID,
          dto: inviteCollaboratorDto(),
          userSession: userSession(NUT_FROM),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza BadRequestException (400) cuando el destinatario ya es miembro activo", async () => {
      const { prisma, userService, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      prisma.patientNutritionist.findFirst.mockResolvedValue(
        activeMembership(NUT_TO, PatientNutritionistRole.SUPPORT),
      );
      userService.findOneByEmail.mockResolvedValue(premiumUser(NUT_TO));

      await expect(
        service.inviteCollaborator({
          patientId: PATIENT_ID,
          dto: inviteCollaboratorDto(),
          userSession: userSession(NUT_FROM),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("accept", () => {
    it("happy path: valida guards y delega en el repositorio transaccional con el actor", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(referral());
      const accepted = createdView({ status: PatientReferralStatus.ACCEPTED });
      referralRepository.accept.mockResolvedValue(accepted);

      const result = await service.accept({
        id: REFERRAL_ID,
        dto: respondDto(),
        userSession: userSession(NUT_TO),
      });

      expect(prisma.patientReferral.findUnique).toHaveBeenCalledWith({
        where: { id: REFERRAL_ID },
      });
      expect(referralRepository.accept).toHaveBeenCalledWith({
        id: REFERRAL_ID,
        actorId: NUT_TO,
        responseMessage: "gracias por el referido",
        type: ReferralType.TRANSFER,
      });
      expect(result).toBe(accepted);
      expect(emittedActions(eventEmitter)).toEqual([
        EVENTS.EVENT_ACCEPTED,
        EVENTS.EVENT_ACCEPTED_SUCCESS,
      ]);
    });

    it("delega con responseMessage undefined cuando el dto no trae mensaje", async () => {
      const { prisma, referralRepository, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(referral());
      referralRepository.accept.mockResolvedValue(createdView());

      await service.accept({ id: REFERRAL_ID, userSession: userSession(NUT_TO) });

      expect(referralRepository.accept).toHaveBeenCalledWith({
        id: REFERRAL_ID,
        actorId: NUT_TO,
        responseMessage: undefined,
        type: ReferralType.TRANSFER,
      });
    });

    it("lanza BadRequestException cuando el referido no está PENDING", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(
        referral({ status: PatientReferralStatus.ACCEPTED }),
      );

      await expect(
        service.accept({ id: REFERRAL_ID, userSession: userSession(NUT_TO) }),
      ).rejects.toThrow(BadRequestException);

      expect(referralRepository.accept).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.EVENT_ACCEPTED_FAILED, expect.anything());
    });

    it("lanza ForbiddenException cuando el actor no es el destinatario", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(referral());

      await expect(
        service.accept({ id: REFERRAL_ID, userSession: userSession(NUT_FROM) }),
      ).rejects.toThrow(ForbiddenException);

      expect(referralRepository.accept).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.EVENT_ACCEPTED_FAILED, expect.anything());
    });

    it("lanza EntityNotFound cuando el referido no existe", async () => {
      const { prisma, eventEmitter, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(null);

      await expect(
        service.accept({ id: REFERRAL_ID, userSession: userSession(NUT_TO) }),
      ).rejects.toThrow(EntityNotFoundException);

      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.EVENT_ACCEPTED_FAILED, expect.anything());
    });

    it("permite accionar siendo admin con PATIENT_LIST_ALL aunque no sea el destinatario", async () => {
      const { prisma, referralRepository, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(referral());
      referralRepository.accept.mockResolvedValue(createdView());
      const admin = {
        ...userSession(NUT_FROM),
        permits: { list: ["PATIENT_LIST_ALL"] },
      } as unknown as User;

      const result = await service.accept({ id: REFERRAL_ID, userSession: admin });

      expect(referralRepository.accept).toHaveBeenCalledWith({
        id: REFERRAL_ID,
        actorId: NUT_FROM,
        responseMessage: undefined,
        type: ReferralType.TRANSFER,
      });
      expect(result).toBeDefined();
    });

    it("delega el type COLLABORATOR al repositorio cuando el referido es una invitación", async () => {
      const { prisma, referralRepository, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(
        referral({ type: ReferralType.COLLABORATOR }),
      );
      referralRepository.accept.mockResolvedValue(createdView());

      await service.accept({ id: REFERRAL_ID, userSession: userSession(NUT_TO) });

      expect(referralRepository.accept).toHaveBeenCalledWith({
        id: REFERRAL_ID,
        actorId: NUT_TO,
        responseMessage: undefined,
        type: ReferralType.COLLABORATOR,
      });
    });
  });

  describe("reject", () => {
    it("happy path: actualiza a REJECTED con responseMessage, respondedAt y respondedBy", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(referral());
      const rejected = createdView({ status: PatientReferralStatus.REJECTED });
      referralRepository.update.mockResolvedValue(rejected);

      const result = await service.reject({
        id: REFERRAL_ID,
        dto: respondDto(),
        userSession: userSession(NUT_TO),
      });

      expect(referralRepository.update).toHaveBeenCalledWith({
        where: { id: REFERRAL_ID },
        data: expect.objectContaining({
          status: PatientReferralStatus.REJECTED,
          responseMessage: "gracias por el referido",
          respondedAt: expect.any(Date),
          respondedBy: { connect: { id: NUT_TO } },
        }),
      });
      expect(result).toBe(rejected);
      expect(emittedActions(eventEmitter)).toEqual([
        EVENTS.EVENT_REJECTED,
        EVENTS.EVENT_REJECTED_SUCCESS,
      ]);
    });

    it("lanza BadRequestException cuando el referido no está PENDING", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(
        referral({ status: PatientReferralStatus.REJECTED }),
      );

      await expect(
        service.reject({ id: REFERRAL_ID, userSession: userSession(NUT_TO) }),
      ).rejects.toThrow(BadRequestException);

      expect(referralRepository.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.EVENT_REJECTED_FAILED, expect.anything());
    });

    it("lanza ForbiddenException cuando el actor no es el destinatario", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(referral());

      await expect(
        service.reject({ id: REFERRAL_ID, userSession: userSession(NUT_FROM) }),
      ).rejects.toThrow(ForbiddenException);

      expect(referralRepository.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.EVENT_REJECTED_FAILED, expect.anything());
    });
  });

  describe("cancel", () => {
    it("happy path: actualiza a CANCELED con respondedAt y respondedBy", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(referral());
      const canceled = createdView({ status: PatientReferralStatus.CANCELED });
      referralRepository.update.mockResolvedValue(canceled);

      const result = await service.cancel({
        id: REFERRAL_ID,
        userSession: userSession(NUT_FROM),
      });

      expect(referralRepository.update).toHaveBeenCalledWith({
        where: { id: REFERRAL_ID },
        data: expect.objectContaining({
          status: PatientReferralStatus.CANCELED,
          respondedAt: expect.any(Date),
          respondedBy: { connect: { id: NUT_FROM } },
        }),
      });
      expect(result).toBe(canceled);
      expect(emittedActions(eventEmitter)).toEqual([
        EVENTS.EVENT_CANCELED,
        EVENTS.EVENT_CANCELED_SUCCESS,
      ]);
    });

    it("lanza ForbiddenException cuando el actor no es el fromNutritionist", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(referral());

      await expect(
        service.cancel({ id: REFERRAL_ID, userSession: userSession(NUT_TO) }),
      ).rejects.toThrow(ForbiddenException);

      expect(referralRepository.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.EVENT_CANCELED_FAILED, expect.anything());
    });

    it("lanza BadRequestException cuando el referido no está PENDING", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patientReferral.findUnique.mockResolvedValue(
        referral({ status: PatientReferralStatus.CANCELED }),
      );

      await expect(
        service.cancel({ id: REFERRAL_ID, userSession: userSession(NUT_FROM) }),
      ).rejects.toThrow(BadRequestException);

      expect(referralRepository.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.EVENT_CANCELED_FAILED, expect.anything());
    });
  });

  describe("listIncoming / listOutgoing", () => {
    it("listIncoming: filtra por toNutritionistId e invoca findMany con paginación", async () => {
      const { referralRepository, service } = createService();
      const incoming = [createdView(), createdView()];
      referralRepository.findMany.mockResolvedValue(incoming);

      const result = await service.listIncoming({ nutritionistId: NUT_TO });

      expect(referralRepository.findMany).toHaveBeenCalledWith({
        where: { toNutritionistId: NUT_TO },
        skip: 0,
        take: 100,
        orderBy: { createdAt: "desc" },
      });
      expect(result).toBe(incoming);
    });

    it("listIncoming: incluye status en el where cuando se filtra por status", async () => {
      const { referralRepository, service } = createService();
      referralRepository.findMany.mockResolvedValue([]);

      await service.listIncoming({ nutritionistId: NUT_TO, status: "PENDING" });

      expect(referralRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { toNutritionistId: NUT_TO, status: "PENDING" },
        }),
      );
    });

    it("listOutgoing: filtra por fromNutritionistId e invoca findMany con paginación", async () => {
      const { referralRepository, service } = createService();
      const outgoing = [createdView()];
      referralRepository.findMany.mockResolvedValue(outgoing);

      const result = await service.listOutgoing({ nutritionistId: NUT_FROM });

      expect(referralRepository.findMany).toHaveBeenCalledWith({
        where: { fromNutritionistId: NUT_FROM },
        skip: 0,
        take: 100,
        orderBy: { createdAt: "desc" },
      });
      expect(result).toBe(outgoing);
    });

    it("listOutgoing: incluye status en el where cuando se filtra por status", async () => {
      const { referralRepository, service } = createService();
      referralRepository.findMany.mockResolvedValue([]);

      await service.listOutgoing({ nutritionistId: NUT_FROM, status: "ACCEPTED" });

      expect(referralRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fromNutritionistId: NUT_FROM, status: "ACCEPTED" },
        }),
      );
    });
  });

  describe("listByPatient", () => {
    it("happy path: devuelve todos los referidos del paciente (cualquier status) ordenados por createdAt DESC", async () => {
      const { prisma, referralRepository, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      const history = [createdView(), createdView()];
      referralRepository.findMany.mockResolvedValue(history);

      const result = await service.listByPatient({
        patientId: PATIENT_ID,
        userSession: userSession(NUT_FROM),
      });

      expect(prisma.patient.findUnique).toHaveBeenCalledWith({
        where: { id: PATIENT_ID },
        include: { nutritionists: true },
      });
      expect(referralRepository.findMany).toHaveBeenCalledWith({
        where: { patientId: PATIENT_ID },
        skip: 0,
        take: 100,
        orderBy: { createdAt: "desc" },
      });
      expect(result).toBe(history);
    });

    it.each([
      ["sin membresías", []],
      [
        "membresía inactiva",
        [{ nutritionistId: NUT_FROM, isActive: false, role: PatientNutritionistRole.PRIMARY }],
      ],
    ])(
      "guard: lanza ForbiddenException cuando el actor no es miembro activo — %s",
      async (_label, memberships) => {
        const { prisma, referralRepository, service } = createService();
        prisma.patient.findUnique.mockResolvedValue(patientWith(memberships));

        await expect(
          service.listByPatient({ patientId: PATIENT_ID, userSession: userSession(NUT_FROM) }),
        ).rejects.toThrow(ForbiddenException);

        expect(referralRepository.findMany).not.toHaveBeenCalled();
      },
    );

    it("guard: permite al SUPPORT activo ver el historial (lectura, sin primaryOnly)", async () => {
      const { prisma, referralRepository, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.SUPPORT)]),
      );
      referralRepository.findMany.mockResolvedValue([]);

      const result = await service.listByPatient({
        patientId: PATIENT_ID,
        userSession: userSession(NUT_FROM),
      });

      expect(result).toEqual([]);
      expect(referralRepository.findMany).toHaveBeenCalled();
    });

    it("permite al admin con PATIENT_LIST_ALL ver el historial aunque no sea miembro", async () => {
      const { prisma, referralRepository, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(patientWith([]));
      referralRepository.findMany.mockResolvedValue([]);
      const admin = {
        ...userSession(NUT_FROM),
        permits: { list: ["PATIENT_LIST_ALL"] },
      } as unknown as User;

      const result = await service.listByPatient({
        patientId: PATIENT_ID,
        userSession: admin,
      });

      expect(result).toEqual([]);
      expect(referralRepository.findMany).toHaveBeenCalled();
    });

    it("lanza EntityNotFound cuando el paciente no existe", async () => {
      const { prisma, referralRepository, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.listByPatient({ patientId: PATIENT_ID, userSession: userSession(NUT_FROM) }),
      ).rejects.toThrow(EntityNotFoundException);

      expect(referralRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe("addMember", () => {
    it("happy path: PRIMARY crea una membresía SUPPORT con assignedById = id del nutricionista actor y emite los eventos", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      prisma.nutritionist.findUnique.mockResolvedValue({ id: NUT_TO });
      referralRepository.findMembership.mockResolvedValue(null);
      const created = teamMember();
      referralRepository.createMembership.mockResolvedValue(created);

      const result = await service.addMember({
        patientId: PATIENT_ID,
        dto: addCollaboratorDto(),
        userSession: userSession(NUT_FROM),
      });

      expect(prisma.nutritionist.findUnique).toHaveBeenCalledWith({
        where: { id: NUT_TO },
      });
      expect(referralRepository.createMembership).toHaveBeenCalledWith({
        patientId: PATIENT_ID,
        nutritionistId: NUT_TO,
        assignedById: NUT_FROM,
      });
      expect(referralRepository.reactivateMembership).not.toHaveBeenCalled();
      expect(result).toBe(created);
      expect(emittedActions(eventEmitter)).toEqual([
        EVENTS.EVENT_MEMBER_ADDED,
        EVENTS.EVENT_MEMBER_ADDED_SUCCESS,
      ]);
    });

    it("guard: lanza ForbiddenException cuando el actor es SUPPORT (primaryOnly deniega)", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.SUPPORT)]),
      );

      await expect(
        service.addMember({
          patientId: PATIENT_ID,
          dto: addCollaboratorDto(),
          userSession: userSession(NUT_FROM),
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.nutritionist.findUnique).not.toHaveBeenCalled();
      expect(referralRepository.findMembership).not.toHaveBeenCalled();
      expect(referralRepository.createMembership).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("guard: lanza ForbiddenException cuando el actor no tiene perfil de nutricionista", async () => {
      const { referralRepository, service } = createService();

      await expect(
        service.addMember({
          patientId: PATIENT_ID,
          dto: addCollaboratorDto(),
          userSession: userWithoutNutritionist(),
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(referralRepository.createMembership).not.toHaveBeenCalled();
    });

    it("lanza EntityNotFoundException cuando el nutricionista destino no existe", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      prisma.nutritionist.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember({
          patientId: PATIENT_ID,
          dto: addCollaboratorDto(),
          userSession: userSession(NUT_FROM),
        }),
      ).rejects.toThrow(EntityNotFoundException);

      expect(referralRepository.findMembership).not.toHaveBeenCalled();
      expect(referralRepository.createMembership).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENTS.EVENT_MEMBER_ADDED_FAILED,
        expect.anything(),
      );
    });

    it("lanza ConflictException cuando el nutricionista ya es miembro activo", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      prisma.nutritionist.findUnique.mockResolvedValue({ id: NUT_TO });
      referralRepository.findMembership.mockResolvedValue(
        teamMember({ role: PatientNutritionistRole.SUPPORT }),
      );

      await expect(
        service.addMember({
          patientId: PATIENT_ID,
          dto: addCollaboratorDto(),
          userSession: userSession(NUT_FROM),
        }),
      ).rejects.toThrow(ConflictException);

      expect(referralRepository.createMembership).not.toHaveBeenCalled();
      expect(referralRepository.reactivateMembership).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENTS.EVENT_MEMBER_ADDED_FAILED,
        expect.anything(),
      );
    });

    it("reactiva la membresía soft-deleted (isActive=false) con rol SUPPORT y assignedAt renovado", async () => {
      const { prisma, referralRepository, eventEmitter, service } = createService();
      prisma.patient.findUnique.mockResolvedValue(
        patientWith([activeMembership(NUT_FROM, PatientNutritionistRole.PRIMARY)]),
      );
      prisma.nutritionist.findUnique.mockResolvedValue({ id: NUT_TO });
      referralRepository.findMembership.mockResolvedValue(
        teamMember({ isActive: false }),
      );
      const reactivated = teamMember();
      referralRepository.reactivateMembership.mockResolvedValue(reactivated);

      const result = await service.addMember({
        patientId: PATIENT_ID,
        dto: addCollaboratorDto(),
        userSession: userSession(NUT_FROM),
      });

      expect(referralRepository.reactivateMembership).toHaveBeenCalledWith({
        patientId: PATIENT_ID,
        nutritionistId: NUT_TO,
        assignedById: NUT_FROM,
      });
      expect(referralRepository.createMembership).not.toHaveBeenCalled();
      expect(result).toBe(reactivated);
      expect(emittedActions(eventEmitter)).toEqual([
        EVENTS.EVENT_MEMBER_ADDED,
        EVENTS.EVENT_MEMBER_ADDED_SUCCESS,
      ]);
    });
  });
});