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

import { PaymentMethodService } from "./payment-method.service";
import PaymentMethodRepository from "./repository/payment-method.repository"; // Corregido import
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { Public } from "src/shared/decorators/public.decorator";
import { BUSINESS_PAYMENT_METHODS } from "src/shared/constants/payment-methods";

import type {
  PaymentMethodCreate,
  PaymentMethodUpdate,
} from "./dto/payment-method.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";

@Controller("api/payment-methods")
export class PaymentMethodController {
  constructor(
    private readonly paymentMethodService: PaymentMethodService, // Corregido nombre
    private readonly paymentMethodRepository: PaymentMethodRepository, // Corregido nombre
  ) {}

  // ---------- ACCIONES (CREATE, UPDATE, DELETE) ---------- //

  @Post("/create")
  @UseGuards(SessionAuthGuard)
  private async create(
    @Body() body: PaymentMethodCreate,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.paymentMethodService.create({
      data: body,
      userSession: req.user,
    });

    return { success: true, id: (entity as any).id };
  }

  @Post("/:id/update")
  @UseGuards(SessionAuthGuard)
  private async update(
    @Param() param: { id: string },
    @Body() body: PaymentMethodUpdate,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.paymentMethodService.update({
      data: body,
      id: param.id,
      userSession: req.user,
    });

    return { success: true, id: param.id };
  }

  @Post("/:id/delete")
  @UseGuards(SessionAuthGuard)
  private async delete(
    @Param() param: { id: string },
    @Req() req: RequestWithUser,
  ) {
    await this.paymentMethodService.delete({
      id: param.id,
      userSession: req.user,
    });

    return { success: true, id: param.id };
  }

  // ---------- VISTAS Y DATOS (GET) ---------- //

  /**
   * Canonical business payment methods used by sales, purchases and cash
   * movements (Efectivo USD/Bs, Pago Móvil, Zelle, USDT, ...).
   *
   * Public on purpose: the storefront needs it to render the checkout options
   * before the customer is authenticated.
   */
  @Get("options")
  @Public()
  getBusinessPaymentMethodOptions() {
    return BUSINESS_PAYMENT_METHODS;
  }

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
    // Conecta con el método pagination del servicio para llenar la tabla
    return await this.paymentMethodService.pagination({
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
    // Conecta con el método unique para ver el detalle
    return await this.paymentMethodService.unique({
      id: param.id,
      userSession: req.user,
    });
  }

  // ---------- FORMULARIOS DINÁMICOS (MODALES) ---------- //

  @Get("form/:type")
  @UseGuards(SessionAuthGuard)
  private async form(
    @Query() query: { id?: string; lang?: string },
    @Param() param: { type: string },
  ) {
    const effectiveLang = query.lang || "es";

    if (param.type === "create") {
      const formStructure = this.paymentMethodRepository.getFormCreate({});
      return this.paymentMethodService.translateForm(
        formStructure,
        effectiveLang,
      );
    } else if (param.type === "update") {
      // Buscamos el objeto para pre-llenar el formulario
      const object = await this.paymentMethodRepository.findOne({
        where: { id: query.id },
      });
      if (!object) throw new NotFoundException("Método de pago no encontrado");

      const formStructure = this.paymentMethodRepository.getFormUpdate({
        object,
        userId: query.id,
      });
      return this.paymentMethodService.translateForm(
        formStructure,
        effectiveLang,
      );
    } else {
      throw new NotFoundException("Formulario no válido");
    }
  }
}
