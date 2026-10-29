import { Module, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PortfolioController } from "./controller/portfolio.controller";
import { PortfolioService } from "./service/portfolio.service";
import PortfolioRepository from "./repository/portfolio.repository";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { UserModule } from "../user/user.module";
import { FileModule } from "../file/file.module";
import { PermitModule } from "../permit/permit.module";

@Module({
  imports: [UserModule, FileModule, forwardRef(() => PermitModule)],
  controllers: [PortfolioController],
  providers: [
    PortfolioService,
    PortfolioRepository,
    PrismaService,
    LoggerService,
    JwtService,
  ],
  exports: [PortfolioService, PortfolioRepository],
})
export class PortfolioModule {}
