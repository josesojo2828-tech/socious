import { forwardRef, Module } from "@nestjs/common";
import { CmsController } from "./cms.controller";
import CmsRepository from "./repository/cms.repository";
import { CmsService } from "./cms.service";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [CmsController],
  providers: [
    CmsService,
    CmsRepository,
    PrismaService,
    LoggerService,
    JwtService,
  ],
  exports: [CmsService, CmsRepository],
})
export class CmsModule {}
