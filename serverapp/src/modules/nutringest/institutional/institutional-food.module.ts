import { Module, forwardRef } from "@nestjs/common";
import { PermitModule } from "src/modules/permit/permit.module";
import { UserModule } from "src/modules/user/user.module";
import { NotificationModule } from "src/modules/notification/notification.module";
import { InstitutionalFoodController } from "./controller/institutional-food.controller";
import { SportDisciplineController } from "./controller/sport-discipline.controller";
import { InstitutionalFoodService } from "./service/institutional-food.service";
import { PrismaService } from "nestjs-prisma";
import { PlazasScraperStrategy } from "./scraper/plazas-scraper.strategy";
import { PriceScraperService } from "./scraper/price-scraper.service";
import { JwtService } from "@nestjs/jwt";
import { LoggerService } from "src/shared/logger/logger.service";

@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
    NotificationModule,
  ],
  controllers: [InstitutionalFoodController, SportDisciplineController],
  providers: [
    InstitutionalFoodService,
    PrismaService,
    PlazasScraperStrategy,
    PriceScraperService,
    JwtService,
    LoggerService,
  ],
  exports: [InstitutionalFoodService, PriceScraperService],
})
export class InstitutionalFoodModule {}
