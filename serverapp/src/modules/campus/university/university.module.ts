import { Module } from "@nestjs/common";
import { UniversityService } from "./service/university.service";
import { UniversityApiController } from "./controller/university.api.controller";
import UniversityRepository from "./repository/university.repository";
import { UserModule } from "src/modules/user/user.module";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [UserModule],
  controllers: [UniversityApiController],
  providers: [
    UniversityService,
    UniversityRepository,
    PrismaService,
    LoggerService,
    JwtService,
  ],
  exports: [UniversityService, UniversityRepository],
})
export class UniversityModule {}
