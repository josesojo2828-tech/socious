import { forwardRef, Module } from "@nestjs/common";
import { ConsultationApiController } from "./controller/diet.api.controller";
import { ConsultationService } from "./service/consultation.service";
import ConsultationRepository from "./repository/diet.repository";

// Imports de otros módulos necesarios (Patient, Food)
import { FoodModule } from "../food/food.module";
import { LoggerService } from "src/shared/logger/logger.service";
import { PermitModule } from "src/modules/permit/permit.module";
import { UserModule } from "src/modules/user/user.module";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "nestjs-prisma";
import { PatientModule } from "../patient/patient.module";

@Module({
  imports: [
    // forwardRef(() => PatientModule),
    forwardRef(() => FoodModule),
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
    forwardRef(() => PatientModule),
  ],
  controllers: [ConsultationApiController],
  providers: [
    ConsultationService,
    ConsultationRepository,
    PrismaService,
    JwtService,
    LoggerService,
  ],
  exports: [ConsultationService, ConsultationRepository],
})
export class DietModule {}
