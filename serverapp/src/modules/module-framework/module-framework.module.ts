import { Module } from "@nestjs/common";
import { ModuleController } from "./controllers/module.controller";
import { ModuleDashboardController } from "./dashboard/module-dashboard.controller";
import {
  MODULE_DASHBOARD_PROVIDERS,
  ModuleDashboardRegistry,
} from "./dashboard/module-dashboard.registry";
import { ModuleFrameworkEnabledGuard } from "./guards/module-framework-enabled.guard";
import { ModuleGrantService } from "./services/module-grant.service";
import { ModuleService } from "./services/module.service";
import { ModuleStatsService } from "./services/module-stats.service";

/**
 * Backend framework core for the module catalog (design Phase 2).
 *
 * `PrismaService`, `EntitlementService` and `WorkspaceContextService` are
 * globally available (`PrismaModule`, `@Global() PermitModule`,
 * `@Global() WorkspaceContextService`), so this module only declares its own
 * controllers/providers and exports the services consumed by Phase 3
 * (`DashboardModule`) and future module providers.
 *
 * Registration in `AppModule` is Phase 3 (task 3.6) and is intentionally NOT
 * done here.
 */
@Module({
  controllers: [ModuleController, ModuleDashboardController],
  providers: [
    ModuleService,
    ModuleGrantService,
    ModuleStatsService,
    ModuleDashboardRegistry,
    ModuleFrameworkEnabledGuard,
    { provide: MODULE_DASHBOARD_PROVIDERS, useValue: [] },
  ],
  exports: [
    ModuleService,
    ModuleGrantService,
    ModuleStatsService,
    ModuleDashboardRegistry,
  ],
})
export class ModuleFrameworkModule {}
