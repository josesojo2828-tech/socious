import "reflect-metadata";

import { NotFoundException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";

import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { IS_PUBLIC_KEY } from "src/shared/decorators/public.decorator";
import { PatientApiController } from "./patient.api.controller";

/**
 * S1 (patient-onboarding) · A4: los endpoints protegidos de invitación.
 *
 * Lo que se fija aquí:
 *   - el llamador tiene que ser un profesional con acceso real al paciente;
 *   - un profesional sin acceso NO puede crear ni revocar invitaciones;
 *   - la respuesta es genérica: no revela si el paciente o la cuenta existen.
 */

const PATIENT_ID = "patient-1";

const ACCESS_DENIED_MESSAGE = "Paciente no encontrado o no tienes acceso.";

const PATIENT_WITH_MEMBERSHIP = {
  id: PATIENT_ID,
  email: "paciente@example.test",
  firstName: "Ana",
  lastName: "Pérez",
  nutritionists: [
    {
      nutritionistId: "nut-1",
      isActive: true,
      role: "PRIMARY",
    },
  ],
};

function buildController(options?: {
  patient?: any;
  accessError?: Error;
}) {
  const patientService = {
    unique: options?.accessError
      ? jest.fn().mockRejectedValue(options.accessError)
      : jest.fn().mockResolvedValue(options?.patient ?? PATIENT_WITH_MEMBERSHIP),
  };

  const userRepository = {
    findOne: jest.fn(),
  };

  const patientInvitationService = {
    createInvitation: jest
      .fn()
      .mockResolvedValue({ message: "mensaje genérico" }),
    resendInvitation: jest
      .fn()
      .mockResolvedValue({ message: "mensaje genérico" }),
    revokeInvitation: jest.fn().mockResolvedValue({ revoked: 1 }),
  };

  const controller = new PatientApiController(
    patientService as any,
    userRepository as any,
    patientInvitationService as any,
  );

  return { controller, patientService, patientInvitationService };
}

const professionalSession = {
  user: {
    id: "user-nutricionista",
    email: "nutri@example.test",
    permits: { list: [] },
    nutritionistProfile: { id: "nut-1" },
  },
} as any;

const patientSession = {
  user: {
    id: "user-paciente",
    email: "paciente@example.test",
    permits: { list: [] },
    nutritionistProfile: null,
  },
} as any;

describe("PatientApiController — endpoints de invitación (A4)", () => {
  describe("POST /:id/invitation", () => {
    it("crea o reenvía la invitación del paciente para un profesional con acceso", async () => {
      const { controller, patientInvitationService } = buildController();

      const result = await controller.createInvitation(
        PATIENT_ID,
        professionalSession,
      );

      expect(patientInvitationService.resendInvitation).toHaveBeenCalledWith({
        patientId: PATIENT_ID,
        createdById: professionalSession.user.id,
      });
      expect(result).toEqual({ message: expect.any(String) });
    });

    it("la respuesta es genérica: no revela datos del paciente", async () => {
      const { controller } = buildController();

      const result = await controller.createInvitation(
        PATIENT_ID,
        professionalSession,
      );

      expect(Object.keys(result)).toEqual(["message"]);
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("Ana");
      expect(serialized).not.toContain("Pérez");
      expect(serialized).not.toContain("paciente@example.test");
    });

    it("rechaza a un profesional sin acceso al paciente", async () => {
      const { controller, patientInvitationService } = buildController({
        accessError: new NotFoundException(ACCESS_DENIED_MESSAGE),
      });

      await expect(
        controller.createInvitation(PATIENT_ID, professionalSession),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(patientInvitationService.resendInvitation).not.toHaveBeenCalled();
    });

    it("rechaza a un llamador que no es profesional", async () => {
      const { controller, patientInvitationService } = buildController({
        patient: PATIENT_WITH_MEMBERSHIP,
      });

      await expect(
        controller.createInvitation(PATIENT_ID, patientSession),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(patientInvitationService.resendInvitation).not.toHaveBeenCalled();
    });

    it("no distingue entre paciente inexistente y paciente sin acceso", async () => {
      const missing = buildController({
        accessError: new NotFoundException(ACCESS_DENIED_MESSAGE),
      });
      const forbidden = buildController({
        accessError: new NotFoundException(ACCESS_DENIED_MESSAGE),
      });

      const messages: string[] = [];
      for (const built of [missing, forbidden]) {
        try {
          await built.controller.createInvitation(
            PATIENT_ID,
            professionalSession,
          );
          throw new Error("debía rechazar");
        } catch (thrown: any) {
          messages.push(thrown.message);
        }
      }

      expect(messages[0]).toBe(messages[1]);
      expect(messages[0]).toBe(ACCESS_DENIED_MESSAGE);
    });
  });

  describe("DELETE /:id/invitation", () => {
    it("revoca la invitación pendiente del paciente", async () => {
      const { controller, patientInvitationService } = buildController();

      const result = await controller.revokeInvitation(
        PATIENT_ID,
        professionalSession,
      );

      expect(patientInvitationService.revokeInvitation).toHaveBeenCalledWith({
        patientId: PATIENT_ID,
      });
      expect(Object.keys(result)).toEqual(["message"]);
    });

    it("la respuesta es genérica: no revela si había invitación", async () => {
      const { controller } = buildController();

      const result = await controller.revokeInvitation(
        PATIENT_ID,
        professionalSession,
      );

      expect(result).not.toHaveProperty("revoked");
      expect(JSON.stringify(result)).not.toContain("Ana");
      expect(JSON.stringify(result)).not.toContain("paciente@example.test");
    });

    it("rechaza a un profesional sin acceso al paciente", async () => {
      const { controller, patientInvitationService } = buildController({
        accessError: new NotFoundException(ACCESS_DENIED_MESSAGE),
      });

      await expect(
        controller.revokeInvitation(PATIENT_ID, professionalSession),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(patientInvitationService.revokeInvitation).not.toHaveBeenCalled();
    });

    it("rechaza a un llamador que no es profesional", async () => {
      const { controller, patientInvitationService } = buildController();

      await expect(
        controller.revokeInvitation(PATIENT_ID, patientSession),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(patientInvitationService.revokeInvitation).not.toHaveBeenCalled();
    });
  });

  describe("guard stack", () => {
    it("el controlador conserva el SessionAuthGuard de clase", () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, PatientApiController);
      expect(guards).toContain(SessionAuthGuard);
    });

    it("el controlador no es público: los endpoints exigen sesión", () => {
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, PatientApiController),
      ).toBeUndefined();
    });
  });
});
