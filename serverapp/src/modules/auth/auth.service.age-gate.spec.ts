import { AuthService } from "./auth.service";

/**
 * S7 (legal-compliance) — gate de edad INDEPENDIENTE DEL TIMEZONE.
 *
 * El bug: `registerLocal` parseaba `birthDate` con `new Date(dto.birthDate)`
 * (medianoche UTC) pero `calculateAge` comparaba contra los getters LOCALES
 * (`getFullYear`/`getMonth`/`getDate`). En cualquier servidor al oeste de UTC
 * (el mercado del producto es `America/Caracas`) una persona que cumplía 18
 * AÑOS MAÑANA era aceptada y `createUser` llegaba a ejecutarse: el gate
 * estaba corrido un día.
 *
 * Estos tests fijan el instante (`jest.setSystemTime`) para que el resultado no
 * dependa de la hora a la que corre la suite, y se ejecutan con
 * `TZ=America/Caracas` y `TZ=UTC` para probar que el veredicto es el mismo.
 */
const NOW_ISO = "2026-06-15T12:00:00.000Z";

/** Instante fijo: 15/06/2026 12:00 UTC. */
const NOW = new Date(NOW_ISO);

/** Cumple 18 años HOY (en calendario UTC). */
const TURNS_18_TODAY = "2008-06-15";

/** Cumple 18 años MAÑANA (en calendario UTC). */
const TURNS_18_TOMORROW = "2008-06-16";

/** Menor de edad TODAY — 17 años cumplidos. */
const MINOR = "2009-06-15";

/** Adulto con margen amplio. */
const ADULT = "1990-05-15";

const AGE_ERROR =
  "Debes ser mayor de 18 años para crear una cuenta en Nutringest.";

const makeHarness = () => {
  const userService = {
    findOne: jest.fn(),
    findForAuthByEmail: jest.fn(),
    createUser: jest.fn(),
  };
  const prisma = {
    user: { update: jest.fn().mockResolvedValue({}) },
    organizationMember: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue("signed-token") };
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logInfo: jest.fn(),
    logError: jest.fn(),
  };
  const mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
  const env: Record<string, string> = {
    AT_SECRET: "access-secret",
    RT_SECRET: "refresh-secret",
    TELEMETRY_ENABLED: "false",
  };
  const config = { get: jest.fn((key: string) => env[key]) };
  const eventEmitter = { emit: jest.fn() };

  const service = new AuthService(
    userService as any,
    prisma as any,
    jwtService as any,
    logger as any,
    mailService as any,
    config as any,
    eventEmitter as any,
  );

  return { service, userService };
};

const REGISTER_DTO = {
  firstName: "Ana",
  lastName: "Diaz",
  email: "ana@nutringest.test",
  password: "secret123",
  confirmPassword: "secret123",
  acceptedTerms: true,
} as any;

describe("AuthService.registerLocal — S7 gate de edad sin dependencia de timezone", () => {
  beforeAll(() => {
    // Fijamos el reloj sin tocar el event loop (bcrypt, timers, etc.).
    jest.useFakeTimers({
      doNotFake: [
        "nextTick",
        "setImmediate",
        "clearImmediate",
        "queueMicrotask",
        "performance",
        "hrtime",
      ],
    });
    jest.setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(NOW);
  });

  it("RECHAZA a quien cumple 18 años mañana (no debe llegar a createUser)", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(null);

    await expect(
      service.registerLocal({
        ...REGISTER_DTO,
        birthDate: TURNS_18_TOMORROW,
      }),
    ).rejects.toThrow(AGE_ERROR);

    expect(userService.createUser).not.toHaveBeenCalled();
  });

  it("ACEPTA a quien cumple 18 años hoy", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({
      id: "user-18",
      email: REGISTER_DTO.email,
      firstName: REGISTER_DTO.firstName,
    });

    await service.registerLocal({
      ...REGISTER_DTO,
      birthDate: TURNS_18_TODAY,
    });

    expect(userService.createUser).toHaveBeenCalledTimes(1);
  });

  it("RECHAZA a un menor de edad (17 años) con el mensaje existente", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(null);

    await expect(
      service.registerLocal({ ...REGISTER_DTO, birthDate: MINOR }),
    ).rejects.toThrow(AGE_ERROR);

    expect(userService.createUser).not.toHaveBeenCalled();
  });

  it("ACEPTA a un adulto (30 años) y persiste la fecha tipeada sin cambiarla", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({
      id: "user-adult",
      email: REGISTER_DTO.email,
      firstName: REGISTER_DTO.firstName,
    });

    await service.registerLocal({
      ...REGISTER_DTO,
      birthDate: ADULT,
    });

    expect(userService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        // La fecha almacenada sigue siendo la que el usuario tipeó
        // (medianoche UTC del día tipeado): no se cambia el formato de storage.
        birthDate: new Date("1990-05-15T00:00:00.000Z"),
      }),
    );
  });

  it("RECHAZA una fecha de nacimiento inválida con el mensaje existente", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(null);

    await expect(
      service.registerLocal({ ...REGISTER_DTO, birthDate: "not-a-date" }),
    ).rejects.toThrow("Fecha de nacimiento inválida.");

    expect(userService.createUser).not.toHaveBeenCalled();
  });
});
