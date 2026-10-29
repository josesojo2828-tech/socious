import { Module } from "@nestjs/common";
import { PermitModule } from "src/modules/permit/permit.module";
import { EntitlementController } from "./entitlement.controller";
import { EntitlementAdminService } from "./entitlement-admin.service";

/**
 * Add-on entitlement CRUD module (design Phase 4). Resolution/caching live in
 * `PermitModule` (`EntitlementService`); this module only exposes the
 * owner-scoped management API.
 */
@Module({
  imports: [PermitModule],
  controllers: [EntitlementController],
  providers: [EntitlementAdminService],
})
export class EntitlementModule {}
