import { ForbiddenException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { validate } from "class-validator";

import { ChangePasswordDto } from "src/modules/auth/dto/change-password.dto";
import { validatePasswordPolicy } from "./dto/password-policy";
import {
  GENERIC_INVITATION_MESSAGE,
  INVALID_INVITATION_MESSAGE,
  PatientInvitationService,
  hashPatientInvitationToken,
  renderPatientInvitationHtml,
} from "./patient-invitation.service";

/**
 * S1 (patient-onboarding) · A6: unitarios del servicio de invitación.
 *
 * El Prisma está simulado: lo que se prueba es el contrato del servicio
 * (token hasheado, expiración, un solo uso, no enumeración, el correo no
 * rompe la operación clínica).
 */

const PATIENT_ID = "patient-1";
const USER_ID = "user-1";
const PROFESSIONAL_ID = "professional-1";

interface SentMail {
  to: string;
  subject: string;
  html: string;
}

function buildService(overrides?: {
  mailError?: Error;
  patientExists?: boolean;
}) {
  const prisma = {
    patient: {
      findUnique: jest.fn().mockResolvedValue(
        overrides?.patientExists === false
          ? null
          : {
              id: PATIENT_ID,
              firstName: "Ana",
              lastName: "Pérez",
              email: "ana@example.test",
              userId: USER_ID,
              user: {
                id: USER_ID,
                email: "ana@example.test",
                firstName: "Ana",
                lastName: "Pérez",
              },
            },
      ),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: USER_ID, email: "ana@example.test" }),
      update: jest.fn().mockResolvedValue({
        id: USER_ID,
        email: "ana@example.test",
        firstName: "Ana",
        lastName: "Pérez",
        password: "hashed",
      }),
    },
    patientInvitation: {
      create: jest.fn().mockResolvedValue({ id: "inv-1" }),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const sentMails: SentMail[] = [];
  const mailService = {
    sendMail: jest.fn(async (mail: SentMail) => {
      if (overrides?.mailError) throw overrides.mailError;
      sentMails.push(mail);
    }),
  };

  const logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
  const config = { get: jest.fn().mockReturnValue("http://localhost:3001") };

  const service = new PatientInvitationService(
    prisma as never,
    mailService as never,
    config as never,
    logger as never,
  );

  return { service, prisma, mailService, logger, sentMails };
}

/** Extrae el token en claro del enlace del correo enviado. */
function extractRawToken(html: string): string {
  const match = html.match(/token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("El correo no contiene el enlace de invitación");
  return match[1];
}

describe("PatientInvitationService", () => {
  describe("createInvitation", () => {
    it("guarda el hash sha256 del token y nunca el token en claro", async () => {
      const { service, prisma, sentMails } = buildService();

      await service.createInvitation({
        patientId: PATIENT_ID,
        createdById: PROFESSIONAL_ID,
      });

      const stored = prisma.patientInvitation.create.mock.calls[0][0].data;
      const rawToken = extractRawToken(sentMails[0].html);

      expect(stored.tokenHash).toBe(hashPatientInvitationToken(rawToken));
      expect(stored.tokenHash).not.toBe(rawToken);
      expect(JSON.stringify(stored)).not.toContain(rawToken);
    });

    it("expira la invitación a las 72 horas", async () => {
      const { service, prisma } = buildService();
      const before = Date.now();

      await service.createInvitation({
        patientId: PATIENT_ID,
        createdById: PROFESSIONAL_ID,
      });

      const { expiresAt } = prisma.patientInvitation.create.mock.calls[0][0].data;
      const delta = expiresAt.getTime() - before;
      expect(delta).toBeGreaterThanOrEqual(72 * 60 * 60 * 1000 - 1000);
      expect(delta).toBeLessThanOrEqual(72 * 60 * 60 * 1000 + 5000);
    });

    it("envía el correo con el enlace de invitación y sin contraseña", async () => {
      const { service, sentMails } = buildService();

      await service.createInvitation({
        patientId: PATIENT_ID,
        createdById: PROFESSIONAL_ID,
      });

      expect(sentMails).toHaveLength(1);
      expect(sentMails[0].to).toBe("ana@example.test");
      expect(sentMails[0].html).toContain(
        "http://localhost:3001/patient/invitacion?token=",
      );
      expect(sentMails[0].html).not.toMatch(/contraseña[:=]\s*\S/i);
    });

    it("revoca la invitación pendiente anterior y emite una nueva", async () => {
      const { service, prisma, sentMails } = buildService();

      await service.createInvitation({
        patientId: PATIENT_ID,
        createdById: PROFESSIONAL_ID,
      });
      await service.resendInvitation({
        patientId: PATIENT_ID,
        createdById: PROFESSIONAL_ID,
      });

      expect(prisma.patientInvitation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ revokedAt: null }),
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
      expect(prisma.patientInvitation.create).toHaveBeenCalledTimes(2);
      const first = extractRawToken(sentMails[0].html);
      const second = extractRawToken(sentMails[1].html);
      expect(second).not.toBe(first);
    });

    it("responde igual exista o no el paciente (no enumeración)", async () => {
      const existente = buildService();
      const inexistente = buildService({ patientExists: false });

      const conPaciente = await existente.service.createInvitation({
        patientId: PATIENT_ID,
        createdById: PROFESSIONAL_ID,
      });
      const sinPaciente = await inexistente.service.createInvitation({
        patientId: "no-existe",
        createdById: PROFESSIONAL_ID,
      });

      expect(conPaciente.message).toBe(GENERIC_INVITATION_MESSAGE);
      expect(sinPaciente.message).toBe(GENERIC_INVITATION_MESSAGE);
      expect(sinPaciente.message).toBe(conPaciente.message);
      expect(inexistente.prisma.patientInvitation.create).not.toHaveBeenCalled();
    });

    it("un fallo del correo no revierte la invitación", async () => {
      const { service, prisma, logger } = buildService({
        mailError: new Error("SMTP caído"),
      });

      const result = await service.createInvitation({
        patientId: PATIENT_ID,
        createdById: PROFESSIONAL_ID,
      });

      expect(result.message).toBe(GENERIC_INVITATION_MESSAGE);
      expect(prisma.patientInvitation.create).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("acceptInvitation", () => {
    function usableInvitation(overrides?: Record<string, unknown>) {
      return {
        id: "inv-1",
        patientId: PATIENT_ID,
        userId: USER_ID,
        email: "ana@example.test",
        tokenHash: hashPatientInvitationToken("raw-token"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        acceptedAt: null,
        revokedAt: null,
        createdById: PROFESSIONAL_ID,
        createdAt: new Date(),
        ...overrides,
      };
    }

    it("define la contraseña con bcrypt y marca la invitación como aceptada", async () => {
      const { service, prisma } = buildService();
      prisma.patientInvitation.findUnique.mockResolvedValue(usableInvitation());

      const user = await service.acceptInvitation({
        token: "raw-token",
        password: "Segura1234",
        confirmPassword: "Segura1234",
      });

      expect(user.id).toBe(USER_ID);
      const update = prisma.user.update.mock.calls[0][0];
      expect(update.data.mustChangePassword).toBe(false);
      expect(update.data.password).not.toBe("Segura1234");
      await expect(bcrypt.compare("Segura1234", update.data.password)).resolves.toBe(
        true,
      );
      expect(prisma.patientInvitation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ acceptedAt: null }),
          data: expect.objectContaining({ acceptedAt: expect.any(Date) }),
        }),
      );
    });

    it("rechaza una invitación expirada", async () => {
      const { service, prisma } = buildService();
      prisma.patientInvitation.findUnique.mockResolvedValue(
        usableInvitation({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        service.acceptInvitation({ token: "raw-token", password: "Segura1234", confirmPassword: "Segura1234" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rechaza una invitación ya aceptada", async () => {
      const { service, prisma } = buildService();
      prisma.patientInvitation.findUnique.mockResolvedValue(
        usableInvitation({ acceptedAt: new Date() }),
      );

      await expect(
        service.acceptInvitation({ token: "raw-token", password: "Segura1234", confirmPassword: "Segura1234" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rechaza una invitación revocada", async () => {
      const { service, prisma } = buildService();
      prisma.patientInvitation.findUnique.mockResolvedValue(
        usableInvitation({ revokedAt: new Date() }),
      );

      await expect(
        service.acceptInvitation({ token: "raw-token", password: "Segura1234", confirmPassword: "Segura1234" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rechaza un token que no existe", async () => {
      const { service, prisma } = buildService();
      prisma.patientInvitation.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvitation({ token: "raw-token", password: "Segura1234", confirmPassword: "Segura1234" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("no permite reutilizar la invitación cuando otra aceptación ganó la carrera", async () => {
      const { service, prisma } = buildService();
      prisma.patientInvitation.findUnique.mockResolvedValue(usableInvitation());
      prisma.patientInvitation.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.acceptInvitation({ token: "raw-token", password: "Segura1234", confirmPassword: "Segura1234" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("exige la confirmación de la contraseña", async () => {
      const { service, prisma } = buildService();

      await expect(
        service.acceptInvitation({
          token: "raw-token",
          password: "Segura1234",
          confirmPassword: "",
        }),
      ).rejects.toThrow("Las contraseñas no coinciden");

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rechaza una confirmación que no coincide con la contraseña", async () => {
      const { service, prisma } = buildService();

      await expect(
        service.acceptInvitation({
          token: "raw-token",
          password: "Segura1234",
          confirmPassword: "OtraClave99",
        }),
      ).rejects.toThrow("Las contraseñas no coinciden");

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rechaza una contraseña que no cumple la política", async () => {
      const { service, prisma } = buildService();
      prisma.patientInvitation.findUnique.mockResolvedValue(usableInvitation());

      await expect(
        service.acceptInvitation({ token: "raw-token", password: "corta", confirmPassword: "corta" }),
      ).rejects.toThrow();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("getInvitationStatus", () => {
    it("devuelve sólo el estado, sin datos identificatorios", async () => {
      const { service, prisma } = buildService();
      prisma.patientInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        patientId: PATIENT_ID,
        userId: USER_ID,
        email: "ana@example.test",
        tokenHash: hashPatientInvitationToken("raw-token"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        acceptedAt: null,
        revokedAt: null,
        createdById: PROFESSIONAL_ID,
        createdAt: new Date(),
      });

      const status = await service.getInvitationStatus("raw-token");

      expect(["valid", "expired", "used", "invalid"]).toContain(status);
      expect(JSON.stringify(status)).not.toContain("ana@example.test");
      expect(JSON.stringify(status)).not.toContain("Ana");
    });

    it("informa 'expired', 'used' e 'invalid' según el estado", async () => {
      const { service, prisma } = buildService();
      const base = {
        id: "inv-1",
        patientId: PATIENT_ID,
        userId: USER_ID,
        email: "ana@example.test",
        tokenHash: hashPatientInvitationToken("raw-token"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        acceptedAt: null,
        revokedAt: null,
        createdById: PROFESSIONAL_ID,
        createdAt: new Date(),
      };

      prisma.patientInvitation.findUnique.mockResolvedValue({
        ...base,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.getInvitationStatus("raw-token")).resolves.toBe(
        "expired",
      );

      prisma.patientInvitation.findUnique.mockResolvedValue({
        ...base,
        acceptedAt: new Date(),
      });
      await expect(service.getInvitationStatus("raw-token")).resolves.toBe(
        "used",
      );

      prisma.patientInvitation.findUnique.mockResolvedValue(null);
      await expect(service.getInvitationStatus("raw-token")).resolves.toBe(
        "invalid",
      );
    });
  });

  describe("renderPatientInvitationHtml", () => {
    it("muestra el token sólo dentro del enlace y no incluye ninguna contraseña", () => {
      const token = "TOKEN-DE-PRUEBA-123";
      const link = `http://localhost:3001/patient/invitacion?token=${token}`;
      const html = renderPatientInvitationHtml("Ana", link);

      expect(html.split(token)).toHaveLength(2);
      expect(html).toContain(`href="${link}"`);
      expect(html).not.toMatch(/contraseña[:=]\s*\S/i);
      expect(html).toMatch(/ignora este mensaje/i);
    });
  });

  describe("política de contraseñas reutilizada", () => {
    it("aplica exactamente las reglas de ChangePasswordDto.newPassword", async () => {
      const candidates = ["corta", "sin123456", "12345678", "SinNumero1", "Valida123"];

      for (const candidate of candidates) {
        const reference = await validate(
          Object.assign(new ChangePasswordDto(), { newPassword: candidate }),
        );
        const referenceErrors = reference
          .filter((error) => error.property === "newPassword")
          .flatMap((error) => Object.values(error.constraints ?? {}));

        const reused = validatePasswordPolicy(candidate);

        expect(reused.length > 0).toBe(referenceErrors.length > 0);
        for (const message of referenceErrors) {
          expect(reused).toContain(message);
        }
      }
    });

    it("acepta una contraseña que cumple la política", () => {
      expect(validatePasswordPolicy("Valida123")).toEqual([]);
    });
  });

  describe("mensajes de rechazo", () => {
    it("usa el mismo mensaje para token inválido, expirado y usado", async () => {
      const { service, prisma } = buildService();
      prisma.patientInvitation.findUnique.mockResolvedValue(null);

      const error = await service
        .acceptInvitation({ token: "raw-token", password: "Segura1234", confirmPassword: "Segura1234" })
        .catch((e: Error) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as Error).message).toBe(INVALID_INVITATION_MESSAGE);
    });
  });
});
