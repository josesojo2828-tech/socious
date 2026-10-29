import {
  Controller,
  Get,
  Req,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { WalletService } from "./wallet.service";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";

@Controller("api/dashboard/wallets")
export class WalletListController {
  constructor(private readonly walletService: WalletService) {}

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
    return await this.walletService.getPaginate(query);
  }
}
