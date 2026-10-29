import { forwardRef, Module } from "@nestjs/common";
import { SystemSettingController } from "./system-setting.controller";
import { SystemSettingService } from "./system-setting.service";
import { PrismaService } from "nestjs-prisma";
import { UserModule } from "../user/user.module";
import { PermitModule } from "../permit/permit.module";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [SystemSettingController],
  providers: [SystemSettingService, PrismaService, JwtService],
  exports: [SystemSettingService],
})
export class SystemSettingModule {}
