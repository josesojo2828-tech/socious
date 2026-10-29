import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Get,
  Query,
  Request,
  Delete,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

// Services
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";

import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { ExchangeListService } from "../service/exchange-list.service";
import { AddExchangeItemDto, CreateExchangeListDto } from "../dto/exchange-list.type";
import { ExchangeDashboardMetrics } from "../dto/exchange-list-metrics.type";
import { ExchangeMetricsService } from "../service/exchange-list-metrics.service";
import { ExchangeListRepository } from "../repository/exchange-list.repository";
import { Logger } from "@nestjs/common";
const logger = new Logger("exchange-list.api.controller");


@Controller("api/exchange-list") // Corregí el typo 'exchage-list'
@UseGuards(SessionAuthGuard)
export class ExchangeListApiController {
  constructor(
    private readonly exchangeListService: ExchangeListService,
    private readonly exchangeMetricsService: ExchangeMetricsService,
    private readonly exchangeListRepository: ExchangeListRepository,
  ) { }

  // ==========================================
  // METRICAS & DASHBOARD
  // ==========================================

  @Get("dashboard")
  async getDashboardMetrics(
    @Request() req: RequestWithUser,
  ): Promise<ExchangeDashboardMetrics> {
    const nutritionistProfile =
      await this.exchangeListService.ensureNutritionistProfile(req.user);
    const nutritionistId = nutritionistProfile?.id;
    if (!nutritionistId) {
      return this.exchangeMetricsService.getEmptyMetrics();
    }
    return this.exchangeMetricsService.getExchangeMetrics({ nutritionistId });
  }

  // ==========================================
  // API JSON (Para la Vista React Personalizada)
  // ==========================================

  // 1. Obtener Detalle Completo (Con Items y Foods)
  @Get("/:id/detail/api")
  async getDetailApi(@Param("id") id: string, @Req() req: RequestWithUser) {
    return await this.exchangeListService.findOneWithItems({
      id,
      userSession: req.user,
    });
  }

  // 2. Agregar Alimento a la Lista
  @Post("/:id/items/api")
  async addItemApi(
    @Param("id") listId: string,
    @Body() body: AddExchangeItemDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.exchangeListService.addItem({
      listId,
      data: body,
      userSession: req.user,
    });
  }

  // 3. Eliminar Alimento de la Lista
  @Delete("/items/:itemId/api") // Ruta específica para borrar items
  async deleteItemApi(
    @Param("itemId") itemId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.exchangeListService.removeItem({
      itemId,
      userSession: req.user,
    });
  }

  // 4. Actualizar Alimento de la Lista (Raciones/Unidad)
  @Post("/items/:itemId/update/api")
  async updateItemApi(
    @Param("itemId") itemId: string,
    @Body() body: { amount: number; servingLabel?: string; groupLabel?: string; cookingState?: string },
    @Req() req: RequestWithUser,
  ) {
    return await this.exchangeListService.updateItem({
      itemId,
      amount: body.amount,
      servingLabel: body.servingLabel,
      groupLabel: body.groupLabel,
      cookingState: body.cookingState,
      userSession: req.user,
    });
  }

  // ==========================================
  // ENDPOINTS CRUD EXISTENTES (Form Generator)
  // ==========================================

  @Get("")
  private async index(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return await this.exchangeListService.pagination({
      query: query,
      userSession: req.user,
    });
  }

  /**
   * GENERADOR DE FORMULARIOS (MODALES)
   * GET /api/exchange-list/form/:type
   * Portado desde exchange-list.render.controller.ts
   */
  @Get("form/:type")
  async form(
    @Req() req: RequestWithUser,
    @Query() query: { id?: string; lang?: string; menuId?: string },
    @Param() param: { type: string },
  ) {
    const effectiveLang = query.lang || "es";

    // 1. CREAR LISTA
    if (param.type === "create") {
      const formStructure = this.exchangeListRepository.getFormCreate({});
      return this.exchangeListService.translateForm(
        formStructure,
        effectiveLang,
      );
    }

    // 2. EDITAR LISTA
    else if (param.type === "update") {
      const object = await this.exchangeListRepository.findOne({
        where: { id: query.id },
      });
      if (!object) throw new NotFoundException("Menu no encontrado");

      const formStructure = this.exchangeListRepository.getFormUpdate({
        object,
      });
      return this.exchangeListService.translateForm(
        formStructure,
        effectiveLang,
      );
    }
    throw new NotFoundException("Formulario no válido");
  }

  @Post("/create/api")
  private async createApi(
    @Body() body: CreateExchangeListDto,
    @Req() req: RequestWithUser,
  ) {
    logger.log("=== CREATE EXCHANGE LIST BODY ===", body);
    const entity = await this.exchangeListService.create({
      data: body,
      userSession: req.user,
    });
    return { message: `Lista ${body.name} registrada.`, entity };
  }

  @Post("/:id/update/api")
  private async updateApi(
    @Param() param: { id: string },
    @Body() body: CreateExchangeListDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.exchangeListService.update({
      data: body,
      id: param.id,
      userSession: req.user,
    });
    return { message: "Datos actualizados.", entity };
  }

  @Post("/:id/delete/api")
  private async deleteApi(
    @Param() param: { id: string },
    @Req() req: RequestWithUser,
  ) {
    await this.exchangeListService.delete({
      id: param.id,
      userSession: req.user,
    });
    return { message: "Lista eliminada.", entity: null };
  }

  @Post("/:id/archive/api")
  private async archiveApi(
    @Param() param: { id: string },
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.exchangeListService.archive({
      id: param.id,
      userSession: req.user,
    });
    return { message: "Lista archivada.", entity };
  }

  @Post("/:id/unarchive/api")
  private async unarchiveApi(
    @Param() param: { id: string },
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.exchangeListService.unarchive({
      id: param.id,
      userSession: req.user,
    });
    return { message: "Lista desarchivada.", entity };
  }

  // ... (Tus métodos de redirección para Fastify se quedan igual)
}
