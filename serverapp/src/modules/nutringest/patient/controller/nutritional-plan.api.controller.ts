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
import { Public } from "src/shared/decorators/public.decorator";
import { NutritionalPlanService } from "../service/nutritional-plan.service";
import NutritionalPlanRepository from "../repository/nutritional-plan.repository";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { CreateNutritionalPlanDto } from "../dto/nutritional-plan.type";

@Controller("api/plans")
export class NutritionalPlanApiController {
  constructor(
    private readonly planService: NutritionalPlanService,
    private readonly planRepository: NutritionalPlanRepository,
  ) {}

  @Get("")
  @UseGuards(SessionAuthGuard)
  async index(@Req() req: RequestWithUser, @Query() query: FilterParamsDto) {
    return await this.planService.pagination({ query, userSession: req.user });
  }

  @Post(":id/share")
  @UseGuards(SessionAuthGuard)
  async sharePlan(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.planService.generateShareToken(id, req.user);
  }

  // S2 (legal-compliance): revocación explícita — el enlace deja de servir.
  @Post(":id/share/revoke")
  @UseGuards(SessionAuthGuard)
  async revokeShare(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.planService.revokeShareToken(id, req.user);
  }

  // Endpoint PÚBLICO (para el paciente/PDF).
  // @Public() desactiva el SessionAuthGuard global; el plan solo se sirve
  // si isShared=true (ver findByShareToken en el service).
  @Public()
  @Get("shared/:token")
  async getSharedPlan(@Param("token") token: string) {
    return this.planService.findByShareToken(token);
  }

  @Get(":id/shopping-list")
  @UseGuards(SessionAuthGuard)
  async getShoppingList(@Param("id") id: string) {
    return this.planService.generateShoppingList(id);
  }

  @Get("/:id")
  @UseGuards(SessionAuthGuard)
  async detail(@Param("id") id: string, @Req() req: RequestWithUser) {
    const data = await this.planService.unique({ id, userSession: req.user });
    return data.object;
  }

  // Endpoint PÚBLICO: solo resuelve planes con isShared=true (por id o
  // shareToken). Sin sesión el fallback por patientId/userId fue eliminado.
  @Public()
  @Get("public/:id")
  async publicDetail(@Param("id") id: string) {
    const data = await this.planService.uniquePublic({ id });
    return data.object;
  }

  @Post("/create/api")
  @UseGuards(SessionAuthGuard)
  async create(
    @Body() body: CreateNutritionalPlanDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.planService.create({
      data: body,
      userSession: req.user,
    });
    return { message: "Plan nutricional creado.", entity };
  }

  @Post("/:id/update/api")
  @UseGuards(SessionAuthGuard)
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.planService.update({
      id,
      data: body,
      userSession: req.user,
    });
    return { message: "Plan actualizado.", entity };
  }

  @Post("/:id/delete/api")
  @UseGuards(SessionAuthGuard)
  async delete(@Param("id") id: string, @Req() req: RequestWithUser) {
    await this.planService.delete({ id, userSession: req.user });
    return { message: "Plan eliminado.", entity: null };
  }

  @Get("form/:type")
  @UseGuards(SessionAuthGuard)
  async getForm(
    @Param("type") type: string,
    @Query() query: { patientId?: string; id?: string; lang?: string },
    @Req() req: RequestWithUser,
  ) {
    const lang = query.lang || "es";

    if (type === "create") {
      if (!query.patientId) throw new NotFoundException("Falta patientId.");
      return await this.planService.getCreateForm({
        patientId: query.patientId,
        lang,
        userSession: req.user,
      });
    } else if (type === "update") {
      if (!query.id) throw new NotFoundException("Falta el ID del plan.");
      return await this.planService.getUpdateForm({
        id: query.id,
        lang,
        userSession: req.user,
      });
    }
    throw new NotFoundException("Formulario no válido");
  }
}
