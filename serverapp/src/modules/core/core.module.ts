import { Module } from "@nestjs/common";
import { CoreController } from "./core.controller";
import { CoreService } from "./core.service";
import { UserModule } from "../user/user.module";
import { FileModule } from "../file/file.module";
import { LoggerService } from "src/shared/logger/logger.service";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [
    UserModule,
    FileModule,
  ],
  controllers: [CoreController],
  providers: [CoreService, LoggerService, JwtService],
})
export class CoreModule { }
