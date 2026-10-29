import { forwardRef, Module } from "@nestjs/common";
import { SubscriptionPlanController } from "./subscription.controller";
import SubscriptionPlanReporitory from "./repository/subscription-plan.repository";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { PermitModule } from "../permit/permit.module";
import { SubscriptionPlanService } from "./service/subscription.service";
import { UserModule } from "../user/user.module";
import { AutorenewSubscriptionService } from "./service/renew.service";
import SubscriptionAnaliticsService from "./service/susbcription-analytics.service";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [SubscriptionPlanController],
  providers: [
    AutorenewSubscriptionService,
    SubscriptionPlanService,
    SubscriptionPlanReporitory,
    SubscriptionAnaliticsService,
    PrismaService,
    JwtService,
    LoggerService,
  ],
  exports: [
    AutorenewSubscriptionService,
    SubscriptionPlanService,
    SubscriptionPlanReporitory,
    SubscriptionAnaliticsService,
  ],
})
export class SubscriptionModule {}
