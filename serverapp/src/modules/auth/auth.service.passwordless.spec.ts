import * as bcrypt from "bcrypt";
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

// `bcrypt` nativo no permite redefinir sus exports: se mockea el módulo
// entero. `compare` devuelve `true` a propósito: si el código alcanzara la
// comparación con una contraseña nula, el login "tendría éxito" y el test
// fallaría al esperando el 401.
jest.mock("bcrypt");

/**
 * S1 (patient-onboarding) / D2a — una cuenta creada por INVITACIÓN nace sin
 * contraseña (`password: null`) hasta que el paciente define la suya.
 *
 * Ese estado NO puede romper el login: debe fallar con un 401 normal, nunca
 * con un 500 y nunca dentro de `bcrypt`.
 */
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

const passwordlessUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "paciente@nutringest.test",
  firstName: "Lucia",
  lastName: "Gomez",
  username: "lucia",
  status: "ACTIVE",
  password: null,
  hashedRefreshToken: null,
  emailVerificationToken: null,
  emailVerificationExpiresAt: null,
  resetPasswordToken: null,
  resetPasswordExpiresAt: null,
  lockedUntil: null,
  failedLoginAttempts: 0,
  permits: { id: "PATIENT", name: "PATIENT", list: [] },
};

describe("AuthService — cuenta sin contraseña (invitación pendiente)", () => {
  beforeEach(() => {
    (bcrypt.compare as unknown as jest.Mock).mockReset();
    (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);
  });

  it("rechaza el login con 401 y sin lanzar errores internos", async () => {
    const { service, userService, prisma } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(passwordlessUser);

    const promise = service.signinLocal({
      email: "paciente@nutringest.test",
      password: "cualquier-cosa",
    } as any);

    await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);

    // El rechazo NO se contabiliza como intento fallido: la cuenta nunca
    // tuvo una contraseña que adivinar.
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("nunca llama a bcrypt con una contraseña nula", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(passwordlessUser);
    (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);

    await expect(
      service.signinLocal({
        email: "paciente@nutringest.test",
        password: "cualquier-cosa",
      } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("validateUser devuelve null (sin comparar) para una cuenta sin contraseña", async () => {
    const { service, userService } = makeHarness();
    userService.findForAuthByEmail.mockResolvedValue(passwordlessUser);
    (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);

    const result = await service.validateUser(
      "paciente@nutringest.test",
      "cualquier-cosa",
    );

    expect(result).toBeNull();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});
