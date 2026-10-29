import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { TransactionService } from "./transaction.service";

@Controller("/api/dashboard/transactions")
export class TransactionListController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get("/api/list")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  public async apiList(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return await this.transactionService.pagination({
      query,
      userSession: req.user,
    });
  }
}
