import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PatientNutritionistRole } from "@prisma/client";
import { User, UserStatus } from "src/shared/types/schema.types";
import { PatientService } from "./patient.service";

describe("PatientService - Regression and Identity Protection", () => {
  let service: PatientService;
  let userRepository: any;
  let userService: any;
  let permitRepository: any;
  let i18nService: any;
  let prisma: any;
  let workspaceContext: any;
  let activityService: any;

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

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getColumns: jest.fn(),
      getFormCreateUser: jest.fn(),
      getFilters: jest.fn(),
    };

    userService = {
      getPaginate: jest.fn(),
    };

    permitRepository = {
      PATIENT: "PATIENT",
    };

    i18nService = {
      t: jest.fn((k) => k),
    };

    prisma = {
      nutritionist: {
        upsert: jest.fn().mockResolvedValue({ id: NUTRITIONIST_ID, userId: DOCTOR_USER_ID }),
      },
      patient: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    workspaceContext = {
      getWorkspaceId: jest.fn().mockReturnValue(null),
    };

    activityService = {
      logActivity: jest.fn().mockResolvedValue(true),
    };

    service = new PatientService(
      userRepository,
      userService,
      permitRepository,
      i18nService,
      prisma,
      workspaceContext,
      activityService,
    );
  });

  describe("create — Doctor identity protection", () => {
    it("throws BadRequestException when input email matches the logged-in doctor's email directly", async () => {
      const data = {
        firstName: "Self",
        lastName: "Doctor",
        email: "DOCTOR@nutringest.com ", // case-insensitive and whitespace check
      };

      await expect(
        service.create({ data, userSession: doctorSession }),
      ).rejects.toThrow(
        new BadRequestException("No puedes registrar tu propia cuenta de profesional como paciente."),
      );

      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(prisma.patient.create).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when input email belongs to existing user whose id matches the logged-in doctor", async () => {
      const data = {
        firstName: "Alias",
        lastName: "Doctor",
        email: "doc.alias@hospital.com",
      };

      userRepository.findOne.mockResolvedValue({
        id: DOCTOR_USER_ID,
        email: "doc.alias@hospital.com",
      });

      await expect(
        service.create({ data, userSession: doctorSession }),
      ).rejects.toThrow(
        new BadRequestException("No puedes registrar tu propia cuenta de profesional como paciente."),
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: data.email },
      });
      expect(prisma.patient.create).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when nutritionistProfile is missing in userSession", async () => {
      const sessionWithoutProfile = {
        ...doctorSession,
        nutritionistProfile: undefined,
      } as unknown as User;

      const data = {
        firstName: "Carlos",
        lastName: "Perez",
        email: "carlos@patient.com",
      };

      await expect(
        service.create({ data, userSession: sessionWithoutProfile }),
      ).rejects.toThrow(
        new BadRequestException("No tienes perfil de nutricionista activo."),
      );
    });

    it("creates patient linked to existing user when existingUser is a different account and has no profile with this doctor", async () => {
      const patientUserId = "patient-user-uuid-99";
      const data = {
        firstName: "Carlos",
        lastName: "Perez",
        email: "carlos@patient.com",
        privacyNoticeAccepted: true,
      };

      userRepository.findOne
        .mockResolvedValueOnce({
          id: patientUserId,
          email: "carlos@patient.com",
        })
        .mockResolvedValueOnce({
          id: patientUserId,
          email: "carlos@patient.com",
          firstName: "Carlos",
          lastName: "Perez",
        });

      prisma.patient.findFirst.mockResolvedValue(null);

      const createdPatientRecord = {
        id: "patient-profile-1",
        userId: patientUserId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      };
      prisma.patient.create.mockResolvedValue(createdPatientRecord);

      const result = await service.create({ data, userSession: doctorSession });

      expect(prisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user: { connect: { id: patientUserId } },
            createdBy: { connect: { id: DOCTOR_USER_ID } },
            nutritionists: {
              create: expect.objectContaining({
                nutritionist: { connect: { id: NUTRITIONIST_ID } },
                role: PatientNutritionistRole.PRIMARY,
                isActive: true,
              }),
            },
          }),
        }),
      );

      expect(result).toMatchObject({
        id: patientUserId,
        patientProfile: createdPatientRecord,
      });
    });

    it("creates brand new user and patient profile when existing user does not exist", async () => {
      const data = {
        firstName: "Lucia",
        lastName: "Gomez",
        email: "lucia@newpatient.com",
        password: "TempPassword123!",
        privacyNoticeAccepted: true,
      };

      userRepository.findOne.mockResolvedValue(null);

      const createdUserRecord = {
        id: "new-user-lucia",
        email: data.email,
        patientProfiles: [
          {
            id: "lucia-patient-prof",
            firstName: data.firstName,
            lastName: data.lastName,
          },
        ],
      };
      userRepository.create.mockResolvedValue(createdUserRecord);

      const result = await service.create({ data, userSession: doctorSession });

      expect(userRepository.create).toHaveBeenCalled();
      expect(result.patientProfile).toEqual(createdUserRecord.patientProfiles[0]);
    });
  });

  describe("update — Safe patient update and doctor account protection", () => {
    it("does NOT mutate the logged-in doctor's user entity if patient.userId equals userSession.id", async () => {
      const patientId = "patient-linked-to-doctor";
      const updateData = {
        firstName: "Changed First",
        lastName: "Changed Last",
        email: "changed@email.com",
        phone: "+54911223344",
      };

      // Mock patient found whose userId is the same as the doctor's userSession.id
      prisma.patient.findFirst.mockResolvedValue({
        id: patientId,
        userId: DOCTOR_USER_ID,
        firstName: "Doctor",
        lastName: "Nutri",
        email: DOCTOR_EMAIL,
        isActive: true,
      });

      prisma.patient.update.mockResolvedValue({
        id: patientId,
        userId: DOCTOR_USER_ID,
        ...updateData,
      });

      const result = await service.update({
        id: patientId,
        data: updateData,
        userSession: doctorSession,
      });

      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: patientId },
        data: expect.objectContaining({
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          email: updateData.email,
          phone: updateData.phone,
        }),
      });

      // CRITICAL ASSERTION: userRepository.update MUST NOT be called for the doctor's user account
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(result.id).toBe(patientId);
    });

    it("mutates the patient's user entity when patient.userId is distinct from userSession.id", async () => {
      const patientId = "patient-standard-uuid";
      const patientUserId = "patient-user-distinct-uuid";
      const updateData = {
        firstName: "Maria",
        lastName: "Rodriguez",
        email: "maria.new@email.com",
        phone: "+54911998877",
      };

      prisma.patient.findFirst.mockResolvedValue({
        id: patientId,
        userId: patientUserId,
        firstName: "Maria",
        lastName: "Antigua",
        email: "maria.old@email.com",
        isActive: true,
      });

      prisma.patient.update.mockResolvedValue({
        id: patientId,
        userId: patientUserId,
        ...updateData,
      });

      userRepository.update.mockResolvedValue({
        id: patientUserId,
        ...updateData,
      });

      const result = await service.update({
        id: patientId,
        data: updateData,
        userSession: doctorSession,
      });

      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: patientId },
        data: expect.objectContaining({
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          email: updateData.email,
          phone: updateData.phone,
        }),
      });

      // Confirms the patient's linked User record was updated
      expect(userRepository.update).toHaveBeenCalledWith({
        where: { id: patientUserId },
        data: {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          email: updateData.email,
        },
      });

      expect(result.id).toBe(patientId);
    });

    it("does not call userRepository.update when patient has no linked userId", async () => {
      const patientId = "patient-unlinked-uuid";
      const updateData = {
        firstName: "Anon",
        lastName: "Patient",
        email: "anon@nutringest.test",
      };

      prisma.patient.findFirst.mockResolvedValue({
        id: patientId,
        userId: null,
        firstName: "Anon",
        lastName: "Old",
        email: "anon@nutringest.test",
        isActive: true,
      });

      prisma.patient.update.mockResolvedValue({
        id: patientId,
        userId: null,
        ...updateData,
      });

      await service.update({
        id: patientId,
        data: updateData,
        userSession: doctorSession,
      });

      expect(prisma.patient.update).toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when patient does not exist or user lacks access", async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.update({
          id: "non-existent-id",
          data: { firstName: "Test" },
          userSession: doctorSession,
        }),
      ).rejects.toThrow(
        new NotFoundException("Paciente no encontrado o no tienes acceso."),
      );

      expect(prisma.patient.update).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("create/update — patient privacy notice authorization (S5)", () => {
    it("creates the patient without privacyNoticeAccepted and records no attestation", async () => {
      // El alta y la notificación son pasos independientes: el profesional no
      // necesita marcar la atestación para que el paciente se cree.
      const data = {
        firstName: "Sin",
        lastName: "Aviso",
        email: "sin-aviso@patient.com",
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: "new-user-sin-aviso",
        email: data.email,
        patientProfiles: [
          { id: "sin-aviso-patient-prof", firstName: data.firstName },
        ],
      });

      await expect(
        service.create({ data, userSession: doctorSession }),
      ).resolves.toBeDefined();

      const createInput = userRepository.create.mock.calls[0][0].data;
      const profileCreate = createInput.patientProfiles.create;
      expect(profileCreate.privacyNoticeAcceptedAt).toBeUndefined();
      expect(profileCreate.privacyNoticeVersion).toBeUndefined();
      expect(profileCreate.privacyNoticeAcceptedById).toBeUndefined();
    });

    it("persists privacy notice fields when creating a brand new user and patient profile", async () => {
      const data = {
        firstName: "Consentida",
        lastName: "Gomez",
        email: "consentida@newpatient.com",
        password: "TempPassword123!",
        privacyNoticeAccepted: true,
      };

      userRepository.findOne.mockResolvedValue(null);

      const createdUserRecord = {
        id: "new-user-consentida",
        email: data.email,
        patientProfiles: [{ id: "consentida-patient-prof", firstName: data.firstName }],
      };
      userRepository.create.mockResolvedValue(createdUserRecord);

      await service.create({ data, userSession: doctorSession });

      const createInput = userRepository.create.mock.calls[0][0].data;
      const profileCreate = createInput.patientProfiles.create;
      expect(profileCreate.privacyNoticeAcceptedAt).toBeInstanceOf(Date);
      expect(profileCreate.privacyNoticeVersion).toEqual(expect.any(String));
      expect(profileCreate.privacyNoticeAcceptedById).toBe(DOCTOR_USER_ID);
    });

    it("persists privacy notice fields when linking patient to an existing user", async () => {
      const patientUserId = "existing-user-uuid-77";
      const data = {
        firstName: "Vinculada",
        lastName: "Perez",
        email: "vinculada@patient.com",
        privacyNoticeAccepted: true,
      };

      userRepository.findOne
        .mockResolvedValueOnce({ id: patientUserId, email: data.email })
        .mockResolvedValueOnce({ id: patientUserId, email: data.email, firstName: data.firstName });
      prisma.patient.findFirst.mockResolvedValue(null);
      prisma.patient.create.mockResolvedValue({ id: "patient-profile-77" });

      await service.create({ data, userSession: doctorSession });

      const patientCreateData = prisma.patient.create.mock.calls[0][0].data;
      expect(patientCreateData.privacyNoticeAcceptedAt).toBeInstanceOf(Date);
      expect(patientCreateData.privacyNoticeVersion).toEqual(expect.any(String));
      expect(patientCreateData.privacyNoticeAcceptedById).toBe(DOCTOR_USER_ID);
    });

    it("records privacy notice acceptance on update for patients created earlier", async () => {
      const patientId = "existing-patient-id-55";
      prisma.patient.findFirst.mockResolvedValue({
        id: patientId,
        userId: null,
        firstName: "Old",
        lastName: "Patient",
      });
      prisma.patient.update.mockResolvedValue({ id: patientId });

      await service.update({
        id: patientId,
        data: { privacyNoticeAccepted: true },
        userSession: doctorSession,
      });

      const updateData = prisma.patient.update.mock.calls[0][0].data;
      expect(updateData.privacyNoticeAcceptedAt).toBeInstanceOf(Date);
      expect(updateData.privacyNoticeVersion).toEqual(expect.any(String));
      expect(updateData.privacyNoticeAcceptedById).toBe(DOCTOR_USER_ID);
    });
  });
});
