import { ForbiddenException } from "@nestjs/common";
import { PatientNutritionistRole } from "@prisma/client";
import { User } from "src/shared/types/schema.types";
import PediatricHistoryRepository from "../repository/pediatric-history.repository";
import { PediatricHistoryService } from "./pediatric-history.service";

const NUT_OWNER = "nut-owner";
const NUT_INTRUDER = "nut-intruder";
const PATIENT_USER_ID = "patient-user-1";
const PATIENT_ID = "patient-prof-1";
const OTHER_PATIENT_ID = "other-patient-prof-99";
const RECORD_ID = "pediatric-hist-1";

function nutritionistSession(nutritionistId: string, isAdmin = false): User {
  return {
    id: "nut-user-1",
    email: "nut@test.com",
    username: "nut",
    status: "ACTIVE",
    nutritionistProfile: { id: nutritionistId },
    permits: { list: isAdmin ? ["PATIENT_LIST_ALL"] : [] },
  } as unknown as User;
}

function patientSession(userId: string = PATIENT_USER_ID, patientId: string = PATIENT_ID): User {
  return {
    id: userId,
    email: "pediatric@test.com",
    username: "kid",
    status: "ACTIVE",
    permits: { name: "PATIENT", list: ["PATIENT_DASHBOARD"] },
    patientProfiles: [{ id: patientId }],
  } as unknown as User;
}

function recordWith(
  memberships: Array<{
    nutritionistId: string;
    isActive: boolean;
    role: PatientNutritionistRole;
  }> | null,
  patientUserId = PATIENT_USER_ID,
  patientId = PATIENT_ID,
): any {
  return {
    id: RECORD_ID,
    patientId: patientId,
    weightKg: 18.5,
    heightCm: 110,
    isActive: true,
    patient: {
      id: patientId,
      userId: patientUserId,
      nutritionists: memberships,
    },
  };
}

describe("PediatricHistoryService — Control de acceso y portal paciente", () => {
  let prisma: any;
  let pediatricHistoryRepository: any;
  let service: PediatricHistoryService;

  beforeEach(() => {
    prisma = {
      patient: { findFirst: jest.fn() },
      pediatricHistory: { findUnique: jest.fn() },
    };
    pediatricHistoryRepository = {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new PediatricHistoryService(
      pediatricHistoryRepository,
      prisma,
    );
  });

  describe("getLastActive (Lectura)", () => {
    it("permite a un paciente leer su propia historia pediátrica", async () => {
      const session = patientSession();
      prisma.patient.findFirst.mockResolvedValue({
        id: PATIENT_ID,
        userId: PATIENT_USER_ID,
      });
      const record = recordWith(null);
      pediatricHistoryRepository.findFirst.mockResolvedValue(record);

      const result = await service.getLastActive({
        patientId: PATIENT_ID,
        userSession: session,
      });

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: PATIENT_ID }, { userId: PATIENT_ID }],
          AND: [
            {
              OR: [
                { userId: PATIENT_USER_ID },
                { id: PATIENT_ID },
              ],
            },
          ],
        },
      });
      expect(pediatricHistoryRepository.findFirst).toHaveBeenCalledWith({
        where: { patientId: PATIENT_ID, isActive: true },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toBe(record);
    });

    it("bloquea a un paciente que intenta leer el expediente de otro paciente", async () => {
      const session = patientSession();
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.getLastActive({
          patientId: OTHER_PATIENT_ID,
          userSession: session,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(pediatricHistoryRepository.findFirst).not.toHaveBeenCalled();
    });

    it("permite al nutricionista asignado leer la historia de su paciente", async () => {
      const session = nutritionistSession(NUT_OWNER);
      prisma.patient.findFirst.mockResolvedValue({
        id: PATIENT_ID,
      });
      pediatricHistoryRepository.findFirst.mockResolvedValue(recordWith([]));

      await service.getLastActive({
        patientId: PATIENT_ID,
        userSession: session,
      });

      expect(prisma.patient.findFirst).toHaveBeenCalled();
      expect(pediatricHistoryRepository.findFirst).toHaveBeenCalled();
    });
  });

  describe("Mutaciones restringidas (create / update / softDelete)", () => {
    it("permite a un paciente crear una historia pediátrica para su propio perfil", async () => {
      const session = patientSession(PATIENT_USER_ID, PATIENT_ID);
      prisma.patient.findFirst.mockResolvedValue({
        id: PATIENT_ID,
        userId: PATIENT_USER_ID,
      });
      pediatricHistoryRepository.create.mockResolvedValue({ id: "new-record" });

      const result = await service.create({
        userSession: session,
        data: { patientId: PATIENT_ID, weightKg: 20 },
      });

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: PATIENT_ID }, { userId: PATIENT_ID }],
          AND: [
            {
              OR: [
                { userId: PATIENT_USER_ID },
                { id: PATIENT_ID },
              ],
            },
          ],
        },
      });
      expect(result).toEqual({ id: "new-record" });
      expect(pediatricHistoryRepository.create).toHaveBeenCalled();
    });

    it("bloquea a un paciente que intenta crear una historia para otro paciente", async () => {
      const session = patientSession(PATIENT_USER_ID, PATIENT_ID);
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          userSession: session,
          data: { patientId: OTHER_PATIENT_ID, weightKg: 20 },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(pediatricHistoryRepository.create).not.toHaveBeenCalled();
    });

    it("permite a un paciente actualizar su propia historia pediátrica", async () => {
      const session = patientSession(PATIENT_USER_ID, PATIENT_ID);
      prisma.pediatricHistory.findUnique.mockResolvedValue(recordWith(null, PATIENT_USER_ID));
      pediatricHistoryRepository.update.mockResolvedValue({ id: RECORD_ID, weightKg: 21 });

      const result = await service.update({
        id: RECORD_ID,
        userSession: session,
        data: { weightKg: 21 },
      });

      expect(prisma.pediatricHistory.findUnique).toHaveBeenCalledWith({
        where: { id: RECORD_ID },
        include: { patient: true },
      });
      expect(result).toEqual({ id: RECORD_ID, weightKg: 21 });
      expect(pediatricHistoryRepository.update).toHaveBeenCalled();
    });

    it("bloquea a un paciente que intenta actualizar una historia ajena", async () => {
      const session = patientSession(PATIENT_USER_ID, PATIENT_ID);
      prisma.pediatricHistory.findUnique.mockResolvedValue(
        recordWith(null, "other-user-99", OTHER_PATIENT_ID),
      );

      await expect(
        service.update({
          id: RECORD_ID,
          userSession: session,
          data: { weightKg: 21 },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(pediatricHistoryRepository.update).not.toHaveBeenCalled();
    });

    it("prohíbe al paciente eliminar una historia pediátrica", async () => {
      const session = patientSession();

      await expect(
        service.softDelete({
          id: RECORD_ID,
          userSession: session,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(pediatricHistoryRepository.softDelete).not.toHaveBeenCalled();
    });

    it("permite al nutricionista crear una historia si tiene acceso", async () => {
      const session = nutritionistSession(NUT_OWNER);
      prisma.patient.findFirst.mockResolvedValue({ id: PATIENT_ID });
      pediatricHistoryRepository.create.mockResolvedValue({ id: "new-record" });

      const result = await service.create({
        userSession: session,
        data: { patientId: PATIENT_ID, weightKg: 20 },
      });

      expect(result).toEqual({ id: "new-record" });
      expect(pediatricHistoryRepository.create).toHaveBeenCalled();
    });

    it("rechaza al nutricionista si no tiene asignado al paciente para crear", async () => {
      const session = nutritionistSession(NUT_INTRUDER);
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          userSession: session,
          data: { patientId: PATIENT_ID, weightKg: 20 },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(pediatricHistoryRepository.create).not.toHaveBeenCalled();
    });
  });
});
