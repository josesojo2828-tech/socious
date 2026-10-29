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
  Patch,
} from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { GoalService } from "../service/goal.service";
import GoalRepository from "../repository/goal.repository";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { CreateGoalDto, UpdateGoalDto } from "../dto/goal.type";
import { patientsWhereNutritionistAccess } from "../helpers/can-access-patient";

@Controller("api/goals")
@UseGuards(SessionAuthGuard)
export class GoalApiController {
  constructor(
    private readonly goalService: GoalService,
    private readonly goalRepository: GoalRepository,
  ) {}

  // --- NUEVO: MÉTRICAS (KPIs) ---
  @Get("/metrics/:patientId")
  async getMetrics(
    @Param("patientId") patientId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.goalService.getMetrics({
      patientId,
      userSession: req.user,
    });
  }

  // --- LECTURA ---
  @Get("")
  async index(@Req() req: RequestWithUser, @Query() query: FilterParamsDto) {
    return await this.goalService.pagination({ query, userSession: req.user });
  }

  @Get("/:id")
  async detail(@Param("id") id: string) {
    const entity = await this.goalRepository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException("Meta no encontrada");
    return entity;
  }

  // --- ESCRITURA ---
  @Post("/create/api")
  async create(@Body() body: CreateGoalDto, @Req() req: RequestWithUser) {
    const entity = await this.goalService.create({
      data: body,
      userSession: req.user,
    });
    return { message: "Meta establecida con éxito.", entity };
  }

  // Usamos el DTO de actualización parcial
  @Post("/:id/update/api")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateGoalDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.goalService.update({
      id,
      data: body,
      userSession: req.user,
    });
    return { message: "Progreso actualizado.", entity };
  }

  @Post("/:id/delete/api")
  async delete(@Param("id") id: string, @Req() req: RequestWithUser) {
    await this.goalService.delete({ id, userSession: req.user });
    return { message: "Meta eliminada.", entity: null };
  }

  // --- FORMULARIOS ---
  @Get("form/:type")
  async getForm(
    @Param("type") type: string,
    @Query() query: { patientId?: string; id?: string; lang?: string },
    @Req() req: RequestWithUser,
  ) {
    const lang = query.lang || "es";

    if (type === "create") {
      if (!query.patientId) throw new NotFoundException("patientId es requerido");
      return await this.goalService.getCreateForm({
        patientId: query.patientId,
        lang,
        userSession: req.user,
      });
    } else if (type === "update") {
      const nutritionistId = req.user.nutritionistProfile?.id;
      const object = await this.goalRepository.findOne({
        where: {
          id: query.id,
          patient: patientsWhereNutritionistAccess(nutritionistId),
        },
      });
      if (!object) throw new NotFoundException("Meta no encontrada o sin acceso.");

      const form = this.goalRepository.getFormUpdate({ object });
      return this.goalService.translateForm(form, lang);
    }

    throw new NotFoundException("Formulario no válido");
  }
}
