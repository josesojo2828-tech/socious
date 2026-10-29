import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "nestjs-prisma";
import { User, UserStatus } from "src/shared/types/schema.types";
import { I18nService } from "src/shared/lang/i18n.service";
import { WorkspaceContextService } from "src/shared/services/workspace-context.service";
import UserRepository from "src/modules/user/repository/user.repository";
import { UserService } from "src/modules/user/services/user.service";
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import { ActivityService } from "src/modules/activity/services/activity.service";
import { PatientInvitationService } from "src/modules/patient-invitation/patient-invitation.service";
import { PediatricHistoryService } from "./pediatric-history.service";
import { PatientService } from "./patient.service";

/**
 * S1 (patient-onboarding) / D2a — el alta de paciente puede pedir la
 * INVITACIÓN POR CORREO en lugar de crear una cuenta con una contraseña que
 * nadie conoce.
 *
 * Contrato que este spec fija:
 *   - `sendInvitation: true` ⇒ el `User` nace SIN contraseña utilizable
 *     (`password: null`), con `mustChangePassword: true`, y se crea+envía la
 *     invitación para que el paciente defina la suya;
 *   - `sendInvitation` ausente/false ⇒ el comportamiento de SIEMPRE se
 *     conserva EXACTAMENTE (la contraseña del profesional, o la aleatoria);
 *   - sin correo no se puede invitar ⇒ `BadRequestException` y NO se crea
 *     nada;
 *   - un fallo del correo NO rompe el alta.
 */
describe("PatientService.create — sendInvitation (S1 / D2a)", () => {
  let service: PatientService;
  let userRepository: any;
  let userService: any;
  let permitRepository: any;
  let i18nService: any;
  let prisma: any;
  let workspaceContext: any;
  let activityService: any;
  let patientInvitationService: any;

  const DOCTOR_USER_ID = "doctor-user-uuid-1";
  const DOCTOR_EMAIL = "doctor@nutringest.com";
  const NUTRITIONIST_ID = "nutritionist-uuid-1";

  const doctorSession: User = {
    id: DOCTOR_USER_ID,
    email: DOCTOR_EMAIL,
    username: "drnutri",
    firstName: "Doctor",
    lastName: "Nutri",
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    nutritionistProfile: {
      id: NUTRITIONIST_ID,
      userId: DOCTOR_USER_ID,
    },
    permits: {
      id: "NUTRITIONIST",
      name: "NUTRITIONIST",
      list: ["PATIENT_LIST_OWN", "PATIENT_CREATED", "PATIENT_UPDATE"],
    },
  } as unknown as User;

  const baseData = (overrides: Record<string, unknown> = {}) => ({
    firstName: "Lucia",
    lastName: "Gomez",
    email: "lucia@newpatient.com",
    privacyNoticeAccepted: true,
    ...overrides,
  });

  const createdUser = {
    id: "new-user-lucia",
    email: "lucia@newpatient.com",
    patientProfiles: [
      { id: "patient-profile-lucia", firstName: "Lucia", lastName: "Gomez" },
    ],
  };

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getColumns: jest.fn(),
      getFormCreateUser: jest.fn(),
      getFilters: jest.fn(),
    };

    userService = { getPaginate: jest.fn() };
    permitRepository = { PATIENT: "PATIENT" };
    i18nService = { t: jest.fn((k) => k) };

    prisma = {
      nutritionist: {
        upsert: jest
          .fn()
          .mockResolvedValue({ id: NUTRITIONIST_ID, userId: DOCTOR_USER_ID }),
      },
      patient: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    workspaceContext = { getWorkspaceId: jest.fn().mockReturnValue(null) };
    activityService = { logActivity: jest.fn().mockResolvedValue(true) };

    patientInvitationService = {
      createInvitation: jest.fn().mockResolvedValue({ message: "ok" }),
      resendInvitation: jest.fn().mockResolvedValue({ message: "ok" }),
      revokeInvitation: jest.fn().mockResolvedValue({ revoked: 0 }),
    };

    service = new PatientService(
      userRepository,
      userService,
      permitRepository,
      i18nService,
      prisma,
      workspaceContext,
      activityService,
      patientInvitationService,
    );
  });

  describe("ruta con invitación", () => {
    it("crea el usuario SIN contraseña utilizable y crea+envía la invitación", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      const result = await service.create({
        data: baseData({ sendInvitation: true }),
        userSession: doctorSession,
      });

      const createInput = userRepository.create.mock.calls[0][0].data;

      // La cuenta nace sin contraseña: nadie puede entrar con una credencial
      // inventada; el paciente la define al aceptar la invitación.
      expect(createInput.password).toBeNull();
      expect(createInput.mustChangePassword).toBe(true);

      // El paciente y su perfil se crean como siempre.
      expect(createInput.patientProfiles.create.email).toBe(
        "lucia@newpatient.com",
      );

      // La invitación se crea DESPUÉS del alta, con el paciente ya existente.
      expect(patientInvitationService.createInvitation).toHaveBeenCalledTimes(1);
      expect(patientInvitationService.createInvitation).toHaveBeenCalledWith({
        patientId: "patient-profile-lucia",
        createdById: DOCTOR_USER_ID,
      });

      expect(result.patientProfile).toEqual(createdUser.patientProfiles[0]);
    });

    it("rechaza la invitación cuando el paciente no tiene correo, sin crear nada", async () => {
      await expect(
        service.create({
          data: baseData({ sendInvitation: true, email: "" }),
          userSession: doctorSession,
        }),
      ).rejects.toThrow(
        new BadRequestException(
          "el paciente necesita un correo para recibir la invitación",
        ),
      );

      expect(userRepository.create).not.toHaveBeenCalled();
      expect(prisma.patient.create).not.toHaveBeenCalled();
      expect(patientInvitationService.createInvitation).not.toHaveBeenCalled();
    });

    it("un fallo del correo NO rompe el alta: la cuenta queda creada", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);
      patientInvitationService.createInvitation.mockRejectedValue(
        new Error("SMTP no configurado"),
      );

      const result = await service.create({
        data: baseData({ sendInvitation: true }),
        userSession: doctorSession,
      });

      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(result.patientProfile).toEqual(createdUser.patientProfiles[0]);
    });

    it("invita también al paciente que ya tenía cuenta, sin tocar su cuenta", async () => {
      const patientUserId = "patient-user-uuid-99";

      userRepository.findOne
        .mockResolvedValueOnce({
          id: patientUserId,
          email: "lucia@newpatient.com",
        })
        .mockResolvedValueOnce({
          id: patientUserId,
          email: "lucia@newpatient.com",
          firstName: "Lucia",
          lastName: "Gomez",
        });
      prisma.patient.findFirst.mockResolvedValue(null);
      prisma.patient.create.mockResolvedValue({
        id: "patient-profile-existing",
        userId: patientUserId,
      });

      await service.create({
        data: baseData({ sendInvitation: true }),
        userSession: doctorSession,
      });

      expect(patientInvitationService.createInvitation).toHaveBeenCalledWith({
        patientId: "patient-profile-existing",
        createdById: DOCTOR_USER_ID,
      });

      // La cuenta preexistente NO se toca (no hay password ni update).
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("ruta por defecto (sendInvitation ausente o false)", () => {
    it("usa la contraseña del profesional y no crea ninguna invitación", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      await service.create({
        data: baseData({ password: "TempPassword123!" }),
        userSession: doctorSession,
      });

      const createInput = userRepository.create.mock.calls[0][0].data;

      expect(createInput.password).not.toBeNull();
      expect(createInput.password).not.toBe("TempPassword123!");
      expect(createInput.password.startsWith("$2")).toBe(true);
      expect(createInput.mustChangePassword).toBe(true);
      expect(patientInvitationService.createInvitation).not.toHaveBeenCalled();
    });

    it("mantiene la contraseña aleatoria cuando el profesional no informa una", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      await service.create({
        data: baseData(),
        userSession: doctorSession,
      });

      const createInput = userRepository.create.mock.calls[0][0].data;

      expect(createInput.password).not.toBeNull();
      expect(createInput.password.startsWith("$2")).toBe(true);
      expect(patientInvitationService.createInvitation).not.toHaveBeenCalled();
    });

    it("sendInvitation: false se comporta exactamente como el valor ausente", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      await service.create({
        data: baseData({ sendInvitation: false, password: "TempPassword123!" }),
        userSession: doctorSession,
      });

      const createInput = userRepository.create.mock.calls[0][0].data;

      expect(createInput.password).not.toBeNull();
      expect(patientInvitationService.createInvitation).not.toHaveBeenCalled();
    });
  });
});

/**
 * El constructor declara el servicio de invitaciones como opcional en el
 * TIPO (para no romper la construcción manual en los tests). Este spec
 * comprueba que NEST lo inyecta igual: sin él, la ruta de invitación no
 * podría funcionar en el backend real.
 *
 * S2 / C2: el servicio también depende del `PediatricHistoryService` (los
 * datos del representante), así que el módulo de prueba lo provee.
 */
describe("PatientService — inyección del servicio de invitaciones (DI)", () => {
  it("Nest resuelve el PatientInvitationService aunque el constructor lo declare opcional", async () => {
    const invitationProvider = { createInvitation: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PatientService,
        { provide: UserRepository, useValue: {} },
        { provide: UserService, useValue: {} },
        { provide: PermitReporitory, useValue: { PATIENT: "PATIENT" } },
        { provide: I18nService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: WorkspaceContextService, useValue: {} },
        { provide: ActivityService, useValue: {} },
        { provide: PatientInvitationService, useValue: invitationProvider },
        { provide: PediatricHistoryService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(PatientService);
    expect((service as any).patientInvitationService).toBe(invitationProvider);
  });
});
