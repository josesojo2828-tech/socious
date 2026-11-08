import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import {  Module, forwardRef } from "@nestjs/common";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { StorefrontMetricsController } from "./storefront-metrics.controller";
import { StorefrontMetricsService } from "./storefront-metrics.service";
import { SaleModule } from "../sale/sale.module";
import { ExchangeModule } from "../exchange/exchange.module";
import { ShippingAgencyModule } from "../shipping/shipping-agency.module";

/** Web orders / cart (S9); converts into a sale through `SaleService`. */
@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
SaleModule,
    ExchangeModule,
    ShippingAgencyModule,
  ],
  controllers: [OrderController, StorefrontMetricsController],
  providers: [OrderService,
    StorefrontMetricsService,
    JwtService,
  ],
  exports: [OrderService],
})
export class OrderModule {}
