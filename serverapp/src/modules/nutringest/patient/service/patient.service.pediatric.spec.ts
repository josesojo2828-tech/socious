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
 * S2 (patient-onboarding) / C2 — alta de un paciente PEDIÁTRICO con
 * REPRESENTANTE.
 *
 * Contrato que este spec fija:
 *   - `isPediatric: true` ⇒ el paciente se crea con `isPediatric: true` y su
 *     `PediatricHistory` (el modelo que YA existe) se crea en la misma
 *     operación con los datos del representante y con `createdById` del
 *     profesional en sesión;
 *   - la CUENTA es la del REPRESENTANTE (su correo + permiso PATIENT): el
 *     `Patient.userId` apunta a ese usuario, así su portal muestra al menor;
 *     el correo propio del menor (si lo tiene) queda en la fila del paciente;
 *   - si ya existe un `User` con el correo del representante se reutiliza, sin
 *     tocar su contraseña;
 *   - sin representante el alta se RECHAZA con 400 ANTES de escribir nada;
 *   - `isPediatric` ausente o false ⇒ comportamiento EXACTAMENTE el de
 *     siempre (sin historia pediátrica, la cuenta es la del paciente y el
 *     payload enviado al repositorio no lleva ningún campo nuevo).
 */
describe("PatientService.create — paciente pediátrico con representante (S2 / C2)", () => {
  let service: PatientService;
  let userRepository: any;
  let userService: any;
  let permitRepository: any;
  let i18nService: any;
  let prisma: any;
  let workspaceContext: any;
  let activityService: any;
  let patientInvitationService: any;
  let pediatricHistoryService: any;

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

  const representative = {
    fullName: "María Pérez",
    email: "maria@example.com",
    phone: "+58 412 1234567",
    relationship: "MADRE",
  };

  const baseData = (overrides: Record<string, unknown> = {}) => ({
    firstName: "Juan",
    lastName: "Perez",
    email: "juan@menor.test",
    privacyNoticeAccepted: true,
    ...overrides,
  });

  const createdUser = {
    id: "representative-user-uuid",
    email: representative.email,
    patientProfiles: [
      { id: "patient-profile-uuid", firstName: "Juan", lastName: "Perez" },
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

    pediatricHistoryService = {
      create: jest.fn().mockResolvedValue({ id: "pediatric-history-uuid" }),
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
      pediatricHistoryService,
    );
  });

  describe("alta con representante", () => {
    it("crea el paciente con isPediatric y la historia pediátrica con los datos del representante", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      await service.create({
        data: baseData({ isPediatric: true, representative }),
        userSession: doctorSession,
      });

      // El paciente nace marcado como menor.
      const createInput = userRepository.create.mock.calls[0][0].data;
      expect(createInput.patientProfiles.create.isPediatric).toBe(true);

      // La historia pediátrica (modelo que YA existe) se crea con los datos
      // del representante y con el profesional en sesión como autor.
      expect(pediatricHistoryService.create).toHaveBeenCalledTimes(1);
      expect(pediatricHistoryService.create).toHaveBeenCalledWith({
        userSession: doctorSession,
        data: {
          patientId: "patient-profile-uuid",
          representativeName: "María Pérez",
          representativePhone: "+58 412 1234567",
          representativeEmail: "maria@example.com",
          representativeRelationship: "MADRE",
        },
      });
    });

    it("la cuenta es la del REPRESENTANTE y el menor conserva su propio correo", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      await service.create({
        data: baseData({ isPediatric: true, representative }),
        userSession: doctorSession,
      });

      const createInput = userRepository.create.mock.calls[0][0].data;

      // La cuenta se abre con el correo del representante y el permiso PATIENT.
      expect(createInput.email).toBe("maria@example.com");
      expect(createInput.permits).toEqual({ connect: { id: "PATIENT" } });

      // El correo del menor queda en la fila del paciente, no en la cuenta.
      expect(createInput.patientProfiles.create.email).toBe("juan@menor.test");
    });

    it("reutiliza la cuenta existente del representante sin tocar su contraseña", async () => {
      userRepository.findOne.mockResolvedValue({
        id: "representative-user-uuid",
        email: "maria@example.com",
      });
      prisma.patient.findFirst.mockResolvedValue(null);
      prisma.patient.create.mockResolvedValue({
        id: "patient-profile-uuid",
        userId: "representative-user-uuid",
      });

      await service.create({
        data: baseData({ isPediatric: true, representative }),
        userSession: doctorSession,
      });

      // La cuenta preexistente se REUTILIZA: no se crea otra ni se actualiza
      // (su contraseña no se toca).
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();

      // El paciente menor se enlaza al usuario del representante.
      const patientCreateData = prisma.patient.create.mock.calls[0][0].data;
      expect(patientCreateData.user).toEqual({
        connect: { id: "representative-user-uuid" },
      });
      expect(patientCreateData.isPediatric).toBe(true);
      expect(patientCreateData.email).toBe("juan@menor.test");

      expect(pediatricHistoryService.create).toHaveBeenCalledTimes(1);
    });

    it("rechaza con 400 el alta SIN representante, antes de escribir nada", async () => {
      await expect(
        service.create({
          data: baseData({ isPediatric: true }),
          userSession: doctorSession,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      // Ni una escritura: ni el perfil de nutricionista, ni la cuenta, ni el
      // paciente, ni la historia pediátrica.
      expect(prisma.nutritionist.upsert).not.toHaveBeenCalled();
      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(prisma.patient.create).not.toHaveBeenCalled();
      expect(pediatricHistoryService.create).not.toHaveBeenCalled();
    });

    it("rechaza con 400 un representante sin nombre o sin correo", async () => {
      await expect(
        service.create({
          data: baseData({
            isPediatric: true,
            representative: { ...representative, fullName: "  " },
          }),
          userSession: doctorSession,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.create({
          data: baseData({
            isPediatric: true,
            representative: { ...representative, email: "" },
          }),
          userSession: doctorSession,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.nutritionist.upsert).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(pediatricHistoryService.create).not.toHaveBeenCalled();
    });

    it("rechaza con 400 un parentesco fuera de la lista admitida", async () => {
      await expect(
        service.create({
          data: baseData({
            isPediatric: true,
            representative: { ...representative, relationship: "ABUELA" },
          }),
          userSession: doctorSession,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(userRepository.create).not.toHaveBeenCalled();
      expect(pediatricHistoryService.create).not.toHaveBeenCalled();
    });

    it("acepta los cuatro parentescos admitidos", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      for (const relationship of ["PADRE", "MADRE", "TUTOR", "OTRO"]) {
        pediatricHistoryService.create.mockClear();

        await service.create({
          data: baseData({
            isPediatric: true,
            representative: { ...representative, relationship },
          }),
          userSession: doctorSession,
        });

        expect(pediatricHistoryService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ representativeRelationship: relationship }),
          }),
        );
      }
    });

    it("la invitación se crea DESPUÉS de la historia pediátrica (el destinatario se resuelve en la base)", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      await service.create({
        data: baseData({
          isPediatric: true,
          representative,
          sendInvitation: true,
        }),
        userSession: doctorSession,
      });

      expect(patientInvitationService.createInvitation).toHaveBeenCalledTimes(1);
      expect(patientInvitationService.createInvitation).toHaveBeenCalledWith({
        patientId: "patient-profile-uuid",
        createdById: DOCTOR_USER_ID,
      });

      const historyOrder =
        pediatricHistoryService.create.mock.invocationCallOrder[0];
      const invitationOrder =
        patientInvitationService.createInvitation.mock.invocationCallOrder[0];
      expect(historyOrder).toBeLessThan(invitationOrder);
    });

    it("un menor SIN correo propio puede invitarse al representante", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      await service.create({
        data: baseData({
          email: undefined,
          isPediatric: true,
          representative,
          sendInvitation: true,
        }),
        userSession: doctorSession,
      });

      expect(patientInvitationService.createInvitation).toHaveBeenCalledTimes(1);
    });
  });

  describe("ruta NO pediátrica (sin cambios respecto de hoy)", () => {    it("no crea historia pediátrica y la cuenta es la del paciente", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: "new-user-lucia",
        email: "lucia@newpatient.com",
        patientProfiles: [
          { id: "lucia-patient-prof", firstName: "Lucia", lastName: "Gomez" },
        ],
      });

      await service.create({
        data: baseData({
          firstName: "Lucia",
          lastName: "Gomez",
          email: "lucia@newpatient.com",
        }),
        userSession: doctorSession,
      });

      const createInput = userRepository.create.mock.calls[0][0].data;

      expect(pediatricHistoryService.create).not.toHaveBeenCalled();
      expect(createInput.email).toBe("lucia@newpatient.com");
      expect(createInput.patientProfiles.create.email).toBe(
        "lucia@newpatient.com",
      );

      // El payload NO lleva ningún campo nuevo: el comportamiento observable
      // (y el payload enviado al repositorio) es idéntico al de antes.
      expect("isPediatric" in createInput.patientProfiles.create).toBe(false);
    });

    it("isPediatric: false se comporta EXACTAMENTE como el valor ausente", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      await service.create({
        data: baseData({ isPediatric: false, representative }),
        userSession: doctorSession,
      });

      const createInput = userRepository.create.mock.calls[0][0].data;

      expect(pediatricHistoryService.create).not.toHaveBeenCalled();
      expect(createInput.email).toBe("juan@menor.test");
      expect("isPediatric" in createInput.patientProfiles.create).toBe(false);
    });

    it("no envía la invitación al representante si el paciente no es menor", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      await service.create({
        data: baseData({ sendInvitation: true }),
        userSession: doctorSession,
      });

      expect(patientInvitationService.createInvitation).toHaveBeenCalledWith({
        patientId: "patient-profile-uuid",
        createdById: DOCTOR_USER_ID,
      });
      expect(pediatricHistoryService.create).not.toHaveBeenCalled();
    });
  });
  describe("update — la cuenta del REPRESENTANTE no se reescribe", () => {
    it("no cambia el correo de la cuenta al editar la ficha de un menor", async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: "patient-profile-uuid",
        userId: "representative-user-uuid",
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@menor.test",
        isPediatric: true,
        isActive: true,
      });
      prisma.patient.update.mockResolvedValue({ id: "patient-profile-uuid" });

      await service.update({
        id: "patient-profile-uuid",
        data: {
          firstName: "Juan",
          lastName: "Perez",
          email: "juan@menor.test",
          phone: "+58 412 0000000",
        },
        userSession: doctorSession,
      });

      // La ficha del menor sí se actualiza...
      const patientUpdate = prisma.patient.update.mock.calls[0][0].data;
      expect(patientUpdate.email).toBe("juan@menor.test");

      // ...pero el correo de la cuenta (la del representante) NO se toca.
      const userUpdate = userRepository.update.mock.calls[0][0].data;
      expect(userUpdate.email).toBeUndefined();
    });

    it("un paciente que NO es menor sigue sincronizando el correo de su cuenta", async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: "patient-profile-uuid",
        userId: "patient-user-uuid",
        firstName: "Ana",
        lastName: "Perez",
        email: "ana@example.test",
        isPediatric: false,
        isActive: true,
      });
      prisma.patient.update.mockResolvedValue({ id: "patient-profile-uuid" });

      await service.update({
        id: "patient-profile-uuid",
        data: {
          firstName: "Ana",
          lastName: "Perez",
          email: "ana.nueva@example.test",
        },
        userSession: doctorSession,
      });

      const userUpdate = userRepository.update.mock.calls[0][0].data;
      expect(userUpdate.email).toBe("ana.nueva@example.test");
    });
  });
  describe("update — el flag de menor se corrige desde la ficha", () => {
    const existingPatient = {
      id: "patient-uuid-1",
      userId: "patient-user-uuid-1",
      isPediatric: false,
    };

    const updateData = (overrides: Record<string, unknown> = {}) => ({
      firstName: "Juan",
      lastName: "Perez",
      email: "juan@menor.test",
      gender: "MALE",
      ...overrides,
    });

    beforeEach(() => {
      prisma.patient.findFirst.mockResolvedValue(existingPatient);
      prisma.patient.update.mockImplementation(async ({ data }: any) => ({
        ...existingPatient,
        ...data,
      }));
      userRepository.update.mockResolvedValue({ id: existingPatient.userId });
    });

    it("enciende el flag con el representante en los campos planos del formulario", async () => {
      const updated = await service.update({
        id: existingPatient.id,
        data: updateData({
          isPediatric: "true",
          "representative.fullName": representative.fullName,
          "representative.email": representative.email,
          "representative.phone": representative.phone,
          "representative.relationship": representative.relationship,
        }),
        userSession: doctorSession,
      });

      expect(updated.isPediatric).toBe(true);
      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPediatric: true }),
        }),
      );
      expect(pediatricHistoryService.create).toHaveBeenCalledTimes(1);
      expect(pediatricHistoryService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: existingPatient.id,
            representativeName: representative.fullName,
            representativeEmail: representative.email,
          }),
        }),
      );
    });

    it("rechaza con 400 encender el flag sin representante", async () => {
      await expect(
        service.update({
          id: existingPatient.id,
          data: updateData({ isPediatric: true }),
          userSession: doctorSession,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.patient.update).not.toHaveBeenCalled();
      expect(pediatricHistoryService.create).not.toHaveBeenCalled();
    });

    it("una ficha ya pediátrica se guarda sin volver a cargar el representante", async () => {
      prisma.patient.findFirst.mockResolvedValue({
        ...existingPatient,
        isPediatric: true,
      });

      const updated = await service.update({
        id: existingPatient.id,
        data: updateData({ isPediatric: true }),
        userSession: doctorSession,
      });

      expect(updated.isPediatric).toBe(true);
      expect(pediatricHistoryService.create).not.toHaveBeenCalled();
    });

    it("permite desactivar el flag y vuelve a reescribir el correo de la cuenta", async () => {
      prisma.patient.findFirst.mockResolvedValue({
        ...existingPatient,
        isPediatric: true,
      });

      const updated = await service.update({
        id: existingPatient.id,
        data: updateData({ isPediatric: false }),
        userSession: doctorSession,
      });

      expect(updated.isPediatric).toBe(false);
      expect(userRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: "juan@menor.test" }),
        }),
      );
    });
  });
});

/**
 * El constructor declara el servicio de historia pediátrica como opcional en
 * el TIPO (para no romper la construcción manual en los tests). Este spec
 * comprueba que NEST lo inyecta igual: sin él, el alta pediátrica no podría
 * crear la `PediatricHistory` en el backend real.
 */
describe("PatientService — inyección del servicio de historia pediátrica (DI)", () => {
  it("Nest resuelve el PediatricHistoryService aunque el constructor lo declare opcional", async () => {
    const pediatricProvider = { create: jest.fn() };

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
        { provide: PatientInvitationService, useValue: {} },
        { provide: PediatricHistoryService, useValue: pediatricProvider },
      ],
    }).compile();

    const service = moduleRef.get(PatientService);
    expect((service as any).pediatricHistoryService).toBe(pediatricProvider);
  });

});
