import { Module } from "@nestjs/common";
import { FileService } from "./file.service";
import { StorageService } from "./storage.service";
import { FileController } from "./file.controller";
import FileReporitory from "./repository/file.repository";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { JwtService } from "@nestjs/jwt";

@Module({
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
