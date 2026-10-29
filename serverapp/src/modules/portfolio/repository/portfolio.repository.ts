import { Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { PortfolioEventType } from "@prisma/client";
import PortfolioModel from "../model/portfolio.model";
import { PORTFOLIO_UPDATE, BookConsultationDto } from "../dto/portfolio.type";
import { EntityNotFoundException } from "src/shared/error/domain-errors";
import { PRIVACY_NOTICE_VERSION } from "src/shared/legal/versions";

@Injectable()
export default class PortfolioRepository extends PortfolioModel {
  constructor(
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async findByUsername(username: string) {
    const nutritionist = await this.prisma.nutritionist.findFirst({
      where: {
        user: {
          username,
          deletedAt: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            status: true,
            permitId: true,
          },
        },
      },
    });

    return nutritionist;
  }

  async findByUserId(userId: string) {
    const nutritionist = await this.prisma.nutritionist.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            status: true,
            permitId: true,
          },
        },
      },
    });

    return nutritionist;
  }

  async update(userId: string, data: PORTFOLIO_UPDATE) {
    try {
      const nutritionist = await this.prisma.nutritionist.update({
        where: { userId },
        data,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              status: true,
            },
          },
        },
      });

      return nutritionist;
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new EntityNotFoundException("Perfil de nutricionista");
      }
      throw error;
    }
  }

  async countByUsername(username: string) {
    return this.prisma.user.count({
      where: {
        username,
        deletedAt: null,
      },
    });
  }

  async createEvent(data: {
    nutritionistId: string;
    eventType: PortfolioEventType;
    referrer?: string;
    metadata?: any;
  }) {
    return this.prisma.portfolioEvent.create({
      data: {
        nutritionistId: data.nutritionistId,
        eventType: data.eventType,
        referrer: data.referrer,
        metadata: data.metadata ?? undefined,
      },
    });
  }

  async getAnalytics(nutritionistId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const events = await this.prisma.portfolioEvent.findMany({
      where: {
        nutritionistId,
        createdAt: { gte: startDate },
      },
      select: {
        eventType: true,
        createdAt: true,
        referrer: true,
      },
    });

    let totalViews = 0;
    let whatsappClicks = 0;
    let appointmentRequests = 0;
    const socialClicks = {
      instagram: 0,
      linkedin: 0,
      facebook: 0,
      tiktok: 0,
      x: 0,
      website: 0,
      total: 0,
    };

    for (const event of events) {
      switch (event.eventType) {
        case "PAGE_VIEW":
          totalViews++;
          break;
        case "CLICK_WHATSAPP":
          whatsappClicks++;
          break;
        case "CLICK_INSTAGRAM":
          socialClicks.instagram++;
          socialClicks.total++;
          break;
        case "CLICK_LINKEDIN":
          socialClicks.linkedin++;
          socialClicks.total++;
          break;
        case "CLICK_FACEBOOK":
          socialClicks.facebook++;
          socialClicks.total++;
          break;
        case "CLICK_TIKTOK":
          socialClicks.tiktok++;
          socialClicks.total++;
          break;
        case "CLICK_X":
          socialClicks.x++;
          socialClicks.total++;
          break;
        case "CLICK_WEBSITE":
          socialClicks.website++;
          socialClicks.total++;
          break;
        case "APPOINTMENT_REQUESTED":
          appointmentRequests++;
          break;
      }
    }

    return {
      periodDays: days,
      startDate,
      totalEvents: events.length,
      totalViews,
      whatsappClicks,
      socialClicks,
      appointmentRequests,
    };
  }

  async createBooking(nutritionistId: string, dto: BookConsultationDto) {
    let patient = await this.prisma.patient.findFirst({
      where: {
        email: dto.email,
        nutritionists: {
          some: { nutritionistId },
        },
      },
    });

    if (!patient) {
      const nutritionist = await this.prisma.nutritionist.findUnique({
        where: { id: nutritionistId },
        select: { userId: true },
      });

      const nameParts = dto.fullName.trim().split(" ");
      const firstName = nameParts[0] || dto.fullName;
      const lastName = nameParts.slice(1).join(" ") || "";

      patient = await this.prisma.patient.create({
        data: {
          firstName,
          lastName,
          email: dto.email,
          phone: dto.phone,
          gender: "OTHER",
          birthDate: new Date("1990-01-01"),
          // S6 (legal-compliance): prueba del aviso aceptado en el formulario
          // público; el aviso lo ofrece el dueño del portafolio.
          privacyNoticeAcceptedAt: new Date(),
          privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
          privacyNoticeAcceptedById: nutritionist?.userId ?? null,
          createdById: nutritionist?.userId,
          nutritionists: {
            create: {
              nutritionistId,
              role: "PRIMARY",
              isActive: true,
            },
          },
        },
      });
    }

    const scheduledAt = new Date(dto.scheduledAt);

    const consultation = await this.prisma.consultation.create({
      data: {
        nutritionistId,
        patientId: patient.id,
        scheduledAt,
        status: "PENDING_APPROVAL",
        type: "FIRST_TIME",
        reason: dto.reason || "Solicitud de cita desde portafolio web",
        notes: dto.notes,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    await this.createEvent({
      nutritionistId,
      eventType: "APPOINTMENT_REQUESTED",
      metadata: {
        consultationId: consultation.id,
        patientEmail: dto.email,
      },
    });

    return consultation;
  }
}

