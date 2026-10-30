import { Module } from "@nestjs/common";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { SaleModule } from "../sale/sale.module";
import { ExchangeModule } from "../exchange/exchange.module";

/** Web orders / cart (S9); converts into a sale through `SaleService`. */
@Module({
  imports: [SaleModule, ExchangeModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
