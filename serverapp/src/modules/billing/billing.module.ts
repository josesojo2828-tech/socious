import { Module } from "@nestjs/common";

import { InvoiceService } from "./invoice.service";
import { BillingController } from "./billing.controller";

@Module({
  controllers: [BillingController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class BillingModule {}
