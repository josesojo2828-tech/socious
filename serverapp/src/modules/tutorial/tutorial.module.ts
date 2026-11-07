import { Module, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TutorialController } from "./tutorial.controller";
import { TutorialService } from "./tutorial.service";
import { UserModule } from "../user/user.module";
import { PermitModule } from "../permit/permit.module";

/**
 * Tutorial catalog. `SessionAuthGuard` resolves `UserService` and
 * `EntitlementService` from the module that uses it, so `UserModule` and
 * `PermitModule` must be imported here (same wiring as `SettingsModule`).
 */
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [TutorialController],
  providers: [TutorialService, JwtService],
  exports: [TutorialService],
})
export class TutorialModule {}
