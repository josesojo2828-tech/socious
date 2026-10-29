import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { AnthropometryService } from "../service/anthropometry.service";
import AnthropometryRepository from "../repository/anthropometry.repository";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import {
  CreateAnthropometryDto,
  UpdateAnthropometryDto,
} from "../dto/anthropometry.dto";

@Controller("api/anthropometry")
@UseGuards(SessionAuthGuard)
export class AnthropometryApiController {
  constructor(
    private readonly anthroService: AnthropometryService,
    private readonly anthroRepository: AnthropometryRepository,
  ) {}

  // --- LECTURA ---
  @Get("")
  async index(@Req() req: RequestWithUser, @Query() query: FilterParamsDto) {
    return await this.anthroService.pagination({
      query,
      userSession: req.user,
    });
  }

  @Get("/metrics/:patientId")
  async metrics(
    @Req() req: RequestWithUser,
    @Param("patientId") patientId: string,
  ) {
    return await this.anthroService.getMetrics({
      patientId: patientId,
      userSession: req.user,
    });
  }

  @Get("/:id")
  async detail(@Param("id") id: string) {
    const entity = await this.anthroRepository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException("Medición no encontrada");
    return entity;
  }

  // --- ESCRITURA ---
  @Post("/create/api")
  async create(
    @Body() body: CreateAnthropometryDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.anthroService.create({
      data: body,
      userSession: req.user,
    });
    return { message: "Medición registrada correctamente.", entity };
  }

  @Post("/:id/update/api")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateAnthropometryDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.anthroService.update({
      id,
      data: body,
      userSession: req.user,
    });
    return { message: "Medición corregida.", entity };
  }

  @Post("/:id/delete/api")
  async delete(@Param("id") id: string, @Req() req: RequestWithUser) {
    await this.anthroService.delete({ id, userSession: req.user });
    return { message: "Registro eliminado.", entity: null };
  }

  // --- FORMULARIOS (JSON) ---
  @Get("form/:type")
  async getForm(
    @Param("type") type: string,
    @Query() query: { patientId?: string; id?: string; lang?: string },
    @Req() req: RequestWithUser,
  ) {
    const lang = query.lang || "es";

    if (type === "create") {
      return await this.anthroService.getCreateForm({
        patientId: `${query.patientId}`,
        lang,
        userSession: req.user,
      });
    }

    throw new NotFoundException("Formulario no válido");
  }
}
