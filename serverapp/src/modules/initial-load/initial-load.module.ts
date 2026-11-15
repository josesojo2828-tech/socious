import { Module, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { ClientModule } from "../client/client.module";
import { ProductModule } from "../product/product.module";
import { SaleModule } from "../sale/sale.module";
import { InitialLoadController } from "./initial-load.controller";
import { InitialLoadService } from "./initial-load.service";

/**
 * Initial accounts-receivable load (S3/S5). It reuses the regular client,
 * product and sale services so the tenant rules and the client balance update
 * stay in one place; `SaleModule` already wires `ExchangeModule` for the rates.
 */
@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
    ClientModule,
    ProductModule,
    SaleModule,
  ],
  controllers: [InitialLoadController],
  providers: [InitialLoadService, JwtService],
  exports: [InitialLoadService],
})
export class InitialLoadModule {}
