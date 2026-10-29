import "reflect-metadata";

import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { ThrottlerGuard } from "@nestjs/throttler";

import { IS_PUBLIC_KEY } from "src/shared/decorators/public.decorator";
import { PatientInvitationController } from "./patient-invitation.controller";
import { INVALID_INVITATION_MESSAGE } from "./patient-invitation.service";

/**
 * S1 (patient-onboarding) · A3: contrato HTTP del endpoint público de
 * invitación.
 *
 * Lo que se fija aquí:
 *   - `GET /status` devuelve SOLO el estado de la invitación (nunca datos
 *     identificatorios del paciente);
 *   - `POST /accept` emite sesión (tokens + usuario) como el login;
 *   - el error de `accept` es SIEMPRE el mismo, sin enumerar si el token fue
 *     inválido, expirado, usado o revocado;
 *   - ambos endpoints son públicos y están protegidos por el rate limiter.
 */

const DTO = {
  token: "token-en-claro",
  password: "Abcd1234",
  confirmPassword: "Abcd1234",
};

const INVITED_USER = {
  id: "user-paciente",
  email: "paciente@example.test",
  firstName: "Ana",
  lastName: "Pérez",
};

function buildController() {
  const invitationService = {
    getInvitationStatus: jest.fn().mockResolvedValue("valid"),
    acceptInvitation: jest.fn().mockResolvedValue({ ...INVITED_USER }),
  };

  const authService = {
    getTokens: jest
      .fn()
      .mockResolvedValue({ access_token: "access-1", refresh_token: "refresh-1" }),
    updateRtHash: jest.fn().mockResolvedValue(undefined),
  };

  const moduleRef = {
    get: jest.fn().mockReturnValue(authService),
  };

  const controller = new PatientInvitationController(
    invitationService as any,
    moduleRef as any,
  );

  return { controller, invitationService, authService, moduleRef };
}

describe("PatientInvitationController — contrato de routing (A3)", () => {
  it("el controlador aplica el rate limiter (ThrottlerGuard) a nivel de clase", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, PatientInvitationController);
    expect(guards).toBeDefined();
    expect(guards).toContain(ThrottlerGuard);
  });

  it("status está marcado @Public()", () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PatientInvitationController.prototype.status,
      ),
    ).toBe(true);
  });

  it("accept está marcado @Public()", () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PatientInvitationController.prototype.accept,
      ),
    ).toBe(true);
  });
});

describe("PatientInvitationController — GET /status (A3)", () => {
  it("devuelve únicamente el estado de la invitación", async () => {
    const { controller } = buildController();

    const result = await controller.status("token-en-claro");

    expect(result).toEqual({ status: "valid" });
    expect(Object.keys(result)).toEqual(["status"]);
  });

  it("nunca expone datos identificatorios del paciente", async () => {
    const { controller, invitationService } = buildController();

    const result = await controller.status("token-en-claro");

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Ana");
    expect(serialized).not.toContain("Pérez");
    expect(serialized).not.toContain(INVITED_USER.email);
    expect(invitationService.acceptInvitation).not.toHaveBeenCalled();
  });

  it.each(["valid", "expired", "used", "invalid"])(
    "propaga el estado %s sin agregarle información",
    async (state) => {
      const { controller, invitationService } = buildController();
      invitationService.getInvitationStatus.mockResolvedValue(state);

      const result = await controller.status("token-en-claro");

      expect(result).toEqual({ status: state });
      expect(Object.keys(result)).toHaveLength(1);
    },
  );
});

describe("PatientInvitationController — POST /accept (A3)", () => {
  it("emite sesión con la misma forma que el login", async () => {
    const { controller, authService } = buildController();

    const result = await controller.accept(DTO as any);

    expect(authService.getTokens).toHaveBeenCalledWith(
      INVITED_USER.id,
      INVITED_USER.email,
    );
    expect(authService.updateRtHash).toHaveBeenCalledWith(
      INVITED_USER.id,
      "refresh-1",
      "access-1",
    );
    expect(result.tokens).toEqual({
      access_token: "access-1",
      refresh_token: "refresh-1",
    });
    expect(result.user).toEqual(INVITED_USER);
  });

  it("delega la aceptación en el servicio con token y contraseñas", async () => {
    const { controller, invitationService } = buildController();

    await controller.accept(DTO as any);

    expect(invitationService.acceptInvitation).toHaveBeenCalledWith({
      token: DTO.token,
      password: DTO.password,
      confirmPassword: DTO.confirmPassword,
    });
  });

  it("no devuelve la contraseña del paciente", async () => {
    const { controller } = buildController();

    const result = await controller.accept(DTO as any);

    expect(JSON.stringify(result)).not.toContain(DTO.password);
    expect(result.user).not.toHaveProperty("password");
  });

  it("exige la confirmación de la contraseña", async () => {
    const { controller, invitationService } = buildController();

    await expect(
      controller.accept({ token: DTO.token, password: DTO.password } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(invitationService.acceptInvitation).not.toHaveBeenCalled();
  });

  it("propaga el error de política de contraseña del servicio", async () => {
    const { controller, invitationService } = buildController();
    invitationService.acceptInvitation.mockRejectedValue(
      new BadRequestException(
        "La nueva contraseña debe tener al menos 8 caracteres",
      ),
    );

    await expect(controller.accept(DTO as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  const TOKEN_FAILURES: Array<[string, Error]> = [
    ["inválido", new ForbiddenException("Token inválido.")],
    ["expirado", new ForbiddenException("La invitación expiró.")],
    ["usado", new ForbiddenException("La invitación ya fue utilizada.")],
    ["revocado", new ForbiddenException("La invitación fue revocada.")],
  ];

  it.each(TOKEN_FAILURES)(
    "devuelve el MISMO error genérico para un token %s",
    async (_case, error) => {
      const { controller, invitationService, authService } = buildController();
      invitationService.acceptInvitation.mockRejectedValue(error);

      await expect(controller.accept(DTO as any)).rejects.toMatchObject({
        message: INVALID_INVITATION_MESSAGE,
      });
      expect(authService.getTokens).not.toHaveBeenCalled();
      expect(authService.updateRtHash).not.toHaveBeenCalled();
    },
  );

  it("el error genérico es indistinguible entre los cuatro casos", async () => {
    const messages: string[] = [];
    const statuses: number[] = [];

    for (const [, error] of TOKEN_FAILURES) {
      const { controller, invitationService } = buildController();
      invitationService.acceptInvitation.mockRejectedValue(error);

      try {
        await controller.accept(DTO as any);
        throw new Error("debía rechazar");
      } catch (thrown: any) {
        messages.push(thrown.message);
        statuses.push(thrown.getStatus());
      }
    }

    expect(new Set(messages).size).toBe(1);
    expect(new Set(statuses).size).toBe(1);
    expect(messages[0]).toBe(INVALID_INVITATION_MESSAGE);
    expect(statuses[0]).toBe(403);
  });
});
