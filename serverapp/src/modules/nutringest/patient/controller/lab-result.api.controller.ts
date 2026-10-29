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
import { LabResultService } from "../service/lab-result.service";
import LabResultRepository from "../repository/lab-result.repository";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { CreateLabResultDto } from "../dto/lab-result.dto";
import { patientsWhereNutritionistAccess } from "../helpers/can-access-patient";

@Controller("api/labs")
@UseGuards(SessionAuthGuard)
export class LabResultApiController {
  constructor(
    private readonly labService: LabResultService,
    private readonly labRepository: LabResultRepository,
  ) {}

  @Get("")
  async index(@Req() req: RequestWithUser, @Query() query: FilterParamsDto) {
    return await this.labService.pagination({ query, userSession: req.user });
  }

  @Get("/:id")
  async detail(@Param("id") id: string, @Req() req: RequestWithUser) {
    const nutritionistId = req.user.nutritionistProfile?.id;
    const entity = await this.labRepository.findOne({
      where: {
        id,
        patient: patientsWhereNutritionistAccess(nutritionistId),
      },
    });
    if (!entity) throw new NotFoundException("Examen no encontrado o sin acceso.");
    return entity;
  }

  @Post("/create/api")
  async create(@Body() body: CreateLabResultDto, @Req() req: RequestWithUser) {
    const entity = await this.labService.create({
      data: body,
      userSession: req.user,
    });
    return { message: "Resultados guardados.", entity };
  }

  @Post("/:id/delete/api")
  async delete(@Param("id") id: string, @Req() req: RequestWithUser) {
    const nutritionistId = req.user.nutritionistProfile?.id;
    const entity = await this.labRepository.findOne({
      where: {
        id,
        patient: patientsWhereNutritionistAccess(nutritionistId),
      },
    });
    if (!entity) throw new NotFoundException("Examen no encontrado o sin acceso.");
    await this.labRepository.delete({ where: { id } });
    return { message: "Examen eliminado.", entity: null };
  }

  @Get("form/:type")
  async getForm(
    @Param("type") type: string,
    @Query() query: { patientId?: string; lang?: string },
    @Req() req: RequestWithUser,
  ) {
    if (type === "create") {
      if (!query.patientId) throw new NotFoundException("Falta patientId.");
      return await this.labService.getCreateForm({
        patientId: query.patientId,
        lang: query.lang || "es",
        userSession: req.user,
      });
    }
    throw new NotFoundException("Formulario no disponible");
  }
}
