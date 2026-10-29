import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
  Query,
} from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { InstitutionalFoodGuard } from "../guard/institutional-food.guard";
import { InstitutionalFoodService } from "../service/institutional-food.service";
import { PriceScraperService } from "../scraper/price-scraper.service";
import { CreateInstitutionalCalculationDto } from "../dto/create-calculation.dto";
import { CreateInstitutionalMenuDto } from "../dto/create-menu.dto";
import type { RequestWithUser } from "src/shared/types/server.type";

@Controller("api/institutional-calculations")
@UseGuards(SessionAuthGuard, InstitutionalFoodGuard)
export class InstitutionalFoodController {
  constructor(
    private readonly institutionalService: InstitutionalFoodService,
    private readonly scraperService: PriceScraperService
  ) {}

  @Post("")
  async createCalculation(
    @Body() dto: CreateInstitutionalCalculationDto,
    @Req() req: RequestWithUser
  ) {
    const nutritionistId = req.user.nutritionistProfile?.id;
    if (!nutritionistId) {
      throw new ForbiddenException(
        "Solo los usuarios con perfil de nutricionista pueden realizar cálculos institucionales."
      );
    }
    return this.institutionalService.createCalculation(nutritionistId, dto);
  }

  @Post("/:id/menus")
  async createMenu(
    @Param("id") calculationId: string,
    @Body() dto: CreateInstitutionalMenuDto,
    @Req() req: RequestWithUser
  ) {
    const nutritionistId = req.user.nutritionistProfile?.id;
    if (!nutritionistId) {
      throw new ForbiddenException(
        "Solo los usuarios con perfil de nutricionista pueden agregar menús a cálculos institucionales."
      );
    }
    return this.institutionalService.createMenu(nutritionistId, calculationId, dto);
  }

  @Get("/:id")
  async getCalculation(
    @Param("id") id: string,
    @Req() req: RequestWithUser
  ) {
    const nutritionistId = req.user.nutritionistProfile?.id;
    const calculation = await this.institutionalService.getCalculation(id);

    // Validar propiedad o membresía de colaboración a menos que sea Admin/SuperAdmin
    const isAdmin =
      req.user.permits?.name === "SUPERADMIN" ||
      req.user.permits?.name === "ADMIN";

    const isOwner = calculation.nutritionistId === nutritionistId;
    const isCollaborator = calculation.collaborators?.some(
      (c: any) => c.nutritionistId === nutritionistId
    );

    if (!isAdmin && !isOwner && !isCollaborator) {
      throw new ForbiddenException(
        "No tienes permisos para acceder a esta simulación institucional."
      );
    }

    return calculation;
  }

  @Post("/:id/collaborators")
  async addCollaborator(
    @Param("id") calculationId: string,
    @Body("targetNutriId") targetNutriId: string,
    @Body("role") role: any,
    @Req() req: RequestWithUser
  ) {
    const ownerNutriId = req.user.nutritionistProfile?.id;
    if (!ownerNutriId) {
      throw new ForbiddenException(
        "Solo nutricionistas pueden gestionar colaboradores."
      );
    }
    return this.institutionalService.addCollaborator(
      ownerNutriId,
      calculationId,
      targetNutriId,
      role
    );
  }

  @Delete("/:id/collaborators/:targetNutriId")
  async removeCollaborator(
    @Param("id") calculationId: string,
    @Param("targetNutriId") targetNutriId: string,
    @Req() req: RequestWithUser
  ) {
    const ownerNutriId = req.user.nutritionistProfile?.id;
    if (!ownerNutriId) {
      throw new ForbiddenException(
        "Solo nutricionistas pueden remover colaboradores."
      );
    }
    return this.institutionalService.removeCollaborator(
      ownerNutriId,
      calculationId,
      targetNutriId
    );
  }

  @Patch("/:id/collaborators/respond")
  async respondCollaboratorInvitation(
    @Param("id") calculationId: string,
    @Body("accept") accept: boolean,
    @Req() req: RequestWithUser
  ) {
    const targetNutriId = req.user.nutritionistProfile?.id;
    if (!targetNutriId) {
      throw new ForbiddenException(
        "Solo nutricionistas pueden responder invitaciones de colaboración."
      );
    }
    return this.institutionalService.respondCollaboratorInvitation(
      targetNutriId,
      calculationId,
      accept
    );
  }

  @Get("/foods/:foodId/price-history")
  async getPriceHistory(
    @Param("foodId") foodId: string
  ) {
    return this.institutionalService.getPriceHistory(foodId);
  }

  @Post("/foods/:foodId/sync-price")
  async syncFoodPrice(
    @Param("foodId") foodId: string
  ) {
    return this.scraperService.syncFoodPrice(foodId);
  }

  @Post("/prices/sync-batch")
  async syncBatchPrices(
    @Query("limit") limit?: number
  ) {
    const batchLimit = limit ? Number(limit) : 10;
    return this.scraperService.syncAllPrices(batchLimit);
  }

  @Get("")
  async listCalculations(
    @Req() req: RequestWithUser,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("q") q?: string
  ) {
    const nutritionistId = req.user.nutritionistProfile?.id || null;
    const isAdmin =
      req.user.permits?.name === "SUPERADMIN" ||
      req.user.permits?.name === "ADMIN";

    return this.institutionalService.listCalculations(nutritionistId, isAdmin, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
    });
  }

  @Delete("/:id")
  async deleteCalculation(
    @Param("id") id: string,
    @Req() req: RequestWithUser
  ) {
    const nutritionistId = req.user.nutritionistProfile?.id;
    if (!nutritionistId) {
      throw new ForbiddenException(
        "Solo los usuarios con perfil de nutricionista pueden gestionar cálculos institucionales."
      );
    }
    const isAdmin =
      req.user.permits?.name === "SUPERADMIN" ||
      req.user.permits?.name === "ADMIN";

    return this.institutionalService.deleteCalculation(nutritionistId, id, isAdmin);
  }
}
