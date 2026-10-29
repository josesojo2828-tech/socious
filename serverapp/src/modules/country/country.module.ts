import { forwardRef, Module } from "@nestjs/common";
import { CountryController } from "./country.controller";
import { CountryService } from "./country.service";
import { PrismaService } from "nestjs-prisma";
import { UserModule } from "../user/user.module";
import { PermitModule } from "../permit/permit.module";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [CountryController],
  providers: [CountryService, PrismaService, JwtService],
  exports: [CountryService],
})
export class CountryModule {}

