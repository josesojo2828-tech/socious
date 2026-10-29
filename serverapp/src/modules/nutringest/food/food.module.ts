import { Module } from "@nestjs/common";

// Controllers
import { FoodApiController } from "./controller/food.api.controller";

// Service & Repositories
import { FoodService } from "./service/food.service";
import FoodRepository from "./repository/food.repository";

// Shared
import { LoggerService } from "src/shared/logger/logger.service";
import { PermitModule } from "src/modules/permit/permit.module";
import { UserModule } from "src/modules/user/user.module";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "nestjs-prisma";
import { ExchangeListApiController } from "./controller/food-exchange.api.controller";
import ExchangeListRepository from "./repository/food-exchange.repository";
import { ExchangeListService } from "./service/food-exchange.service";
import { FoodMetricsService } from "./service/food-metrics.service";
import { FoodSeederService } from "./service/food-seeder.service";

// Importa el servicio de usuario si necesitas acceder a lógica de usuario (opcional aquí)
// import { UserModule } from '../user/user.module';

@Module({
  imports: [PermitModule, UserModule],
  controllers: [
    FoodApiController,
    ExchangeListApiController,
  ],
  providers: [
    FoodService,
    FoodRepository,
    FoodMetricsService,
    FoodSeederService,
    ExchangeListService,
    ExchangeListRepository,
    PrismaService,
    JwtService,
    LoggerService,
  ],
  exports: [
    FoodService,
    FoodRepository,
    FoodMetricsService,
    FoodSeederService,
    ExchangeListService,
    ExchangeListRepository,
    // Exportamos estos para que  pueda usarlos
  ],
})
export class FoodModule {}
