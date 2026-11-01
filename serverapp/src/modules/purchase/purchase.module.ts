import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import {  Module, forwardRef } from "@nestjs/common";
import { PurchaseController } from "./purchase.controller";
import { PurchaseService } from "./purchase.service";
import { ExchangeModule } from "../exchange/exchange.module";
import { FileModule } from "../file/file.module";

/** Purchases from suppliers with accrual payables (S8). */
@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
    // StorageService (S14 #5): invoices are minted as signed URLs.
    FileModule,
ExchangeModule],
  controllers: [PurchaseController],
  providers: [PurchaseService,
    JwtService,
  ],
  exports: [PurchaseService],
})
export class PurchaseModule {}
