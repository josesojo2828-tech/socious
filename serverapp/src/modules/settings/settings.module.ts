import { Module, forwardRef } from "@nestjs/common";
import { SettingsController } from "./settings.controller";
import { UserModule } from "../user/user.module";
import { PermitModule } from "../permit/permit.module";
import { JwtService } from "@nestjs/jwt";

/**
 * Tenant settings (S1). The settings service itself is global through
 * `SharedModule`; this module only mounts the HTTP surface.
 * `SessionAuthGuard` needs `UserModule` + `PermitModule` + `JwtService`
 * visible here (same wiring as `country.module`).
 */
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [SettingsController],
  providers: [JwtService],
})
export class SettingsModule {}
