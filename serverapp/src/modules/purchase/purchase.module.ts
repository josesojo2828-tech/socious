import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import {  Module, forwardRef } from "@nestjs/common";
import { PurchaseController } from "./purchase.controller";
import { PurchaseService } from "./purchase.service";
import { ExchangeModule } from "../exchange/exchange.module";

/** Purchases from suppliers with accrual payables (S8). */
@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
ExchangeModule],
  controllers: [PurchaseController],
  providers: [PurchaseService,
    JwtService,
  ],
  exports: [PurchaseService],
})
export class PurchaseModule {}
