import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
  Req,
  HttpStatus,
  HttpException,
  ForbiddenException,
} from "@nestjs/common";
import SubscriptionPlanReporitory from "./repository/transaction.repository";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import type { RequestWithUser } from "src/shared/types/server.type";
import { TransactionService } from "./transaction.service";
import TransactionReporitory from "./repository/transaction.repository";
import type {
  TransactionCreate,
  TransactionUpdate,
} from "./dto/transaction.type";
import UserPaymentMethodReporitory from "../user/repository/user-payment-method.repository";
import { TransactionStatus } from "src/shared/types/schema.types";

@Controller("api/transactions")
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly transactionRepository: TransactionReporitory,
    private readonly userPaymentMethodRepository: UserPaymentMethodReporitory,
  ) {}

  private assertAdmin(req: RequestWithUser) {
    const isAdmin =
      req.user?.permits?.name === "SUPERADMIN" ||
      req.user?.permits?.name === "ADMIN";
    if (!isAdmin) {
      throw new ForbiddenException("No autorizado");
    }
  }

  @Post("/create")
  @UseGuards(SessionAuthGuard)
  private async create(
    @Body() body: TransactionCreate,
    @Req() req: RequestWithUser,
  ) {
    return await this.transactionService.create({
      data: body,
      userSession: req.user,
    });
  }

  @Post("/:id/update")
  @UseGuards(SessionAuthGuard)
  private async update(
    @Param() param: { id: string },
    @Body() body: TransactionUpdate,
    @Req() req: RequestWithUser,
  ) {
    this.assertAdmin(req);
    return await this.transactionService.update({
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
    this.assertAdmin(req);
    await this.transactionService.delete({
      id: param.id,
      userSession: req.user,
    });
    return { message: "Transacción eliminada exitosamente" };
  }

  @Post("set/status/:id")
  @UseGuards(SessionAuthGuard)
  private async setStatus(
    @Param() param: { id: string },
    @Body() body: { status: TransactionStatus },
    @Req() req: RequestWithUser,
  ) {
    this.assertAdmin(req);
    return await this.transactionService.setStatus({
      id: param.id,
      status: body.status,
      userSession: req.user,
    });
  }

  @Get("form/:type")
  @UseGuards(SessionAuthGuard)
  private async form(
    @Query() query: { id?: string; lang?: string },
    @Param() param: { type: "create" | "update" | "status" },
    @Req() req: RequestWithUser,
  ) {
    const effectiveLang = query.lang || "es";

    if (param.type && param.type === "create") {
      const payment = await this.userPaymentMethodRepository.findMany({
        skip: 0,
        take: 100,
        orderBy: { id: "asc" },
        where: { deletedAt: null, userId: req.user.id },
      });
      const formStructure = this.transactionRepository.getFormCreate({
        paymentsMethods: payment,
      });
      return this.transactionService.translateForm(
        formStructure,
        effectiveLang,
      );
    } else if (param.type && param.type === "update") {
      const object = await this.transactionRepository.findOne({
        where: { id: query.id },
      });
      const formStructure = this.transactionRepository.getFormUpdate({
        object,
        userId: query.id,
        paymentsMethods: [],
      });
      return this.transactionService.translateForm(
        formStructure,
        effectiveLang,
      );
    } else if (param.type && param.type === "status") {
      const object = await this.transactionRepository.findOne({
        where: { id: query.id },
      });
      const formStructure = this.transactionRepository.getFormUpdateStatus({
        object,
        userId: query.id,
        paymentsMethods: [],
      });
      return this.transactionService.translateForm(
        formStructure,
        effectiveLang,
      );
    } else {
      return {
        error: true,
        message: "Error inesperado al crear el formulario.",
      };
    }
  }
}
