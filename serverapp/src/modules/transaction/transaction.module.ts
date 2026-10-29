import { forwardRef, Module } from "@nestjs/common";
import { TransactionController } from "./transaction.controller";
import Transaction from "./repository/transaction.repository";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { TransactionListController } from "./transaction.list.controller";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { TransactionService } from "./transaction.service";
import { WalletModule } from "../wallet/wallet.module";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
    forwardRef(() => WalletModule),
  ],
  controllers: [TransactionController, TransactionListController],
  providers: [
    TransactionService,
    Transaction,
    PrismaService,
    LoggerService,
    JwtService,
  ],
  exports: [TransactionService, Transaction],
})
export class TransactionModule {}
