import { forwardRef, Global, Module } from "@nestjs/common";
import { PermitService } from "./permit.service";
import { PermissionService } from "./service/permission.service";
import { PermitController } from "./permit.controller";
import PermitReporitory from "./repository/permit.repository";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { PermitListController } from "./permit.list.controller";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import { EntitlementCacheService } from "./cache/entitlement-cache";
import { EntitlementService } from "./service/entitlement.service";

@Global()
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [PermitController, PermitListController],
  providers: [
    PermitService,
    PermissionService,
    EntitlementService,
    EntitlementCacheService,
    PermitReporitory,
    PrismaService,
    LoggerService,
    JwtService,
  ],
  exports: [
    PermitService,
    PermissionService,
    EntitlementService,
    EntitlementCacheService,
    PermitReporitory,
  ],
})
export class PermitModule {}
