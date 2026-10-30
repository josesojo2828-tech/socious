import { Module } from "@nestjs/common";
import { SaleController } from "./sale.controller";
import { SaleService } from "./sale.service";
import { ExchangeModule } from "../exchange/exchange.module";

/**
 * Sales and invoicing (S7). Imports `ExchangeModule` to freeze the BCV/USDT
 * snapshot on every document.
 */
@Module({
  imports: [ExchangeModule],
  controllers: [SaleController],
  providers: [SaleService],
  exports: [SaleService],
})
export class SaleModule {}
