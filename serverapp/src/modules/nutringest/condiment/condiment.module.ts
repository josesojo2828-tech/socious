import { Module, forwardRef } from "@nestjs/common";

import { CondimentApiController } from "./controller/condiment.api.controller";
import { CondimentService } from "./service/condiment.service";
import CondimentRepository from "./repository/condiment.repository";

import { LoggerService } from "src/shared/logger/logger.service";
import { PrismaService } from "nestjs-prisma";
import { JwtService } from "@nestjs/jwt";
import { PermitModule } from "src/modules/permit/permit.module";
import { PermissionService } from "src/modules/permit/service/permission.service";
import { UserModule } from "src/modules/user/user.module";

@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [CondimentApiController],
  providers: [
    CondimentService,
    CondimentRepository,
    PrismaService,
    JwtService,
    LoggerService,
    PermissionService,
  ],
  exports: [CondimentService, CondimentRepository],
})
export class CondimentModule {}
