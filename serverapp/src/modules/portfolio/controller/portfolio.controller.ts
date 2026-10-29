import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { FileInterceptor, type File } from "@nest-lab/fastify-multer";
import { safeExtensionFromMime } from "src/shared/helpers/file.util";

import { PortfolioService } from "../service/portfolio.service";
import { StorageService } from "src/modules/file/storage.service";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { Public } from "src/shared/decorators/public.decorator";
import { UpdatePortfolioDto, TrackPortfolioEventDto, BookConsultationDto } from "../dto/portfolio.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { PermissionService } from "src/modules/permit/service/permission.service";

@Controller("api/portfolio")
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly storageService: StorageService,
    private readonly permissionService: PermissionService,
  ) {}

  @Post("upload")
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadImage(
    @Req() req: RequestWithUser,
    @UploadedFile() file: File,
  ) {
    if (!this.permissionService.hasPortfolioAccess(req.user)) {
      throw new ForbiddenException("La subida de archivos al portafolio requiere una suscripción PREMIUM activa.");
    }

    if (!file || !file.buffer) {
      throw new BadRequestException("Debe subir una imagen.");
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size && file.size > maxSize) {
      throw new BadRequestException("La imagen excede el tamaño máximo permitido de 5MB.");
    }

    const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("Solo se permiten imágenes PNG, JPG, JPEG, WEBP.");
    }

    const fileExtension = safeExtensionFromMime(file.mimetype, file.originalname);
    const filename = `portfolio_${req.user.id}_${Date.now()}.${fileExtension}`;

    await this.storageService.uploadFile(file.buffer, filename, file.mimetype);
    const fileUrl = await this.storageService.getFileUrl(filename);

    return { success: true, url: fileUrl };
  }

  @Get("public/@:username")
  @Public()
  async getPublicProfile(@Param("username") username: string) {
    return this.portfolioService.getPublicProfile(username);
  }

  @Post("public/@:username/track")
  @Public()
  async trackEvent(
    @Param("username") username: string,
    @Body() body: TrackPortfolioEventDto,
  ) {
    return this.portfolioService.trackEvent(username, body);
  }

  @Post("public/@:username/book")
  @Public()
  async bookAppointment(
    @Param("username") username: string,
    @Body() body: BookConsultationDto,
  ) {
    return this.portfolioService.bookAppointment(username, body);
  }

  @Get("analytics")
  @UseGuards(SessionAuthGuard)
  async getAnalytics(
    @Req() req: RequestWithUser,
    @Query("days") days?: string,
  ) {
    if (!this.permissionService.hasPortfolioAccess(req.user)) {
      throw new ForbiddenException("El acceso a las métricas del portafolio requiere una suscripción PREMIUM activa.");
    }
    const profile = await this.portfolioService.getByUserId(req.user.id);
    const nutritionistId = req.user.nutritionistProfile?.id || (profile as any).id;
    return this.portfolioService.getAnalytics(
      nutritionistId,
      days ? Number(days) : 30,
    );
  }

  @Post("update")
  @UseGuards(SessionAuthGuard)
  async update(
    @Req() req: RequestWithUser,
    @Body() body: UpdatePortfolioDto,
  ) {
    if (!this.permissionService.hasPortfolioAccess(req.user)) {
      throw new ForbiddenException("La gestión del portafolio digital y redes sociales requiere una suscripción PREMIUM activa.");
    }

    const nutritionist = await this.portfolioService.update(req.user.id, body);
    const user = nutritionist.user as any;
    const portfolio = {
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: nutritionist.bio,
      about: nutritionist.about,
      services: nutritionist.services,
      socialLinks: nutritionist.socialLinks,
      photoUrl: nutritionist.photoUrl,
      template: nutritionist.template,
      config: nutritionist.config,
      isPublic: nutritionist.isPublic,
      // Accreditation & Verification
      verificationStatus: nutritionist.verificationStatus || "UNVERIFIED",
      universityDegree: nutritionist.universityDegree,
      graduationYear: nutritionist.graduationYear,
      mppsCode: nutritionist.mppsCode,
      cndvCode: nutritionist.cndvCode,
      cndvState: nutritionist.cndvState,
      identityCard: nutritionist.identityCard,
      degreeFileUrl: nutritionist.degreeFileUrl,
      licenseFileUrl: nutritionist.licenseFileUrl,
      verifiedAt: nutritionist.verifiedAt,
      rejectionReason: nutritionist.rejectionReason,
    };
    return { success: true, portfolio };
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  async getMyPortfolio(@Req() req: RequestWithUser) {
    if (!this.permissionService.hasPortfolioAccess(req.user)) {
      throw new ForbiddenException("El acceso al portafolio digital requiere una suscripción PREMIUM activa.");
    }

    return this.portfolioService.getByUserId(req.user.id);
  }

  @Get("user/:userId")
  @UseGuards(SessionAuthGuard)
  async getPortfolioByUserId(
    @Req() req: RequestWithUser,
    @Param("userId") userId: string,
  ) {
    const isAdmin =
      (req.user as any)?.permits?.name === "SUPERADMIN" ||
      (req.user as any)?.permits?.name === "ADMIN";

    if (!isAdmin) {
      throw new ForbiddenException("Solo administradores pueden consultar datos de acreditación.");
    }

    return this.portfolioService.getByUserId(userId);
  }

  @Get("validate-username/:username")
  @Public()
  async validateUsername(@Param("username") username: string) {
    const available = await this.portfolioService.validateUsername(username);
    return { available };
  }

  @Post("accreditation/review")
  @UseGuards(SessionAuthGuard)
  async reviewAccreditation(
    @Req() req: RequestWithUser,
    @Body() body: { nutritionistId: string; status: "VERIFIED" | "REJECTED"; rejectionReason?: string },
  ) {
    const isAdmin =
      (req.user as any)?.permits?.name === "SUPERADMIN" ||
      (req.user as any)?.permits?.name === "ADMIN";

    if (!isAdmin) {
      throw new ForbiddenException("Solo administradores pueden revisar la acreditación profesional.");
    }

    const updated = await this.portfolioService.reviewAccreditation(
      body.nutritionistId,
      body.status,
      body.rejectionReason,
    );

    return { success: true, nutritionist: updated };
  }
}

