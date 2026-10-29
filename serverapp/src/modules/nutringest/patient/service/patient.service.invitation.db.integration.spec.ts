import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

import { PatientService } from "./patient.service";
import UserRepository from "src/modules/user/repository/user.repository";
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import { PatientInvitationService } from "src/modules/patient-invitation/patient-invitation.service";
import { hashPatientInvitationToken } from "src/modules/patient-invitation/patient-invitation.service";

/**
 * S1 (patient-onboarding) / D2a — cobertura de integración del alta CON
 * INVITACIÓN contra la base real.
 *
 * Prueba lo que los mocks no pueden probar: que PostgreSQL acepta una cuenta
 * con `password: null`, que la invitación queda asociada al paciente recién
 * creado y que el token del correo sirve para definir la contraseña.
 *
 * Todo corre dentro de una TRANSACCIÓN INTERACTIVA que SIEMPRE se revierte,
 * así la base compartida queda intacta.
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

function buildStack(tx: Prisma.TransactionClient, mails: MailCapture[]) {
  const mailService = {
    sendMail: jest.fn(async (mail: MailCapture) => {
      mails.push(mail);
    }),
  };
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    logInfo: jest.fn(),
    logError: jest.fn(),
  };
  const config = { get: jest.fn().mockReturnValue("http://localhost:3001") };
  const eventEmitter = { emit: jest.fn() };

  const userRepository = new UserRepository(
    tx as unknown as never,
    eventEmitter as unknown as never,
    logger as unknown as never,
  );
  const permitRepository = new PermitReporitory(
    tx as unknown as never,
    eventEmitter as unknown as never,
    logger as unknown as never,
  );
  const invitationService = new PatientInvitationService(
    tx as unknown as never,
    mailService as unknown as never,
    config as unknown as never,
    logger as unknown as never,
  );

  const service = new PatientService(
    userRepository,
    { getPaginate: jest.fn() } as never,
    permitRepository,
    { t: (key: string) => key } as never,
    tx as unknown as never,
    { getWorkspaceId: () => null } as never,
    { logActivity: jest.fn() } as never,
    invitationService,
  );

  return { service, invitationService };
}

async function createProfessional(tx: Prisma.TransactionClient) {
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

  const nutritionist = await tx.nutritionist.create({
    data: { user: { connect: { id: professional.id } } },
  });

  const userSession: any = {
    id: professional.id,
    email: professional.email,
    firstName: professional.firstName,
    lastName: professional.lastName,
    status: "ACTIVE",
    nutritionistProfile: { id: nutritionist.id },
    permits: { id: "NUTRITIONIST", name: "NUTRITIONIST", list: ["PATIENT_CREATED"] },
  };

  return { professional, nutritionist, userSession };
}

describeDb("PatientService.create con invitación — DB integration", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("crea la cuenta SIN contraseña, deja la invitación vigente y el alta no rompe la base", async () => {
    const before = {
      invitations: await prisma.patientInvitation.count(),
      users: await prisma.user.count(),
      patients: await prisma.patient.count(),
    };

    await inRollback(async (tx) => {
      const { professional, userSession } = await createProfessional(tx);
      const patientEmail = `${randomKey("patient")}@example.test`;

      const mails: MailCapture[] = [];
      const { service, invitationService } = buildStack(tx, mails);

      const entity: any = await service.create({
        data: {
          firstName: "Lucia",
          lastName: "Gomez",
          email: patientEmail,
          privacyNoticeAccepted: true,
          sendInvitation: true,
        },
        userSession,
      });

      // --- La cuenta nace sin contraseña utilizable ---
      const createdUser = await tx.user.findUniqueOrThrow({
        where: { id: entity.id },
      });
      expect(createdUser.password).toBeNull();
      expect(createdUser.mustChangePassword).toBe(true);
      expect(createdUser.permitId).toBe("PATIENT");

      // --- El paciente existe y es el titular de la invitación ---
      const patient = await tx.patient.findFirstOrThrow({
        where: { email: patientEmail },
      });
      expect(patient.userId).toBe(createdUser.id);
      expect(patient.privacyNoticeAcceptedAt).not.toBeNull();

      // --- La invitación quedó vigente, con el token hasheado ---
      const invitation = await tx.patientInvitation.findFirstOrThrow({
        where: { patientId: patient.id },
      });
      expect(invitation.userId).toBe(createdUser.id);
      expect(invitation.email).toBe(patientEmail);
      expect(invitation.createdById).toBe(professional.id);
      expect(invitation.acceptedAt).toBeNull();
      expect(invitation.revokedAt).toBeNull();

      // --- El correo salió con el enlace (y sin ninguna contraseña) ---
      expect(mails).toHaveLength(1);
      expect(mails[0].to).toBe(patientEmail);
      const rawToken = mails[0].html.match(/token=([A-Za-z0-9_-]+)/)?.[1];
      expect(rawToken).toBeTruthy();
      expect(mails[0].html).not.toContain("password:");

      // --- El token se guarda HASHEADO, nunca en claro ---
      expect(invitation.tokenHash).toBe(hashPatientInvitationToken(rawToken as string));
      expect(invitation.tokenHash).not.toBe(rawToken);

      // --- Aceptar la invitación define la contraseña ---
      const accepted = await invitationService.acceptInvitation({
        token: rawToken as string,
        password: "Segura1234",
        confirmPassword: "Segura1234",
      });
      expect(accepted.id).toBe(createdUser.id);

      const withPassword = await tx.user.findUniqueOrThrow({
        where: { id: createdUser.id },
      });
      expect(withPassword.mustChangePassword).toBe(false);
      expect(await bcrypt.compare("Segura1234", withPassword.password ?? "")).toBe(
        true,
      );
    });

    const after = {
      invitations: await prisma.patientInvitation.count(),
      users: await prisma.user.count(),
      patients: await prisma.patient.count(),
    };
    expect(after).toEqual(before);
  });

  it("sin invitación, la cuenta conserva su contraseña (comportamiento de siempre)", async () => {
    const before = {
      users: await prisma.user.count(),
      patients: await prisma.patient.count(),
    };

    await inRollback(async (tx) => {
      const { userSession } = await createProfessional(tx);
      const patientEmail = `${randomKey("patient")}@example.test`;

      const mails: MailCapture[] = [];
      const { service } = buildStack(tx, mails);

      const entity: any = await service.create({
        data: {
          firstName: "Lucia",
          lastName: "Gomez",
          email: patientEmail,
          password: "TempPassword123!",
          privacyNoticeAccepted: true,
        },
        userSession,
      });

      const createdUser = await tx.user.findUniqueOrThrow({
        where: { id: entity.id },
      });
      expect(createdUser.password).not.toBeNull();
      expect(await bcrypt.compare("TempPassword123!", createdUser.password ?? "")).toBe(
        true,
      );

      // Sin invitación no se envía ningún correo de invitación.
      expect(mails).toHaveLength(0);
      expect(
        await tx.patientInvitation.count({ where: { userId: createdUser.id } }),
      ).toBe(0);
    });

    const after = {
      users: await prisma.user.count(),
      patients: await prisma.patient.count(),
    };
    expect(after).toEqual(before);
  });
});
