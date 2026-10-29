import * as bcrypt from "bcrypt";
import { AuthService, TERMS_VERSION } from "./auth.service";

/**
 * Phase 8 (task 8.3) — R1 payload regression: `/api/auth/login`.
 *
 * The roles-permisos change required NO payload change (`permits` +
 * `userPermissions` were already delivered by `DEFAULT_INCLUDE` + `format()`).
 * This spec LOCKS the login contract: `signinLocal` returns the user with both
 * fields intact and strips only secrets (password, refresh-token hash, tokens).
 */
const PASSWORD = "super-secret-password";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const makeFormattedUser = (overrides: Record<string, unknown> = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  email: "ana@nutringest.test",
  firstName: "Ana",
  lastName: "Diaz",
  username: "ana",
  fullName: "Ana Diaz",
  status: "ACTIVE",
  password: PASSWORD_HASH,
  hashedRefreshToken: "refresh-token-hash",
  emailVerificationToken: null,
  emailVerificationExpiresAt: null,
  resetPasswordToken: null,
  resetPasswordExpiresAt: null,
  lockedUntil: null,
  failedLoginAttempts: 0,
  permits: { id: "USER", name: "USER", list: ["USER_LIST"] },
  userPermissions: [{ id: "perm-1", permission: "USER_DELETE", expiresAt: null }],
  ...overrides,
});

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

  return { service, userService, prisma, jwtService, mailService };
};

describe("AuthService.signinLocal — R1 login payload contract (task 8.3)", () => {
  it("returns permits + userPermissions and strips only secrets", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(makeFormattedUser());

    const { user, tokens } = await service.signinLocal({
      email: "ana@nutringest.test",
      password: PASSWORD,
    } as any);

    expect(user.permits).toEqual({ id: "USER", name: "USER", list: ["USER_LIST"] });
    expect(user.userPermissions).toEqual([
      { id: "perm-1", permission: "USER_DELETE", expiresAt: null },
    ]);

    expect((user as any).password).toBeUndefined();
    expect((user as any).hashedRefreshToken).toBeUndefined();
    expect((user as any).resetPasswordToken).toBeUndefined();
    expect((user as any).emailVerificationToken).toBeUndefined();

    expect(tokens.access_token).toBe("signed-token");
    expect(tokens.refresh_token).toBe("signed-token");
  });

  it("keeps userPermissions as an array (possibly empty), never undefined", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(
      makeFormattedUser({ userPermissions: [] }),
    );

    const { user } = await service.signinLocal({
      email: "ana@nutringest.test",
      password: PASSWORD,
    } as any);

    expect(Array.isArray(user.userPermissions)).toBe(true);
    expect(user.userPermissions).toEqual([]);
  });
});

/**
 * S1 (legal-compliance) — proof of consent on registration.
 *
 * `registerLocal` must persist the acceptance timestamp, the accepted terms
 * version, and the salted IP hash (never a raw IP) on the created user.
 */
describe("AuthService.registerLocal — S1 prueba de consentimiento", () => {
  const REGISTER_DTO = {
    firstName: "Ana",
    lastName: "Diaz",
    email: "ana@nutringest.test",
    password: "secret123",
    confirmPassword: "secret123",
    acceptedTerms: true,
    birthDate: "1990-05-15",
  } as any;

  it("persiste fecha, versión e IP hasheada de la aceptación", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({
      id: "user-1",
      email: "ana@nutringest.test",
      firstName: "Ana",
    });

    await service.registerLocal(REGISTER_DTO, { ip: "203.0.113.7" });

    expect(userService.createUser).toHaveBeenCalledTimes(1);
    expect(userService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        termsAcceptedAt: expect.any(Date),
        termsVersion: TERMS_VERSION,
        termsAcceptedIpHash: expect.any(String),
      }),
    );

    // La IP jamás se guarda en claro: solo el digest sha256 truncado (32 hex).
    const stored = (userService.createUser.mock.calls[0][0] as any)
      .termsAcceptedIpHash;
    expect(stored).not.toContain("203.0.113.7");
    expect(stored).toMatch(/^[0-9a-f]{32}$/);
  });

  it("funciona sin contexto de IP (hash ausente, sin romper el registro)", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({
      id: "user-2",
      email: "otra@nutringest.test",
      firstName: "Otra",
    });

    await service.registerLocal({
      ...REGISTER_DTO,
      email: "otra@nutringest.test",
    });

    expect(userService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        termsAcceptedAt: expect.any(Date),
        termsVersion: TERMS_VERSION,
      }),
    );
  });
});

/**
 * S7 (legal-compliance): the public registration must block minors — they
 * cannot legally accept the Terms and Privacy Policy.
 */
describe("AuthService.registerLocal — S7 gate de edad", () => {
  const REGISTER_DTO = {
    firstName: "Leo",
    lastName: "Menor",
    email: "leo@nutringest.test",
    password: "secret123",
    confirmPassword: "secret123",
    acceptedTerms: true,
    birthDate: "2012-03-10",
  } as any;

  /**
   * Fecha de nacimiento de un adulto, calculada sobre el calendario UTC.
   *
   * La versión anterior usaba `setFullYear` + `toISOString()`: al cruzar a
   * 2008 el huso local venezolano pasó de -04:00 a -04:30 (horario estándar),
   * y la conversión a UTC empujaba la fecha un día. A partir de las 19:30
   * hora local el fixture devolvía el día siguiente, un menor de 18 años, y
   * el test "exactly 18 years old" fallaba por la zona horaria y no por el
   * gate. El gate de edad compara en UTC, así que el fixture también.
   */
  const adultBirthDate = (yearsAgo: number) => {
    const now = new Date();
    const year = now.getUTCFullYear() - yearsAgo;
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  it("rejects registration when the applicant is a minor", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(null);

    await expect(service.registerLocal(REGISTER_DTO)).rejects.toThrow(
      "Debes ser mayor de 18 años para crear una cuenta en Nutringest.",
    );

    expect(userService.createUser).not.toHaveBeenCalled();
  });

  it("rejects registration with an invalid birthDate", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(null);

    await expect(
      service.registerLocal({ ...REGISTER_DTO, birthDate: "not-a-date" }),
    ).rejects.toThrow("Fecha de nacimiento inválida.");

    expect(userService.createUser).not.toHaveBeenCalled();
  });

  it("accepts adults and persists the birthDate on the created user", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({
      id: "user-adult",
      email: REGISTER_DTO.email,
      firstName: REGISTER_DTO.firstName,
    });

    await service.registerLocal({
      ...REGISTER_DTO,
      birthDate: adultBirthDate(30),
    });

    expect(userService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        birthDate: expect.any(Date),
      }),
    );
  });

  it("accepts someone who is exactly 18 years old", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({
      id: "user-18",
      email: REGISTER_DTO.email,
      firstName: REGISTER_DTO.firstName,
    });

    await service.registerLocal({
      ...REGISTER_DTO,
      birthDate: adultBirthDate(18),
    });

    expect(userService.createUser).toHaveBeenCalled();
  });
});
