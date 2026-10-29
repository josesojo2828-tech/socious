import { AnthropometryService } from "./anthropometry.service";

describe("AnthropometryService — residual mass persistence", () => {
  let service: AnthropometryService;
  let prisma: any;
  let repository: any;
  let eventEmitter: any;
  let logger: any;

  const userSession = {
    id: "user-1",
    nutritionistProfile: { id: "nutri-1" },
  } as any;

  // Mismo set de entradas que el fixture adulto de anthropometry-calculator.spec:
  // con edad >= 18 las tres masas se computan y el residual también.
  const fullMeasurements = {
    date: "2026-10-01",
    weight: 112.3,
    height: 164.5,
    sittingHeight: 88,
    armSpan: 160.5,
    tricipital: 35,
    bicipital: 20,
    subscapular: 43,
    suprailiac: 45,
    skinfoldSupraspinale: 36,
    abdominal: 32,
    thigh: 52,
    calf: 43,
    c_arm_relaxed: 45,
    c_arm_flexed: 45.2,
    waist: 102,
    hip: 129.3,
    girthThighMid: 78,
    c_calf: 47.5,
    diameterHumeral: 7.8,
    diameterBiestiloid: 5.2,
    diameterFemoral: 12.4,
  };

  const adultPatient = {
    id: "patient-adult",
    gender: "FEMALE",
    birthDate: new Date("1990-01-01"),
  };

  const pediatricPatient = {
    id: "patient-kid",
    gender: "FEMALE",
    birthDate: new Date(new Date().getFullYear() - 10, 0, 1),
  };

  beforeEach(() => {
    eventEmitter = { emit: jest.fn() };
    logger = { logError: jest.fn(), logInfo: jest.fn() };
    repository = {
      EVENT_CREATED: "ANTHRO_CREATED",
      EVENT_CREATED_SUCCESS: "ANTHRO_CREATED_SUCCESS",
      EVENT_UPDATED: "ANTHRO_UPDATED",
      EVENT_UPDATED_SUCCESS: "ANTHRO_UPDATED_SUCCESS",
      MODEL_NAME: "Anthropometry",
      create: jest.fn().mockResolvedValue({ id: "anthro-1" }),
      update: jest.fn().mockResolvedValue({ id: "anthro-1" }),
      findMany: jest.fn().mockResolvedValue([]),
    };
    prisma = {
      patient: { findFirst: jest.fn() },
      anthropometry: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      goal: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
    };
    service = new AnthropometryService(
      eventEmitter,
      repository,
      prisma,
      { t: (key: string) => key } as any,
      logger,
    );
  });

  it("create: persiste residualMass como null cuando el paciente es menor de 18", async () => {
    prisma.patient.findFirst.mockResolvedValue(pediatricPatient);

    await service.create({
      userSession,
      data: { patientId: pediatricPatient.id, ...fullMeasurements },
    });

    expect(repository.create).toHaveBeenCalledTimes(1);
    const persisted = repository.create.mock.calls[0][0].data;
    expect(persisted.residualMass).toBeNull();
  });

  it("create: persiste residualMass numérico para un adulto con fraccionamiento completo", async () => {
    prisma.patient.findFirst.mockResolvedValue(adultPatient);

    await service.create({
      userSession,
      data: { patientId: adultPatient.id, ...fullMeasurements },
    });

    expect(repository.create).toHaveBeenCalledTimes(1);
    const persisted = repository.create.mock.calls[0][0].data;
    expect(typeof persisted.residualMass).toBe("number");
    expect(persisted.residualMass).toBeGreaterThanOrEqual(0);
  });

  it("update: pisa residualMass previo con null al re-guardar una medición pediátrica", async () => {
    prisma.anthropometry.findUnique.mockResolvedValue({
      id: "anthro-1",
      patientId: pediatricPatient.id,
      date: new Date("2026-10-01"),
      residualMass: 2.5,
      usualWeight: null,
      visceralFat: null,
      metabolicAge: null,
      waterPercentage: null,
    });
    prisma.patient.findFirst.mockResolvedValue(pediatricPatient);

    await service.update({
      id: "anthro-1",
      userSession,
      data: fullMeasurements,
    });

    expect(repository.update).toHaveBeenCalledTimes(1);
    const persisted = repository.update.mock.calls[0][0].data;
    expect(persisted.residualMass).toBeNull();
  });

  it("getMetrics: conserva residualMass null en el dataset en vez de coercerlo a 0", async () => {
    prisma.patient.findFirst.mockResolvedValue(adultPatient);
    repository.findMany.mockResolvedValue([
      { date: new Date("2026-10-01"), weight: 70, residualMass: null },
      { date: new Date("2026-10-15"), weight: 71, residualMass: 14.2 },
    ]);

    const metrics = await service.getMetrics({
      patientId: adultPatient.id,
      userSession,
    });

    expect(metrics.datasets.residualMass).toEqual([null, 14.2]);
  });
});
