import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Get,
  Query,
  NotFoundException,
} from "@nestjs/common";

// Services
import { FoodService } from "../service/food.service";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import FoodRepository from "../repository/food.repository";

// DTOs
import type { ICreateFoodDto } from "../dto/food.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { ApiOperation, ApiQuery } from "@nestjs/swagger";
import { FoodDatabaseMetrics, GetFoodMetricsDto } from "../dto/food-metrics";
import { FoodMetricsService } from "../service/food-metrics.service";

@Controller("api/foods")
@UseGuards(SessionAuthGuard)
export class FoodApiController {
  constructor(
    private readonly foodService: FoodService,
    private readonly foodMetricsService: FoodMetricsService,
    private readonly foodRepository: FoodRepository,
  ) {}

  @Get("dashboard")
  @ApiOperation({
    summary: "Obtener KPIs y métricas generales del catálogo de alimentos",
  })
  @ApiQuery({
    name: "includeInactive",
    required: false,
    type: Boolean,
    description: "Incluir alimentos inactivos en el conteo",
  })
  @ApiQuery({
    name: "searchQuery",
    required: false,
    type: String,
    description: "Filtrar métricas por nombre de alimento",
  })
  async getDashboardMetrics(
    @Query() query: GetFoodMetricsDto,
  ): Promise<FoodDatabaseMetrics> {
    // Convertimos el string 'true' a boolean real
    const includeInactive = query.includeInactive === "true";

    return this.foodMetricsService.getDashboardMetrics({
      includeInactive,
      searchQuery: query.searchQuery,
    });
  }

  @Get("")
  async index(@Req() req: RequestWithUser, @Query() query: FilterParamsDto) {
    return await this.foodService.pagination({
      query: query,
      userSession: req.user,
    });
  }

  @Get(":id")
  async getOne(@Param("id") id: string, @Req() req: RequestWithUser) {
    const entity = await this.foodService.unique({
      id,
      userSession: req.user,
    });
    return entity;
  }

  /**
   * GENERADOR DE FORMULARIOS (MODALES)
   * GET /api/foods/form/:type
   * Portado desde food.render.controller.ts
   */
  @Get("form/:type")
  async form(
    @Req() req: RequestWithUser,
    @Query() query: { id?: string; lang?: string },
    @Param() param: { type: string },
  ) {
    const effectiveLang = query.lang || "es";

    // 1. Cargar opciones dinámicas (Categorías)
    const categoryOptions = await this.foodService.getCategoryOptions();

    // 2. FORMULARIO CREAR
    if (param.type === "create") {
      const formStructure = this.foodRepository.getFormCreate({
        categoryOptions,
      });
      return this.foodService.translateForm(formStructure, effectiveLang);
    }

    // 3. FORMULARIO EDITAR
    else if (param.type === "update") {
      const object = await this.foodRepository.findOne({
        where: { id: query.id },
      });

      if (!object) throw new NotFoundException("Alimento no encontrado");

      const formStructure = this.foodRepository.getFormUpdate({
        object,
        categoryOptions,
      });
      return this.foodService.translateForm(formStructure, effectiveLang);
    }

    throw new NotFoundException("Formulario no válido");
  }

  /**
   * CREAR ALIMENTO (API JSON)
   */
  @Post("/create/api")
  private async createApi(
    @Body() body: ICreateFoodDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.foodService.create({
      data: body,
      userSession: req.user,
    });
  }

  /**
   * ACTUALIZAR ALIMENTO
   */
  @Post("/:id/update")
  private async update(
    @Param() param: { id: string },
    @Body() body: ICreateFoodDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.foodService.update({
      data: body,
      id: param.id,
      userSession: req.user,
    });
  }

  /**
   * ELIMINAR (DESACTIVAR) ALIMENTO
   */
  @Post("/:id/delete")
  private async delete(
    @Param() param: { id: string },
    @Req() req: RequestWithUser,
  ) {
    await this.foodService.delete({ id: param.id, userSession: req.user });
    return { success: true };
  }
}
