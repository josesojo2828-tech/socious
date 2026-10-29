import { forwardRef, Module } from "@nestjs/common";
import { CustomPersonalController } from "./custom-personal.controller";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { CustomPersonalService } from "./custom-personal.service";
import { WalletModule } from "../wallet/wallet.module";
import { TransactionModule } from "../transaction/transaction.module";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
    forwardRef(() => TransactionModule),
    forwardRef(() => WalletModule),
  ],
  controllers: [CustomPersonalController],
  providers: [CustomPersonalService, PrismaService, LoggerService, JwtService],
  exports: [CustomPersonalService],
})
export class CustomPersonalModule {}
