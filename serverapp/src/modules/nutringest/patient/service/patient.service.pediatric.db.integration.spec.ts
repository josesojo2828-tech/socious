import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

import { PatientService } from "./patient.service";
import { PediatricHistoryService } from "./pediatric-history.service";
import PediatricHistoryRepository from "../repository/pediatric-history.repository";
import UserRepository from "src/modules/user/repository/user.repository";
import PermitReporitory from "src/modules/permit/repository/permit.repository";
import { PatientInvitationService } from "src/modules/patient-invitation/patient-invitation.service";

/**
 * S2 (patient-onboarding) / C2 — cobertura de integración del alta de un
 * paciente MENOR con REPRESENTANTE contra la base real.
 *
 * Prueba lo que los mocks no pueden probar: que PostgreSQL acepta el
 * `PediatricHistory` con los datos del representante en la MISMA operación del
 * alta, que la cuenta que se crea es la del REPRESENTANTE (no la del menor) y
 * que la invitación sale al correo del representante.
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
  const pediatricHistoryRepository = new PediatricHistoryRepository(
    tx as unknown as never,
    eventEmitter as unknown as never,
    logger as unknown as never,
  );
  const pediatricHistoryService = new PediatricHistoryService(
    pediatricHistoryRepository,
    tx as unknown as never,
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
    pediatricHistoryService,
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

describeDb("PatientService.create de un menor con representante — DB integration", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("crea el menor, su historia pediátrica y la cuenta del representante; invita al representante", async () => {
    const before = {
      invitations: await prisma.patientInvitation.count(),
      users: await prisma.user.count(),
      patients: await prisma.patient.count(),
      histories: await prisma.pediatricHistory.count(),
    };

    await inRollback(async (tx) => {
      const { professional, userSession } = await createProfessional(tx);
      const minorEmail = `${randomKey("minor")}@example.test`;
      const representativeEmail = `${randomKey("representante")}@example.test`;

      const mails: MailCapture[] = [];
      const { service } = buildStack(tx, mails);

      const entity: any = await service.create({
        data: {
          firstName: "Juan",
          lastName: "Perez",
          email: minorEmail,
          privacyNoticeAccepted: true,
          isPediatric: true,
          sendInvitation: true,
          representative: {
            fullName: "María Pérez",
            email: representativeEmail,
            phone: "+58 412 1234567",
            relationship: "MADRE",
          },
        },
        userSession,
      });

      // --- El paciente es menor y conserva SU propio correo ---
      const patient = await tx.patient.findFirstOrThrow({
        where: { email: minorEmail },
      });
      expect(patient.isPediatric).toBe(true);
      expect(patient.email).toBe(minorEmail);

      // --- La CUENTA es la del representante ---
      const account = await tx.user.findUniqueOrThrow({
        where: { id: patient.userId as string },
      });
      expect(account.email).toBe(representativeEmail);
      expect(account.permitId).toBe("PATIENT");
      expect(account.id).toBe(entity.id);

      // --- La historia pediátrica guarda los datos del representante ---
      const history = await tx.pediatricHistory.findFirstOrThrow({
        where: { patientId: patient.id },
      });
      expect(history.representativeName).toBe("María Pérez");
      expect(history.representativeEmail).toBe(representativeEmail);
      expect(history.representativePhone).toBe("+58 412 1234567");
      expect(history.representativeRelationship).toBe("MADRE");
      expect(history.createdById).toBe(professional.id);

      // --- La invitación sale al REPRESENTANTE ---
      const invitation = await tx.patientInvitation.findFirstOrThrow({
        where: { patientId: patient.id },
      });
      expect(invitation.email).toBe(representativeEmail);
      expect(invitation.userId).toBe(account.id);
      expect(invitation.acceptedAt).toBeNull();

      expect(mails).toHaveLength(1);
      expect(mails[0].to).toBe(representativeEmail);
    });

    const after = {
      invitations: await prisma.patientInvitation.count(),
      users: await prisma.user.count(),
      patients: await prisma.patient.count(),
      histories: await prisma.pediatricHistory.count(),
    };
    expect(after).toEqual(before);
  });

  it("sin representante el alta se rechaza y NO se escribe nada", async () => {
    const before = {
      users: await prisma.user.count(),
      patients: await prisma.patient.count(),
      histories: await prisma.pediatricHistory.count(),
    };

    await inRollback(async (tx) => {
      const { userSession } = await createProfessional(tx);

      const mails: MailCapture[] = [];
      const { service } = buildStack(tx, mails);

      await expect(
        service.create({
          data: {
            firstName: "Sin",
            lastName: "Representante",
            email: `${randomKey("minor")}@example.test`,
            privacyNoticeAccepted: true,
            isPediatric: true,
          },
          userSession,
        }),
      ).rejects.toThrow();

      expect(
        await tx.patient.count({ where: { isPediatric: true } }),
      ).toBe(0);
      expect(await tx.pediatricHistory.count()).toBe(0);
      expect(mails).toHaveLength(0);
    });

    const after = {
      users: await prisma.user.count(),
      patients: await prisma.patient.count(),
      histories: await prisma.pediatricHistory.count(),
    };
    expect(after).toEqual(before);
  });
});
