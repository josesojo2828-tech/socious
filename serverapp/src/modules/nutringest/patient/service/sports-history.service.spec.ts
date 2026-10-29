import { ForbiddenException } from "@nestjs/common";
import { PatientNutritionistRole } from "@prisma/client";
import { User } from "src/shared/types/schema.types";
import SportsHistoryRepository from "../repository/sports-history.repository";
import { SportsHistoryService } from "./sports-history.service";

const NUT_OWNER = "nut-owner";
const NUT_INTRUDER = "nut-intruder";
const RECORD_ID = "sports-1";
const PATIENT_ID = "patient-1";

function userSession(nutritionistId: string): User {
  return {
    id: "user-1",
    email: "ana@test.com",
    username: "ana",
    password: "secret",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    nutritionistProfile: { id: nutritionistId },
  } as unknown as User;
}

function recordWith(
  memberships: Array<{
    nutritionistId: string;
    isActive: boolean;
    role: PatientNutritionistRole;
  }> | null,
): any {
  return {
    id: RECORD_ID,
    patientId: PATIENT_ID,
    isActive: true,
    patient: { id: PATIENT_ID, nutritionists: memberships },
  };
}

function activeMembership(
  nutritionistId: string,
  role: PatientNutritionistRole = PatientNutritionistRole.PRIMARY,
) {
  return { nutritionistId, isActive: true, role };
}

function createService() {
  const prisma = {
    patient: { findFirst: jest.fn() },
    sportsHistory: { findUnique: jest.fn(), update: jest.fn() },
  };
  const sportsHistoryRepository = {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const service = new SportsHistoryService(
    sportsHistoryRepository as any,
    prisma as any,
  );
  return { prisma, sportsHistoryRepository, service };
}

describe("SportsHistoryService — acceso y soft-delete (F2.6)", () => {
  describe("softDelete", () => {
    it("como owner: delega en el repositorio y devuelve el registro con isActive=false", async () => {
      const { prisma, sportsHistoryRepository, service } = createService();
      prisma.sportsHistory.findUnique.mockResolvedValue(
        recordWith([activeMembership(NUT_OWNER)]),
      );
      const softDeleted = {
        id: RECORD_ID,
        patientId: PATIENT_ID,
        isActive: false,
        deletedAt: new Date(),
      };
      sportsHistoryRepository.softDelete.mockResolvedValue(softDeleted);

      const result = await service.softDelete({
        id: RECORD_ID,
        userSession: userSession(NUT_OWNER),
      });

      expect(sportsHistoryRepository.softDelete).toHaveBeenCalledWith({
        where: { id: RECORD_ID },
      });
      expect(result).toEqual(softDeleted);
      expect(result?.isActive).toBe(false);
    });

    it("como NO-owner: lanza ForbiddenException (403) y no toca el repositorio", async () => {
      const { prisma, sportsHistoryRepository, service } = createService();
      prisma.sportsHistory.findUnique.mockResolvedValue(
        recordWith([activeMembership(NUT_OWNER)]),
      );

      await expect(
        service.softDelete({
          id: RECORD_ID,
          userSession: userSession(NUT_INTRUDER),
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(sportsHistoryRepository.softDelete).not.toHaveBeenCalled();
    });

    it("registro inexistente: lanza ForbiddenException (403)", async () => {
      const { prisma, sportsHistoryRepository, service } = createService();
      prisma.sportsHistory.findUnique.mockResolvedValue(null);

      await expect(
        service.softDelete({
          id: RECORD_ID,
          userSession: userSession(NUT_OWNER),
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(sportsHistoryRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("como NO-owner: lanza ForbiddenException (403) antes de actualizar", async () => {
      const { prisma, sportsHistoryRepository, service } = createService();
      prisma.sportsHistory.findUnique.mockResolvedValue(
        recordWith([activeMembership(NUT_OWNER)]),
      );

      await expect(
        service.update({
          id: RECORD_ID,
          userSession: userSession(NUT_INTRUDER),
          data: { ffmKg: 50 },
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(sportsHistoryRepository.update).not.toHaveBeenCalled();
    });
  });
});

describe("SportsHistoryRepository.softDelete — marca isActive=false", () => {
  it("persiste isActive=false + deletedAt vía prisma", async () => {
    const prisma = { sportsHistory: { update: jest.fn() } };
    const eventEmitter = { emit: jest.fn() };
    const logger = { logError: jest.fn() };
    prisma.sportsHistory.update.mockResolvedValue({
      id: RECORD_ID,
      patientId: PATIENT_ID,
      isActive: false,
      deletedAt: new Date(),
      disciplines: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const repository = new SportsHistoryRepository(
      prisma as any,
      eventEmitter as any,
      logger as any,
    );
    const result = await repository.softDelete({ where: { id: RECORD_ID } });

    expect(prisma.sportsHistory.update).toHaveBeenCalledWith({
      where: { id: RECORD_ID },
      data: { isActive: false, deletedAt: expect.any(Date) },
      include: expect.any(Object),
    });
    expect(result?.isActive).toBe(false);
    expect(result?.deletedAt).toBeInstanceOf(Date);
  });
});
