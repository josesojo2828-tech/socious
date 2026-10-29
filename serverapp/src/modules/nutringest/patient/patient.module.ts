import { forwardRef, Module } from "@nestjs/common";
import { LoggerService } from "src/shared/logger/logger.service";
import { JwtService } from "@nestjs/jwt";
import { PermitModule } from "src/modules/permit/permit.module";
import { UserModule } from "src/modules/user/user.module";
import { ActivityModule } from "src/modules/activity/activity.module";
import { PatientApiController } from "./controller/patient.api.controller";
import { PatientService } from "./service/patient.service";
import AnthropometryRepository from "./repository/anthropometry.repository";
import { AnthropometryService } from "./service/anthropometry.service";
import DietLegacyRepository from "./repository/diet-legacy.repository";
import { DietLegacyService } from "./service/diet-legacy.service";
import GoalRepository from "./repository/goal.repository";
import { GoalService } from "./service/goal.service";
import LabResultRepository from "./repository/lab-result.repository";
import { LabResultService } from "./service/lab-result.service";
import NutritionalPlanRepository from "./repository/nutritional-plan.repository";
import { NutritionalPlanService } from "./service/nutritional-plan.service";
import ShoppingListRepository from "./repository/shopping-list.repository";
import { AnthropometryApiController } from "./controller/anthropometry,api.controller";
import { DietLegacyApiController } from "./controller/diet-legacy.api.controller";
import { GoalApiController } from "./controller/goal.api.controller";
import { LabResultApiController } from "./controller/lab-result.api.controller";
import { NutritionalPlanApiController } from "./controller/nutritional-plan.api.controller";
import { ShoppingListApiController } from "./controller/shopping-list.api.controller";
import { ShoppingListService } from "./service/shopping-list.service";
import SportsHistoryRepository from "./repository/sports-history.repository";
import { SportsHistoryService } from "./service/sports-history.service";
import { SportsHistoryApiController } from "./controller/sports-history.api.controller";
import PediatricHistoryRepository from "./repository/pediatric-history.repository";
import { PediatricHistoryService } from "./service/pediatric-history.service";
import { PediatricHistoryApiController } from "./controller/pediatric-history.api.controller";
import InfantFormulaRepository from "./repository/infant-formula.repository";
import { InfantFormulaService } from "./service/infant-formula.service";
import { SportDisciplineApiController } from "./controller/sport-discipline.api.controller";

@Module({
  imports: [
    forwardRef(() => ActivityModule),
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
    forwardRef(() => ActivityModule),
    forwardRef(() => PermitModule),
    // forwardRef(() => I18nCustomModule),
  ],
  controllers: [
    AnthropometryApiController,
    DietLegacyApiController,
    GoalApiController,
    LabResultApiController,
    NutritionalPlanApiController,
    ShoppingListApiController,
    SportsHistoryApiController,
    PediatricHistoryApiController,
    SportDisciplineApiController,
    PatientApiController,
  ],
  providers: [
    AnthropometryRepository,
    AnthropometryService,
    DietLegacyRepository,
    DietLegacyService,
    GoalRepository,
    GoalService,
    LabResultRepository,
    LabResultService,
    NutritionalPlanRepository,
    NutritionalPlanService,
    ShoppingListRepository,
    ShoppingListService,
    SportsHistoryRepository,
    SportsHistoryService,
    PediatricHistoryRepository,
    PediatricHistoryService,
    InfantFormulaRepository,
    InfantFormulaService,
    PatientService,
    LoggerService,
    JwtService,
  ],
  exports: [],
})
export class PatientModule {}
