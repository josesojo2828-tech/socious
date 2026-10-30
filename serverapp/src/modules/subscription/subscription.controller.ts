import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  NotFoundException,
} from "@nestjs/common";

import { SubscriptionPlanService } from "./service/subscription.service";
import SubscriptionPlanReporitory from "./repository/subscription-plan.repository";
import { Public } from "src/shared/decorators/public.decorator";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { AutorenewSubscriptionService } from "./service/renew.service";
import { normalizeSubscriptionPlanContent } from "./util/subscription-plan-content.util";
import { Prisma } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";

import type { SubscriptionPlanCreate } from "./dto/subscription-plan.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";

@Controller("api/subscription")
export class SubscriptionPlanController {
  constructor(
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly subscriptionRepository: SubscriptionPlanReporitory,
    private readonly autoRenewSubscriptionService: AutorenewSubscriptionService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("/create")
  @UseGuards(SessionAuthGuard)
  private async create(
    @Body() body: SubscriptionPlanCreate,
    @Req() req: RequestWithUser,
  ) {
    return await this.subscriptionPlanService.create({
      data: body,
      userSession: req.user,
    });
  }

  @Post("/:id/update")
  @UseGuards(SessionAuthGuard)
  private async update(
    @Param() param: { id: string },
    @Body() body: SubscriptionPlanCreate,
    @Req() req: RequestWithUser,
  ) {
    return await this.subscriptionPlanService.update({
      data: body,
      id: param.id,
      userSession: req.user,
    });
  }

  @Post("/:id/delete")
  @UseGuards(SessionAuthGuard)
  private async delete(
    @Param() param: { id: string },
    @Req() req: RequestWithUser,
  ) {
    await this.subscriptionPlanService.delete({
      id: param.id,
      userSession: req.user,
    });
    return { success: true };
  }

  @Get("autorenew")
  private async autorenw() {
    // Retorna JSON directo, si falla el filtro maneja el error.
    return await this.autoRenewSubscriptionService.pipeline();
  }

  // --- LOGICA DE CONTENIDO (ADD/REMOVE) ---
  // Nota: Idealmente esto debería ir al Servicio, pero lo mantengo aquí limpio por ahora.

  @Post("add/content/:id")
  @UseGuards(SessionAuthGuard)
  private async add(@Param() param: { id: string }, @Body() body: any) {
    const content = body.content;
    const entity = await this.subscriptionRepository.findOne({
      where: { id: param.id },
    });

    if (!entity) throw new NotFoundException("Plan no encontrado");

    // `content` is the normalized `{ features, grants, modules }` object. The
    // add/remove endpoints manage the human-readable `features` bullets.
    const current = normalizeSubscriptionPlanContent(entity.content, entity);

    if (!current.features.includes(content)) {
      const next = { ...current, features: [...current.features, content] };

      await this.subscriptionRepository.update({
        where: { id: param.id },
        data: { content: next as unknown as Prisma.InputJsonValue },
      });
      return { message: "Contenido agregado.", entity };
    }

    return { message: "El contenido ya existía en la lista.", entity };
  }

  @Post("remove/content/:id")
  @UseGuards(SessionAuthGuard)
  private async remove(@Param() param: { id: string }, @Body() body: any) {
    const contentToRemove = body.content;
    const entity = await this.subscriptionRepository.findOne({
      where: { id: param.id },
    });

    if (!entity) throw new NotFoundException("Plan no encontrado");

    const current = normalizeSubscriptionPlanContent(entity.content, entity);

    if (current.features.includes(contentToRemove)) {
      const next = {
        ...current,
        features: current.features.filter((item) => item !== contentToRemove),
      };

      await this.subscriptionRepository.update({
        where: { id: param.id },
        data: { content: next as unknown as Prisma.InputJsonValue },
      });
      return { message: "Contenido eliminado.", entity };
    }

    return { success: true, entity };
  }

  /**
   * Public pricing (S4 of the brand/landing phase): the landing shows the real
   * plans without a session. Only the plans the platform publishes
   * (`selected: true`) and the fields a visitor needs — never internal grants.
   */
  @Public()
  @Get("public")
  async listPublicPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { selected: true, deletedAt: null },
      orderBy: { price: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true,
        badge: true,
        description: true,
        content: true,
      },
    });
  }

  // --- VISTAS Y FORMULARIOS ---

  @Get("")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  private async paginate(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return await this.subscriptionPlanService.pagination({
      query,
      userSession: req.user,
    });
  }

  @Get("/:id")
  @UseGuards(SessionAuthGuard)
  private async unique(
    @Req() req: RequestWithUser,
    @Param() param: { id: string },
  ) {
    return await this.subscriptionPlanService.unique({
      id: param.id,
      userSession: req.user,
    });
  }

  @Get("form/:type")
  @UseGuards(SessionAuthGuard)
  private async form(
    @Query() query: { id?: string; lang?: string },
    @Param() param: { type: string },
  ) {
    const effectiveLang = query.lang || "es";

    if (param.type === "create") {
      const formStructure = this.subscriptionRepository.getFormCreate({});
      return this.subscriptionPlanService.translateForm(
        formStructure,
        effectiveLang,
      );
    } else if (param.type === "update") {
      const object = await this.subscriptionRepository.findOne({
        where: { id: query.id },
      });
      const formStructure = this.subscriptionRepository.getFormUpdate({
        object,
        userId: query.id,
      });
      return this.subscriptionPlanService.translateForm(
        formStructure,
        effectiveLang,
      );
    } else if (param.type === "add") {
      const object = await this.subscriptionRepository.findOne({
        where: { id: query.id },
      });
      const formStructure = this.subscriptionRepository.getFormAdd({
        object,
        userId: query.id,
      });
      return this.subscriptionPlanService.translateForm(
        formStructure,
        effectiveLang,
      );
    } else {
      // Lanzamos excepción en lugar de devolver { error: true }
      throw new NotFoundException("Tipo de formulario no válido");
    }
  }
}
