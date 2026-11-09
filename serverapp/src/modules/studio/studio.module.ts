import { Module, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { StudioController } from "./studio.controller";
import { StudioService } from "./studio.service";

/** Studio plan (Mesas/Sillas + Agenda). */
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [StudioController],
  providers: [StudioService, JwtService],
  exports: [StudioService],
})
export class StudioModule {}
