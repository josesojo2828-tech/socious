import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { DietLegacyService } from "../service/diet-legacy.service";
import DietLegacyRepository from "../repository/diet-legacy.repository";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { CreateLegacyDietPlanDto } from "../dto/diet-plan.type";
import { patientsWhereNutritionistAccess } from "../helpers/can-access-patient";

@Controller("api/diets")
@UseGuards(SessionAuthGuard)
export class DietLegacyApiController {
  constructor(
    private readonly dietService: DietLegacyService,
    private readonly dietRepository: DietLegacyRepository,
  ) {}

  @Get("")
  async index(@Req() req: RequestWithUser, @Query() query: FilterParamsDto) {
    return await this.dietService.pagination({ query, userSession: req.user });
  }

  @Get("/:id")
  async detail(@Param("id") id: string, @Req() req: RequestWithUser) {
    const nutritionistId = req.user.nutritionistProfile?.id;
    const entity = await this.dietRepository.findOne({
      where: {
        id,
        patient: patientsWhereNutritionistAccess(nutritionistId),
      },
    });
    if (!entity) throw new NotFoundException("Dieta no encontrada o sin acceso.");
    return entity;
  }

  @Post("/create/api")
  async create(
    @Body() body: CreateLegacyDietPlanDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.dietService.create({
      data: body,
      userSession: req.user,
    });
    return { message: "Dieta creada.", entity };
  }

  @Post("/:id/delete/api")
  async delete(@Param("id") id: string, @Req() req: RequestWithUser) {
    const nutritionistId = req.user.nutritionistProfile?.id;
    const entity = await this.dietRepository.findOne({
      where: {
        id,
        patient: patientsWhereNutritionistAccess(nutritionistId),
      },
    });
    if (!entity) throw new NotFoundException("Dieta no encontrada o sin acceso.");
    await this.dietRepository.delete({ where: { id } });
    return { message: "Dieta eliminada.", entity: null };
  }

  @Get("form/:type")
  async getForm(
    @Param("type") type: string,
    @Query() query: { patientId?: string; lang?: string },
    @Req() req: RequestWithUser,
  ) {
    if (type === "create") {
      if (!query.patientId) throw new NotFoundException("Falta patientId.");
      return await this.dietService.getCreateForm({
        patientId: query.patientId,
        lang: query.lang || "es",
        userSession: req.user,
      });
    }
    throw new NotFoundException("Formulario no disponible");
  }
}
