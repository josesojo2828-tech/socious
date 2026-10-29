import { forwardRef, Module } from "@nestjs/common";
import { NotificationController } from "./notification.controller";
import SubscriptionPlanReporitory from "./repository/notification.repository";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { PermitModule } from "../permit/permit.module";
import { NotificationService } from "./service/notification.service";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [NotificationController],
  providers: [
    JwtService,
    NotificationService,
    SubscriptionPlanReporitory,
    PrismaService,
    LoggerService,
  ],
  exports: [NotificationService, SubscriptionPlanReporitory],
})
export class NotificationModule {}
