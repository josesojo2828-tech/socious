import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import {  Module, forwardRef } from "@nestjs/common";
import { SaleController } from "./sale.controller";
import { SaleService } from "./sale.service";
import { SaleReturnService } from "./sale-return.service";
import { SaleImportService } from "./import/sale-import.service";
import { ExchangeModule } from "../exchange/exchange.module";

/**
 * Sales and invoicing (S7). Imports `ExchangeModule` to freeze the BCV/USDT
 * snapshot on every document.
 */
@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
ExchangeModule],
  controllers: [SaleController],
  providers: [
    SaleService,
    SaleReturnService,
    SaleImportService,
    JwtService,
  ],
  exports: [SaleService, SaleReturnService],
})
export class SaleModule {}
