import { forwardRef, Module } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import PermitReporitory from "../permit/repository/permit.repository";
import { SubscriptionModule } from "../subscription/subscription.module";
import { UserModule } from "../user/user.module";
import { WalletModule } from "../wallet/wallet.module";
import { LoggerService } from "src/shared/logger/logger.service";
import { JwtService } from "@nestjs/jwt";
import { UserDetailService } from "./service/user-detail.service";
import { ActivityModule } from "../activity/activity.module";
import { ModuleFrameworkModule } from "../module-framework/module-framework.module";

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => WalletModule),
    forwardRef(() => ActivityModule),
    // One-directional: Dashboard -> ModuleFramework. The framework module never
    // imports DashboardModule, so there is no cycle (design risk mitigation).
    ModuleFrameworkModule,
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    PermitReporitory,
    UserDetailService,
    LoggerService,
    JwtService,
  ],
})
export class DashboardModule {}
