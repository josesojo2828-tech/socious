import { Module } from "@nestjs/common";
import { PurchaseController } from "./purchase.controller";
import { PurchaseService } from "./purchase.service";
import { ExchangeModule } from "../exchange/exchange.module";

/** Purchases from suppliers with accrual payables (S8). */
@Module({
  imports: [ExchangeModule],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
