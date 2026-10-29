import { forwardRef, Module } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { WalletController } from "./wallet.controller";
import WalletReporitory from "./repository/wallet.repository";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { UserModule } from "../user/user.module";
import { WalletListController } from "./wallet.list.controller";
import { PermitModule } from "../permit/permit.module";
import WalletAnaliticsService from "./service/wallet-analytics.service";
import { JwtService } from "@nestjs/jwt";
import { ExchangeModule } from "../exchange/exchange.module";

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => PermitModule),
    forwardRef(() => ExchangeModule),
  ],
  controllers: [WalletController, WalletListController],
  providers: [
    JwtService,
    WalletService,
    WalletReporitory,
    PrismaService,
    LoggerService,
    WalletAnaliticsService,
  ],
  exports: [WalletReporitory, WalletService, WalletAnaliticsService],
})
export class WalletModule {}
