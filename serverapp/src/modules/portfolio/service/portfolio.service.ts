import { Injectable } from "@nestjs/common";
import PortfolioRepository from "../repository/portfolio.repository";
import { LoggerService } from "src/shared/logger/logger.service";
import { UpdatePortfolioDto, TrackPortfolioEventDto, BookConsultationDto } from "../dto/portfolio.type";
import { EntityNotFoundException, BusinessLogicException } from "src/shared/error/domain-errors";
import { validateConfig } from "../validation/widgets.validation";

@Injectable()
export class PortfolioService {
  constructor(
    private readonly portfolioRepository: PortfolioRepository,
    private readonly logger: LoggerService,
  ) {}

  async getPublicProfile(username: string) {
    const nutritionist = await this.portfolioRepository.findByUsername(username);

    if (!nutritionist) {
      throw new EntityNotFoundException("Portafolio");
    }

    const user = nutritionist.user as any;

    if (!user || user.status !== "ACTIVE") {
      throw new EntityNotFoundException("Portafolio");
    }

    if (!nutritionist.isPublic) {
      throw new EntityNotFoundException("Portafolio");
    }

    const result = await this.runAutoMigration(nutritionist);

    return {
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.permitId,
      isClinic: user.permitId === "CLINIC_ADMIN" || user.permitId === "CLINIC_STAFF",
      bio: result.bio,
      about: result.about,
      services: result.services,
      socialLinks: result.socialLinks,
      photoUrl: result.photoUrl,
      template: result.template,
      config: result.config,
      // Accreditation & Verification
      verificationStatus: result.verificationStatus || "UNVERIFIED",
      universityDegree: result.universityDegree,
      mppsCode: result.mppsCode,
      cndvCode: result.cndvCode,
      cndvState: result.cndvState,
      verifiedAt: result.verifiedAt,
    };
  }

  async getByUserId(userId: string) {
    const nutritionist = await this.portfolioRepository.findByUserId(userId);

    if (!nutritionist) {
      throw new EntityNotFoundException("Portafolio");
    }

    const user = nutritionist.user as any;

    const result = await this.runAutoMigration(nutritionist);

    return {
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.permitId,
      isClinic: user.permitId === "CLINIC_ADMIN" || user.permitId === "CLINIC_STAFF",
      bio: result.bio,
      about: result.about,
      services: result.services,
      socialLinks: result.socialLinks,
      photoUrl: result.photoUrl,
      template: result.template,
      config: result.config,
      isPublic: result.isPublic,
      // Accreditation & Verification
      verificationStatus: result.verificationStatus || "UNVERIFIED",
      universityDegree: result.universityDegree,
      graduationYear: result.graduationYear,
      mppsCode: result.mppsCode,
      cndvCode: result.cndvCode,
      cndvState: result.cndvState,
      identityCard: result.identityCard,
      degreeFileUrl: result.degreeFileUrl,
      licenseFileUrl: result.licenseFileUrl,
      verifiedAt: result.verifiedAt,
      rejectionReason: result.rejectionReason,
    };
  }

  async update(userId: string, dto: UpdatePortfolioDto) {
    const nutritionist = await this.portfolioRepository.findByUserId(userId);

    if (!nutritionist) {
      throw new EntityNotFoundException("Portafolio");
    }

    if (dto.template) {
      const available = this.portfolioRepository.getAvailableTemplates();
      if (!available.includes(dto.template)) {
        throw new BusinessLogicException(
          `Template no válido. Disponibles: ${available.join(", ")}`,
        );
      }
    }

    if (dto.socialLinks) {
      // Auto-format whatsapp/phone into https://wa.me/58... URL if provided as phone number
      const rawWs = dto.socialLinks.whatsapp || dto.socialLinks.phone;
      if (rawWs && typeof rawWs === "string" && rawWs.trim().length > 0) {
        let wsUrl = rawWs.trim();
        if (!wsUrl.startsWith("http://") && !wsUrl.startsWith("https://")) {
          let digits = wsUrl.replace(/\D/g, "");
          if (digits.startsWith("04")) {
            digits = "58" + digits.slice(1);
          } else if (digits.startsWith("4")) {
            digits = "58" + digits;
          } else if (!digits.startsWith("58") && digits.length >= 10) {
            digits = "58" + digits;
          }
          wsUrl = `https://wa.me/${digits}`;
        }
        dto.socialLinks.whatsapp = wsUrl;
        dto.socialLinks.phone = wsUrl;
      }

      for (const [key, value] of Object.entries(dto.socialLinks)) {
        if (value && !this.isValidUrl(value)) {
          throw new BusinessLogicException(`URL inválida para ${key}`);
        }
      }
    }

    const currentConfig = (nutritionist.config as Record<string, any>) || {};
    let configObj = dto.config ? { ...currentConfig, ...dto.config } : { ...currentConfig };

    if (dto.palette !== undefined) configObj.palette = dto.palette;
    if (dto.showBio !== undefined) configObj.showBio = dto.showBio;
    if (dto.showServices !== undefined) configObj.showServices = dto.showServices;
    if (dto.showAccreditation !== undefined) configObj.showAccreditation = dto.showAccreditation;
    if (dto.showPapers !== undefined) configObj.showPapers = dto.showPapers;
    if (dto.showSocials !== undefined) configObj.showSocials = dto.showSocials;
    if (dto.showWhatsappButton !== undefined) configObj.showWhatsappButton = dto.showWhatsappButton;
    if (dto.showLocationMap !== undefined) configObj.showLocationMap = dto.showLocationMap;
    if (dto.showBookingForm !== undefined) configObj.showBookingForm = dto.showBookingForm;

    if (dto.config !== undefined || Object.keys(configObj).length > 0) {
      const validation = validateConfig(configObj);
      if (!validation.valid) {
        throw new BusinessLogicException(validation.errors.join("; "));
      }
    }

    const data: any = {};
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.about !== undefined) data.about = dto.about;
    if (dto.services !== undefined) data.services = dto.services;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl;
    if (dto.socialLinks !== undefined) data.socialLinks = dto.socialLinks;
    if (dto.template !== undefined) data.template = dto.template;
    if (Object.keys(configObj).length > 0) data.config = configObj;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;

    // Legal Accreditation
    if (dto.universityDegree !== undefined) data.universityDegree = dto.universityDegree;
    if (dto.graduationYear !== undefined) data.graduationYear = Number(dto.graduationYear);
    if (dto.mppsCode !== undefined) data.mppsCode = dto.mppsCode;
    if (dto.cndvCode !== undefined) data.cndvCode = dto.cndvCode;
    if (dto.cndvState !== undefined) data.cndvState = dto.cndvState;
    if (dto.identityCard !== undefined) data.identityCard = dto.identityCard;
    if (dto.degreeFileUrl !== undefined) data.degreeFileUrl = dto.degreeFileUrl;
    if (dto.licenseFileUrl !== undefined) data.licenseFileUrl = dto.licenseFileUrl;

    // Si envía recaudos y su estado actual es UNVERIFIED o REJECTED, pasa automáticamente a PENDING
    const isSubmittingAccreditation =
      dto.mppsCode || dto.cndvCode || dto.degreeFileUrl || dto.licenseFileUrl;

    if (
      isSubmittingAccreditation &&
      (nutritionist.verificationStatus === "UNVERIFIED" || nutritionist.verificationStatus === "REJECTED")
    ) {
      data.verificationStatus = "PENDING";
    }

    const updated = await this.portfolioRepository.update(userId, data);
    return updated;
  }

  async trackEvent(username: string, dto: TrackPortfolioEventDto) {
    const nutritionist = await this.portfolioRepository.findByUsername(username);
    if (!nutritionist || !nutritionist.isPublic) {
      throw new EntityNotFoundException("Portafolio");
    }

    const event = await this.portfolioRepository.createEvent({
      nutritionistId: nutritionist.id,
      eventType: dto.eventType,
      referrer: dto.referrer,
      metadata: dto.metadata,
    });

    return { success: true, eventId: event.id };
  }

  async getAnalytics(nutritionistId: string, days: number = 30) {
    return this.portfolioRepository.getAnalytics(nutritionistId, days);
  }

  async bookAppointment(username: string, dto: BookConsultationDto) {
    const nutritionist = await this.portfolioRepository.findByUsername(username);
    if (!nutritionist || !nutritionist.isPublic) {
      throw new EntityNotFoundException("Portafolio");
    }

    const user = nutritionist.user as any;
    if (!user || user.status !== "ACTIVE") {
      throw new EntityNotFoundException("Portafolio");
    }

    const consultation = await this.portfolioRepository.createBooking(nutritionist.id, dto);

    return {
      success: true,
      message: "Solicitud de cita enviada correctamente. El nutricionista revisará tu solicitud.",
      consultation,
    };
  }

  async validateUsername(username: string) {
    if (!username || username.length === 0) {
      return false;
    }


    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(username)) {
      return false;
    }

    const count = await this.portfolioRepository.countByUsername(username);
    return count === 0;
  }

  private async runAutoMigration(nutritionist: any) {
    const config = nutritionist.config as Record<string, any> | null;
    const widgets = config?.widgets;
    const hasWidgets = Array.isArray(widgets) && widgets.length > 0;

    if (hasWidgets) {
      return nutritionist;
    }

    const user = nutritionist.user as any;
    const fullName = user?.fullName || "Nutricionista";

    const newWidgets: Array<{
      id: string;
      type: string;
      order: number;
      visible: boolean;
      content: Record<string, unknown>;
    }> = [];
    let order = 0;

    // Always create a hero widget with user data
    newWidgets.push({
      id: `w_hero`,
      type: "hero",
      order: order++,
      visible: true,
      content: {
        fullName,
        professionalTitle: nutritionist.bio || "",
        profileImageUrl: nutritionist.photoUrl || user?.avatarUrl || undefined,
        description: nutritionist.about ? nutritionist.about.slice(0, 120) : "",
      },
    });

    if (nutritionist.about) {
      newWidgets.push({
        id: `w_about`,
        type: "about",
        order: order++,
        visible: true,
        content: {
          biography: nutritionist.about,
        },
      });
    }

    if (Array.isArray(nutritionist.services) && nutritionist.services.length > 0) {
      newWidgets.push({
        id: `w_services`,
        type: "services",
        order: order++,
        visible: true,
        content: {
          title: "Mis Servicios",
          items: nutritionist.services.map((s: string, i: number) => ({
            name: s,
            description: s,
            icon: "Apple",
          })),
        },
      });
    }

    const autoConfig = {
      palette: "natural",
      widgets: newWidgets,
    };

    await this.portfolioRepository.update(nutritionist.userId, {
      config: autoConfig,
    } as any);

    return {
      ...nutritionist,
      config: autoConfig,
    };
  }

  async reviewAccreditation(
    userIdOrId: string,
    status: "VERIFIED" | "REJECTED",
    rejectionReason?: string,
  ) {
    const data: any = {
      verificationStatus: status,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      rejectionReason: status === "REJECTED" ? rejectionReason : null,
    };

    return await this.portfolioRepository.update(userIdOrId, data);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
