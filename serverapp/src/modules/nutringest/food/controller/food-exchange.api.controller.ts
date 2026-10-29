import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  Get,
  NotFoundException,
} from "@nestjs/common";
import { ExchangeListService } from "../service/food-exchange.service";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import type { ICreateExchangeListDto } from "../dto/food-exchange.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { ApiOperation, ApiQuery } from "@nestjs/swagger";
import {
  CategorizedFoodMetrics,
  GetExchangeMetricsDto,
} from "../dto/food-metrics";
import { FoodMetricsService } from "../service/food-metrics.service";
import ExchangeListRepository from "../repository/food-exchange.repository";

@Controller("api/exchange-food")
@UseGuards(SessionAuthGuard)
export class ExchangeListApiController {
  constructor(
    private readonly service: ExchangeListService,
    private readonly metricsService: FoodMetricsService,
    private readonly repo: ExchangeListRepository,
  ) { }

  @Get("dashboard")
  @ApiOperation({
    summary: "Obtener métricas del catálogo de alimentos categorizados",
  })
  @ApiQuery({
    name: "searchQuery",
    required: false,
    type: String,
    description: "Filtrar métricas por texto",
  })
  async getDashboardMetrics(
    @Query() query: GetExchangeMetricsDto,
  ): Promise<CategorizedFoodMetrics> {
    return this.metricsService.getDashboardExchangeMetrics({
      searchQuery: query.searchQuery,
    });
  }

  @Get("")
  async index(@Req() req: RequestWithUser, @Query() query: FilterParamsDto) {
    return await this.service.pagination({
      query: query,
      userSession: req.user,
    });
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return await this.service.unique({ id });
  }

  /**
   * GENERADOR DE FORMULARIOS (MODALES)
   * GET /api/exchange-food/form/:type
   * Portado desde food-exchange.render.controller.ts
   */
  @Get("form/:type")
  async form(@Query() query: { id?: string }, @Param("type") type: string) {
    if (type === "create") return this.repo.getFormCreate();
    if (type === "update") {
      const obj = await this.repo.findOne({ where: { id: query.id } });
      if (!obj) throw new NotFoundException();
      return this.repo.getFormUpdate({ object: obj as any });
    }
  }

  @Post("/create/api")
  async createApi(
    @Body() body: ICreateExchangeListDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.service.create({
      data: body,
      userSession: req.user,
    });
    return entity;
  }

  @Post("/:id/update")
  async update(
    @Param("id") id: string,
    @Body() body: ICreateExchangeListDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.service.update({
      id,
      data: body,
      userSession: req.user,
    });
  }

  @Post("/:id/update/api")
  async updateApi(
    @Param("id") id: string,
    @Body() body: ICreateExchangeListDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.service.update({
      id,
      data: body,
      userSession: req.user,
    });
    return { message: "Lista actualizada.", entity };
  }
}
