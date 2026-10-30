import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import {  Module, forwardRef } from "@nestjs/common";
import { SupplierController } from "./supplier.controller";
import { SupplierService } from "./supplier.service";

/** Supplier directory (S4), tenant-scoped. */
@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
  ],
  controllers: [SupplierController],
  providers: [SupplierService,
    JwtService,
  ],
  exports: [SupplierService],
})
export class SupplierModule {}
