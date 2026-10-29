import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { BookConsultationDto } from "../dto/portfolio.type";
import PortfolioRepository from "./portfolio.repository";

async function validateBooking(payload: Record<string, unknown>) {
  const dto = plainToInstance(BookConsultationDto, payload);
  return validate(dto);
}

const VALID_BOOKING = {
  fullName: "Visitante Interesado",
  email: "visitante@ejemplo.com",
  phone: "+58 412 000 0000",
  scheduledAt: "2026-11-01T10:00:00.000Z",
  acceptedPrivacyNotice: true,
};

/**
 * S6 (legal-compliance): the public booking form collects name/email/phone
 * and auto-creates a Patient record — it must require an explicit
 * acceptance of the privacy notice and persist the proof on that record.
 */
describe("Public booking — aviso de privacidad (S6)", () => {
  describe("BookConsultationDto", () => {
    it("rejects a booking without acceptedPrivacyNotice", async () => {
      const { acceptedPrivacyNotice: _omit, ...payload } = VALID_BOOKING;
      const errors = await validateBooking(payload);
      expect(errors.some((e) => e.property === "acceptedPrivacyNotice")).toBe(
        true,
      );
    });

    it("rejects acceptedPrivacyNotice: false", async () => {
      const errors = await validateBooking({
        ...VALID_BOOKING,
        acceptedPrivacyNotice: false,
      });
      expect(errors.some((e) => e.property === "acceptedPrivacyNotice")).toBe(
        true,
      );
    });

    it("accepts a complete booking with acceptedPrivacyNotice: true", async () => {
      const errors = await validateBooking(VALID_BOOKING);
      expect(errors.length).toBe(0);
    });
  });

  describe("PortfolioRepository.createBooking", () => {
    const makeRepository = () => {
      const prisma = {
        patient: { findFirst: jest.fn(), create: jest.fn() },
        nutritionist: { findUnique: jest.fn() },
        consultation: { create: jest.fn() },
      };
      const repository = new PortfolioRepository(prisma as any);
      const createEvent = jest
        .spyOn(repository, "createEvent")
        .mockResolvedValue(undefined as any);
      return { repository, prisma, createEvent };
    };

    it("persists the privacy notice proof when auto-creating the patient", async () => {
      const { repository, prisma } = makeRepository();
      prisma.patient.findFirst.mockResolvedValue(null);
      prisma.nutritionist.findUnique.mockResolvedValue({ userId: "owner-1" });
      prisma.patient.create.mockResolvedValue({ id: "patient-new" });
      prisma.consultation.create.mockResolvedValue({ id: "consultation-1" });

      await repository.createBooking("nutritionist-1", VALID_BOOKING as any);

      expect(prisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            privacyNoticeAcceptedAt: expect.any(Date),
            privacyNoticeVersion: expect.any(String),
          }),
        }),
      );
    });

    it("does not touch privacy fields when the patient already exists", async () => {
      const { repository, prisma } = makeRepository();
      prisma.patient.findFirst.mockResolvedValue({ id: "patient-existing" });
      prisma.consultation.create.mockResolvedValue({ id: "consultation-2" });

      await repository.createBooking("nutritionist-1", VALID_BOOKING as any);

      expect(prisma.patient.create).not.toHaveBeenCalled();
      expect(prisma.consultation.create).toHaveBeenCalled();
    });
  });
});
