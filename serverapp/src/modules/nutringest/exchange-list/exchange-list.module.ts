import { forwardRef, Module } from "@nestjs/common";

// Controllers
import { ExchangeListApiController } from "./controller/exchange-list.api.controller";

// Services
import { ExchangeListService } from "./service/exchange-list.service";

// Repositories

// Shared & External Modules
import { LoggerService } from "src/shared/logger/logger.service";
import { PermitModule } from "src/modules/permit/permit.module";
import { UserModule } from "src/modules/user/user.module";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "nestjs-prisma";
import { DietModule } from "../consultation/diet.module";
import { ExchangeListRepository } from "./repository/exchange-list.repository";
import { ExchangeMetricsService } from "./service/exchange-list-metrics.service";

@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => DietModule),
    forwardRef(() => UserModule),
  ],
  controllers: [ExchangeListApiController],
  providers: [
    ExchangeListService,
    ExchangeListRepository,
    ExchangeMetricsService,
    PrismaService,
    JwtService,
    LoggerService,
  ],
  exports: [ExchangeListService, ExchangeListRepository],
})
export class ExchangeListModule {}
