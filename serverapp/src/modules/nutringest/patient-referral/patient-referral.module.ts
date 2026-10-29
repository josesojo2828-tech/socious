import { Module } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import { JwtService } from "@nestjs/jwt";
import { LoggerService } from "src/shared/logger/logger.service";
import { UserModule } from "src/modules/user/user.module";
import { NotificationModule } from "src/modules/notification/notification.module";
import { SharedModule } from "src/shared/shared.module";
import { PatientReferralApiController } from "./controller/patient-referral.api.controller";
import { PatientReferralService } from "./service/patient-referral.service";
import PatientReferralRepository from "./repository/patient-referral.repository";
import PatientReferralNotificationListener from "./listeners/patient-referral.listener";

@Module({
  imports: [NotificationModule, UserModule, SharedModule],
  controllers: [PatientReferralApiController],
  providers: [
    PatientReferralService,
    PatientReferralRepository,
    PatientReferralNotificationListener,
    PrismaService,
    LoggerService,
    JwtService,
  ],
  exports: [PatientReferralService, PatientReferralRepository],
})
export class PatientReferralModule {}