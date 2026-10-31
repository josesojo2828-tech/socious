import { Module, forwardRef } from "@nestjs/common";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { FileService } from "./file.service";
import { StorageService } from "./storage.service";
import { FileController } from "./file.controller";
import FileReporitory from "./repository/file.repository";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [FileController],
  providers: [
    FileService,
    StorageService,
    FileReporitory,
    PrismaService,
    LoggerService,
    JwtService,
  ],
  exports: [StorageService, FileReporitory],
})
export class FileModule { }
