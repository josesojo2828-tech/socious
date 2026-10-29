import { forwardRef, Module } from "@nestjs/common";

// Controllers
import { MenuApiController } from "./controller/menu.api.controller";

// Services
import { MenuService } from "./service/menu.service";

// Repositories
import MenuRepository from "./repository/menu.repository";

// Shared & External Modules
import { LoggerService } from "src/shared/logger/logger.service";
import { PermitModule } from "src/modules/permit/permit.module";
import { PermissionService } from "src/modules/permit/service/permission.service";
import { UserModule } from "src/modules/user/user.module";
import { FileModule } from "src/modules/file/file.module";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "nestjs-prisma";
import { DietModule } from "../consultation/diet.module";
import { MenuMetricsService } from "./service/menu-metrics.service";

@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => DietModule),
    forwardRef(() => UserModule),
    FileModule,
  ],
  controllers: [MenuApiController],
  providers: [
    // Services
    MenuService,
    MenuMetricsService,
    PermissionService,

    // Repositories
    MenuRepository,
    PrismaService,
    JwtService,
    LoggerService,
  ],
  exports: [MenuService, MenuRepository],
})
export class MenuModule {}
