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
} from "@nestjs/common";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import type { RequestWithUser } from "src/shared/types/server.type";
import { CustomPersonalService } from "./custom-personal.service";
import TransactionReporitory from "../transaction/repository/transaction.repository";

@Controller("api/custom")
export class CustomPersonalController {
  constructor(
    private readonly customPersonalService: CustomPersonalService,
    private readonly transactionRepository: TransactionReporitory,
  ) {}

  @Get("form/:type")
  private async form(
    @Query() query: { id?: string; lang?: string },
    @Param()
    param: { type: "address" | "payment-method" | "subscription" | "wallet" },
  ) {
    const effectiveLang = query.lang || "es";
  }
}
