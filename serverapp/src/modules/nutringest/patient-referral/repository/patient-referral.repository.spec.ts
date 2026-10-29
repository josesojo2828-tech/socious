import { PatientNutritionistRole, PatientReferralStatus, ReferralType } from "@prisma/client";
import PatientReferralModel from "../model/patient-referral.model";
import PatientReferralRepository from "./patient-referral.repository";

class TestModel extends PatientReferralModel {}

const EVENTS = new TestModel();

const PATIENT_ID = "patient-1";
const NUT_FROM = "nut-from";
const NUT_TO = "nut-to";
const REFERRAL_ID = "referral-1";

const updatedReferral = (overrides: Partial<any> = {}) => ({
  id: REFERRAL_ID,
  patientId: PATIENT_ID,
  fromNutritionistId: NUT_FROM,
  toNutritionistId: NUT_TO,
  status: PatientReferralStatus.ACCEPTED,
  ...overrides,
});

function createRepository() {
  const tx = {
    patientReferral: { update: jest.fn() },
    patientNutritionist: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (tx: typeof tx) => unknown) => callback(tx)),
  };
  const eventEmitter = { emit: jest.fn() };
  const logger = { logInfo: jest.fn(), logError: jest.fn() };

  const repository = new PatientReferralRepository(
    prisma as any,
    eventEmitter as any,
    logger as any,
  );

  return { tx, prisma, eventEmitter, logger, repository };
}

describe("PatientReferralRepository.accept", () => {
  it("TRANSFER: degrada al source a SUPPORT y promueve al target a PRIMARY (ambos activos)", async () => {
    const { tx, repository } = createRepository();
    tx.patientReferral.update.mockResolvedValue(updatedReferral());
    tx.patientNutritionist.findFirst.mockResolvedValue({
      patientId: PATIENT_ID,
      nutritionistId: NUT_FROM,
      role: PatientNutritionistRole.PRIMARY,
      isActive: true,
    });

    await repository.accept({
      id: REFERRAL_ID,
      actorId: NUT_TO,
      type: ReferralType.TRANSFER,
    });

    expect(tx.patientReferral.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: REFERRAL_ID },
        data: expect.objectContaining({
          status: PatientReferralStatus.ACCEPTED,
          respondedById: NUT_TO,
        }),
      }),
    );

    expect(tx.patientNutritionist.findFirst).toHaveBeenCalledWith({
      where: { patientId: PATIENT_ID, nutritionistId: NUT_FROM },
    });

    expect(tx.patientNutritionist.update).toHaveBeenCalledWith({
      where: {
        patientId_nutritionistId: { patientId: PATIENT_ID, nutritionistId: NUT_FROM },
      },
      data: { role: PatientNutritionistRole.SUPPORT, isActive: true },
    });

    expect(tx.patientNutritionist.upsert).toHaveBeenCalledWith({
      where: {
        patientId_nutritionistId: { patientId: PATIENT_ID, nutritionistId: NUT_TO },
      },
      create: expect.objectContaining({
        nutritionistId: NUT_TO,
        role: PatientNutritionistRole.PRIMARY,
        isActive: true,
        assignedById: NUT_FROM,
      }),
      update: expect.objectContaining({
        role: PatientNutritionistRole.PRIMARY,
        isActive: true,
        assignedById: NUT_FROM,
      }),
    });
  });

  it("TRANSFER sin fila del source: no degrada y solo upserta al target como PRIMARY", async () => {
    const { tx, repository } = createRepository();
    tx.patientReferral.update.mockResolvedValue(updatedReferral());
    tx.patientNutritionist.findFirst.mockResolvedValue(null);

    await repository.accept({
      id: REFERRAL_ID,
      actorId: NUT_TO,
      type: ReferralType.TRANSFER,
    });

    expect(tx.patientNutritionist.update).not.toHaveBeenCalled();
    expect(tx.patientNutritionist.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          role: PatientNutritionistRole.PRIMARY,
          isActive: true,
        }),
      }),
    );
  });

  it("COLLABORATOR: el target se une como SUPPORT y el source (PRIMARY) no se toca", async () => {
    const { tx, repository } = createRepository();
    tx.patientReferral.update.mockResolvedValue(updatedReferral());

    await repository.accept({
      id: REFERRAL_ID,
      actorId: NUT_TO,
      type: ReferralType.COLLABORATOR,
    });

    expect(tx.patientNutritionist.findFirst).not.toHaveBeenCalled();
    expect(tx.patientNutritionist.update).not.toHaveBeenCalled();

    expect(tx.patientNutritionist.upsert).toHaveBeenCalledWith({
      where: {
        patientId_nutritionistId: { patientId: PATIENT_ID, nutritionistId: NUT_TO },
      },
      create: expect.objectContaining({
        nutritionistId: NUT_TO,
        role: PatientNutritionistRole.SUPPORT,
        isActive: true,
        assignedById: NUT_FROM,
      }),
      update: expect.objectContaining({
        isActive: true,
        assignedById: NUT_FROM,
      }),
    });
  });

  it("emite los eventos de dominio ACCEPTED / ACCEPTED_SUCCESS", async () => {
    const { tx, eventEmitter, repository } = createRepository();
    tx.patientReferral.update.mockResolvedValue(updatedReferral());

    await repository.accept({
      id: REFERRAL_ID,
      actorId: NUT_TO,
      type: ReferralType.COLLABORATOR,
    });

    const emitted = eventEmitter.emit.mock.calls.map((call) => call[0]);
    expect(emitted).toEqual([
      EVENTS.EVENT_ACCEPTED,
      EVENTS.EVENT_ACCEPTED_SUCCESS,
    ]);
  });
});
