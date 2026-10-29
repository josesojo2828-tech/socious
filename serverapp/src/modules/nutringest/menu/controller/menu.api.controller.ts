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
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor, type File } from "@nest-lab/fastify-multer";

// Services
import { MenuService } from "../service/menu.service";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";

// Repositories
import MenuRepository from "../repository/menu.repository";

// DTOs
import { AddMenuItemDto, AddMenuCondimentDto, CreateMenuDto } from "../dto/menu.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { MenuMetricsService } from "../service/menu-metrics.service";
import { ApiOperation, ApiQuery } from "@nestjs/swagger";
import { MenuDashboardMetrics } from "../dto/menu-metrics.type";

@Controller("api/menu")
@UseGuards(SessionAuthGuard)
export class MenuApiController {
  constructor(
    private readonly menuService: MenuService,
    private readonly menuMetricsService: MenuMetricsService,
    private readonly menuRepository: MenuRepository,
  ) { }

  @Get("dashboard")
  async getDashboardMetrics(
    @Request() req: RequestWithUser,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ): Promise<MenuDashboardMetrics> {
    const isAdmin = req.user.permits?.list?.includes("USER_LIST") || req.user.permits?.list?.includes("PERMIT_DASHBOARD");
    const isPatient = req.user.permits?.name === "PATIENT" || (req.user.patientProfiles && req.user.patientProfiles.length > 0);
    const patientId = isPatient ? req.user.patientProfiles?.[0]?.id : undefined;
    const nutProfile = (!isAdmin && !isPatient) ? await this.menuService.ensureNutritionistProfile(req.user) : null;
    const nutritionistId = (isAdmin || isPatient) ? undefined : (nutProfile?.id || req.user.nutritionistProfile?.id);

    return this.menuMetricsService.getMenuMetrics({
      nutritionistId,
      patientId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // ==========================================
  // API JSON: DETALLE E INGREDIENTES (NUEVO)
  // ==========================================

  // 1. Obtener Detalle de Menú (JSON con Items)
  @Get("/:id/detail/api")
  async getDetailApi(@Param("id") id: string, @Req() req: RequestWithUser) {
    return await this.menuService.findOneWithItems({
      id,
      userSession: req.user,
    });
  }

  // 2. Agregar Ingrediente
  @Post("/:id/items/api")
  async addItemApi(
    @Param("id") menuId: string,
    @Body() body: AddMenuItemDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.menuService.addItem({
      menuId,
      data: body,
      userSession: req.user,
    });
  }

  // 3. Eliminar Ingrediente
  @Delete("/items/:itemId/api")
  async deleteItemApi(
    @Param("itemId") itemId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.menuService.removeItem({ itemId, userSession: req.user });
  }

  // 4. Actualizar Ingrediente
  @Post("/items/:itemId/update/api")
  async updateItemApi(
    @Param("itemId") itemId: string,
    @Body() body: AddMenuItemDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.menuService.updateItem({
      itemId,
      data: body,
      userSession: req.user,
    });
  }

  // 5. Agregar Condimento
  @Post("/:id/condiments/api")
  async addCondimentApi(
    @Param("id") menuId: string,
    @Body() body: AddMenuCondimentDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.menuService.addCondiment({
      menuId,
      data: body,
      userSession: req.user,
    });
  }

  // 6. Eliminar Condimento
  @Delete("/condiments/:condimentId/api")
  async deleteCondimentApi(
    @Param("condimentId") condimentId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.menuService.removeCondiment({
      condimentId,
      userSession: req.user,
    });
  }

  // 7. Subir Foto del Menú
  @Post("/:id/image/api")
  @UseInterceptors(FileInterceptor("file"))
  async uploadImageApi(
    @Param("id") menuId: string,
    @Req() req: RequestWithUser,
    @UploadedFile() file: File,
  ) {
    return await this.menuService.uploadImage({
      menuId,
      file,
      userSession: req.user,
    });
  }

  // 8. Quitar Foto del Menú
  @Delete("/:id/image/api")
  async removeImageApi(
    @Param("id") menuId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.menuService.removeImage({
      menuId,
      userSession: req.user,
    });
  }

  /**
   * GENERADOR DE FORMULARIOS (MODALES)
   * GET /api/menu/form/:type
   * Portado desde menu.render.controller.ts
   */
  @Get("form/:type")
  async form(
    @Req() req: RequestWithUser,
    @Query() query: { id?: string; lang?: string; menuId?: string },
    @Param() param: { type: string },
  ) {
    const effectiveLang = query.lang || "es";

    // 1. CREAR MENU
    if (param.type === "create") {
      const formStructure = this.menuRepository.getFormCreate({});
      return this.menuService.translateForm(formStructure, effectiveLang);
    }

    // 2. EDITAR MENU
    else if (param.type === "update") {
      const object = await this.menuRepository.findOne({
        where: { id: query.id },
      });
      if (!object) throw new NotFoundException("Menu no encontrado");

      const formStructure = this.menuRepository.getFormUpdate({ object });
      return this.menuService.translateForm(formStructure, effectiveLang);
    }
    throw new NotFoundException("Formulario no válido");
  }

  @Get("")
  async index(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 10;
    return await this.menuService.pagination({
      query: { ...query, page, limit },
      userSession: req.user,
    });
  }

  @Post("/create/api")
  async createApi(
    @Body() body: CreateMenuDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.menuService.create({
      data: body,
      userSession: req.user,
    });
    return { message: `Menu ${body.name} registrado.`, entity };
  }

  @Post("/:id/update/api")
  async updateApi(
    @Param() param: { id: string },
    @Body() body: CreateMenuDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.menuService.update({
      data: body,
      id: param.id,
      userSession: req.user,
    });
    return { message: "Datos del Menu actualizados.", entity };
  }

  @Post("/:id/delete/api")
  async deleteApi(
    @Param() param: { id: string },
    @Req() req: RequestWithUser,
  ) {
    await this.menuService.delete({ id: param.id, userSession: req.user });
    return { message: "Menu eliminado.", entity: null };
  }

  @Post("/:id/archive/api")
  async archiveApi(
    @Param() param: { id: string },
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.menuService.archive({
      id: param.id,
      userSession: req.user,
    });
    return { message: "Menú archivado.", entity };
  }

  @Post("/:id/unarchive/api")
  async unarchiveApi(
    @Param() param: { id: string },
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.menuService.unarchive({
      id: param.id,
      userSession: req.user,
    });
    return { message: "Menú desarchivado.", entity };
  }

  @Post("/:id/update")
  async update(
    @Param() param: { id: string },
    @Body() body: CreateMenuDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.menuService.update({
      data: body,
      id: param.id,
      userSession: req.user,
    });
  }
}
