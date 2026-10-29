import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

import {
  PatientInvitationService,
  hashPatientInvitationToken,
} from "./patient-invitation.service";

/**
 * S1 (patient-onboarding) · A6: cobertura de integración contra la base real.
 *
 * Todas las pruebas corren dentro de una TRANSACCIÓN INTERACTIVA que SIEMPRE
 * se revierte (se lanza una señal de error después de las aserciones). Así se
 * ejercitan las restricciones reales de PostgreSQL sin dejar datos en la base
 * compartida: al final se comprueba que los conteos de `PatientInvitation`,
 * `User` y `Patient` son los mismos que antes de la corrida.
 *
 * Si no hay `DATABASE_URL` la suite completa se omite, para que `npm test`
 * siga verde en máquinas sin la base local.
 */

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

const prisma = hasDb ? new PrismaClient() : (null as unknown as PrismaClient);

class RollbackSignal extends Error {}

async function inRollback<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  try {
    await prisma.$transaction(async (tx) => {
      result = await fn(tx);
      throw new RollbackSignal();
    });
  } catch (error) {
    if (!(error instanceof RollbackSignal)) throw error;
  }
  return result as T;
}

function randomKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface MailCapture {
  to: string;
  subject: string;
  html: string;
}

function buildService(tx: Prisma.TransactionClient, mails: MailCapture[]) {
  const mailService = {
    sendMail: jest.fn(async (mail: MailCapture) => {
      mails.push(mail);
    }),
  };
  const logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
  const config = { get: jest.fn().mockReturnValue("http://localhost:3001") };

  return new PatientInvitationService(
    tx as unknown as never,
    mailService as never,
    config as never,
    logger as never,
  );
}

function extractRawToken(html: string): string {
  const match = html.match(/token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("El correo no contiene el enlace de invitación");
  return match[1];
}

describeDb(
  "PatientInvitation — DB integration (rolled-back transactions)",
  () => {
    beforeAll(async () => {
      await prisma.$connect();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it("guarda el token hasheado, acepta una sola vez y no deja datos detrás", async () => {
      const before = {
        invitations: await prisma.patientInvitation.count(),
        users: await prisma.user.count(),
        patients: await prisma.patient.count(),
      };

      await inRollback(async (tx) => {
        // --- Fixtures propios (dentro de la transacción que se revierte) ---
        await tx.permit.upsert({
          where: { id: "PATIENT" },
          create: { id: "PATIENT", name: "PATIENT", list: [] },
          update: {},
        });
        await tx.permit.upsert({
          where: { id: "USER" },
          create: { id: "USER", name: "USER", list: [] },
          update: {},
        });

        const professional = await tx.user.create({
          data: {
            email: `${randomKey("prof")}@example.test`,
            permitId: "USER",
            firstName: "Profesional",
            lastName: "De Prueba",
          },
        });
        const patient = await tx.patient.create({
          data: {
            firstName: "Paciente",
            lastName: "De Prueba",
            email: `${randomKey("patient")}@example.test`,
            gender: "FEMALE",
            birthDate: new Date("1990-01-01T00:00:00.000Z"),
            createdBy: { connect: { id: professional.id } },
          },
        });

        const mails: MailCapture[] = [];
        const service = buildService(tx, mails);

        // --- Crear la invitación ---
        const response = await service.createInvitation({
          patientId: patient.id,
          createdById: professional.id,
        });
        expect(response.message).toContain("Si el paciente existe");

        expect(mails).toHaveLength(1);
        const rawToken = extractRawToken(mails[0].html);

        // --- El token se persiste hasheado, nunca en claro ---
        const stored = await tx.patientInvitation.findFirstOrThrow({
          where: { patientId: patient.id },
        });
        expect(stored.tokenHash).toBe(hashPatientInvitationToken(rawToken));
        expect(stored.tokenHash).not.toBe(rawToken);
        expect(stored.acceptedAt).toBeNull();
        expect(stored.revokedAt).toBeNull();
        expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());

        const rawColumns = await tx.$queryRaw<Record<string, unknown>[]>`
          SELECT "tokenHash", "email" FROM "PatientInvitation"
          WHERE "id" = ${stored.id}
        `;
        expect(JSON.stringify(rawColumns)).not.toContain(rawToken);

        // --- Aceptar define la contraseña ---
        const accepted = await service.acceptInvitation({
          token: rawToken,
          password: "Segura1234",
          confirmPassword: "Segura1234",
        });
        expect(accepted.email).toBe(stored.email);

        const user = await tx.user.findUniqueOrThrow({
          where: { id: stored.userId },
        });
        expect(user.mustChangePassword).toBe(false);
        expect(await bcrypt.compare("Segura1234", user.password ?? "")).toBe(
          true,
        );

        const claimed = await tx.patientInvitation.findUniqueOrThrow({
          where: { id: stored.id },
        });
        expect(claimed.acceptedAt).not.toBeNull();

        // --- Un segundo uso falla ---
        await expect(
          service.acceptInvitation({
            token: rawToken,
            password: "OtraClave99",
            confirmPassword: "OtraClave99",
          }),
        ).rejects.toThrow();

        const afterSecond = await tx.user.findUniqueOrThrow({
          where: { id: stored.userId },
        });
        expect(afterSecond.password).toBe(user.password);
      });

      // --- La base compartida quedó intacta ---
      const after = {
        invitations: await prisma.patientInvitation.count(),
        users: await prisma.user.count(),
        patients: await prisma.patient.count(),
      };
      expect(after).toEqual(before);
    });

    it("el estado de la invitación no expone datos del paciente", async () => {
      await inRollback(async (tx) => {
        await tx.permit.upsert({
          where: { id: "PATIENT" },
          create: { id: "PATIENT", name: "PATIENT", list: [] },
          update: {},
        });
        await tx.permit.upsert({
          where: { id: "USER" },
          create: { id: "USER", name: "USER", list: [] },
          update: {},
        });

        const professional = await tx.user.create({
          data: {
            email: `${randomKey("prof")}@example.test`,
            permitId: "USER",
            firstName: "Profesional",
            lastName: "De Prueba",
          },
        });
        const patientEmail = `${randomKey("patient")}@example.test`;
        const patient = await tx.patient.create({
          data: {
            firstName: "Paciente",
            lastName: "De Prueba",
            email: patientEmail,
            gender: "MALE",
            birthDate: new Date("1985-05-05T00:00:00.000Z"),
            createdBy: { connect: { id: professional.id } },
          },
        });

        const mails: MailCapture[] = [];
        const service = buildService(tx, mails);
        await service.createInvitation({
          patientId: patient.id,
          createdById: professional.id,
        });
        const rawToken = extractRawToken(mails[0].html);

        const status = await service.getInvitationStatus(rawToken);
        expect(status).toBe("valid");
        expect(JSON.stringify(status)).not.toContain(patientEmail);
        expect(JSON.stringify(status)).not.toContain("Paciente");

        await expect(
          service.getInvitationStatus("token-que-no-existe"),
        ).resolves.toBe("invalid");
      });
    });
  },
);
