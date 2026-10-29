import { validate } from "class-validator";

import { CreatePatientInvitationDto } from "./dto/patient-invitation.dto";
import { PatientInvitationService } from "./patient-invitation.service";

/**
 * S1+S2 (patient-onboarding) / C4 — QUIÉN recibe la invitación.
 *
 * El destinatario se resuelve SIEMPRE desde la base de datos, nunca desde el
 * cuerpo de la petición:
 *   - paciente MENOR ⇒ el correo del REPRESENTANTE (el `PediatricHistory`
 *     guardado en el alta);
 *   - cualquier otro paciente ⇒ su propio correo.
 *
 * Un profesional no puede redirigir la invitación a un tercero: el campo
 * `email` del DTO de creación NO se acepta y el servicio ignora cualquier
 * destinatario que le pasen por parámetro.
 */
const PATIENT_ID = "patient-1";
const USER_ID = "user-1";
const PROFESSIONAL_ID = "professional-1";

interface SentMail {
  to: string;
  subject: string;
  html: string;
}

function buildService({
  patient,
  representativeEmail,
}: {
  patient: Record<string, any>;
  representativeEmail?: string | null;
}) {
  const prisma = {
    patient: {
      findUnique: jest.fn().mockResolvedValue(patient),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: USER_ID, email: "ana@example.test" }),
      update: jest.fn().mockResolvedValue({ id: USER_ID }),
    },
    patientInvitation: {
      create: jest.fn().mockResolvedValue({ id: "inv-1" }),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    pediatricHistory: {
      findFirst: jest.fn().mockResolvedValue(
        representativeEmail === undefined
          ? null
          : { id: "ph-1", representativeEmail },
      ),
    },
  };

  const sentMails: SentMail[] = [];
  const mailService = {
    sendMail: jest.fn(async (mail: SentMail) => {
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

  return { service, prisma, mailService, sentMails };
}

describe("PatientInvitationService — destinatario de la invitación (S1+S2 / C4)", () => {
  it("un paciente MENOR recibe la invitación en el correo de su REPRESENTANTE", async () => {
    const { service, prisma, sentMails } = buildService({
      patient: {
        id: PATIENT_ID,
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@menor.test",
        isPediatric: true,
        userId: USER_ID,
        user: {
          id: USER_ID,
          email: "maria@example.com",
          firstName: "María",
          lastName: "Pérez",
        },
      },
      representativeEmail: "maria@example.com",
    });

    await service.createInvitation({
      patientId: PATIENT_ID,
      createdById: PROFESSIONAL_ID,
    });

    // El destinatario sale de la historia pediátrica guardada en la base.
    expect(prisma.pediatricHistory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ patientId: PATIENT_ID }),
      }),
    );
    expect(sentMails).toHaveLength(1);
    expect(sentMails[0].to).toBe("maria@example.com");

    // Y es el correo que queda registrado en la invitación.
    const stored = prisma.patientInvitation.create.mock.calls[0][0].data;
    expect(stored.email).toBe("maria@example.com");
  });

  it("un paciente que NO es menor recibe la invitación en SU propio correo", async () => {
    const { service, prisma, sentMails } = buildService({
      patient: {
        id: PATIENT_ID,
        firstName: "Ana",
        lastName: "Perez",
        email: "ana@example.test",
        isPediatric: false,
        userId: USER_ID,
        user: {
          id: USER_ID,
          email: "ana@example.test",
          firstName: "Ana",
          lastName: "Perez",
        },
      },
    });

    await service.createInvitation({
      patientId: PATIENT_ID,
      createdById: PROFESSIONAL_ID,
    });

    expect(sentMails).toHaveLength(1);
    expect(sentMails[0].to).toBe("ana@example.test");
    expect(prisma.pediatricHistory.findFirst).not.toHaveBeenCalled();
  });

  it("el correo del CUERPO de la petición NO puede redirigir la invitación", async () => {
    const { service, sentMails } = buildService({
      patient: {
        id: PATIENT_ID,
        firstName: "Ana",
        lastName: "Perez",
        email: "ana@example.test",
        isPediatric: false,
        userId: USER_ID,
        user: {
          id: USER_ID,
          email: "ana@example.test",
          firstName: "Ana",
          lastName: "Perez",
        },
      },
    });

    // Se intenta colar un destinatario de un tercero.
    await service.createInvitation({
      patientId: PATIENT_ID,
      createdById: PROFESSIONAL_ID,
      email: "atacante@tercero.test",
    } as never);

    expect(sentMails).toHaveLength(1);
    expect(sentMails[0].to).toBe("ana@example.test");
  });

  it("el DTO de creación NO admite un campo `email`", async () => {
    const dto = Object.assign(new CreatePatientInvitationDto(), {
      patientId: PATIENT_ID,
      email: "atacante@tercero.test",
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(
      errors.some(
        (error) =>
          error.property === "email" &&
          Object.values(error.constraints ?? {}).some((message) =>
            message.includes("email"),
          ),
      ),
    ).toBe(true);
  });

  it("un menor SIN representante guardado cae al correo de su cuenta", async () => {
    const { service, sentMails } = buildService({
      patient: {
        id: PATIENT_ID,
        firstName: "Juan",
        lastName: "Perez",
        email: "juan@menor.test",
        isPediatric: true,
        userId: USER_ID,
        user: {
          id: USER_ID,
          email: "cuenta@ejemplo.test",
          firstName: "Cuenta",
          lastName: "Ejemplo",
        },
      },
      representativeEmail: null,
    });

    await service.createInvitation({
      patientId: PATIENT_ID,
      createdById: PROFESSIONAL_ID,
    });

    expect(sentMails).toHaveLength(1);
    expect(sentMails[0].to).toBe("cuenta@ejemplo.test");
  });
});
