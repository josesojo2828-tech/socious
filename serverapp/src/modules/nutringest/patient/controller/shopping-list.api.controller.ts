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
import { ShoppingListService } from "../service/shopping-list.service";
import ShoppingListRepository from "../repository/shopping-list.repository";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { CreateShoppingListDto } from "../dto/shoping-list.type";
import { patientsWhereNutritionistAccess } from "../helpers/can-access-patient";

@Controller("api/shopping")
@UseGuards(SessionAuthGuard)
export class ShoppingListApiController {
  constructor(
    private readonly shoppingService: ShoppingListService,
    private readonly shoppingRepository: ShoppingListRepository,
  ) {}

  @Get("")
  async index(@Req() req: RequestWithUser, @Query() query: FilterParamsDto) {
    return await this.shoppingService.pagination({
      query,
      userSession: req.user,
    });
  }

  @Get("/:id")
  async detail(@Param("id") id: string, @Req() req: RequestWithUser) {
    const nutritionistId = req.user.nutritionistProfile?.id;
    const entity = await this.shoppingRepository.findOne({
      where: {
        id,
        patient: patientsWhereNutritionistAccess(nutritionistId),
      },
    });
    if (!entity) throw new NotFoundException("Lista no encontrada o sin acceso.");
    return entity;
  }

  @Post("/create/api")
  async create(
    @Body() body: CreateShoppingListDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.shoppingService.create({
      data: body,
      userSession: req.user,
    });
    return { message: "Lista generada.", entity };
  }

  @Post("/:id/delete/api")
  async delete(@Param("id") id: string, @Req() req: RequestWithUser) {
    const nutritionistId = req.user.nutritionistProfile?.id;
    const entity = await this.shoppingRepository.findOne({
      where: {
        id,
        patient: patientsWhereNutritionistAccess(nutritionistId),
      },
    });
    if (!entity) throw new NotFoundException("Lista no encontrada o sin acceso.");
    await this.shoppingRepository.delete({ where: { id } });
    return { message: "Lista eliminada.", entity: null };
  }

  @Get("form/:type")
  async getForm(
    @Param("type") type: string,
    @Query() query: { patientId?: string; lang?: string },
    @Req() req: RequestWithUser,
  ) {
    if (type === "create") {
      if (!query.patientId) throw new NotFoundException("Falta patientId.");
      return await this.shoppingService.getCreateForm({
        patientId: query.patientId,
        lang: query.lang || "es",
        userSession: req.user,
      });
    }
    throw new NotFoundException("Formulario no disponible");
  }
}
