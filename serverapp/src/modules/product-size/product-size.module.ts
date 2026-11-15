import { Module, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ProductSizeController } from "./product-size.controller";
import { ProductSizeService } from "./product-size.service";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";

/** Size catalog (tallas): system catalog + tenant CRUD. */
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [ProductSizeController],
  providers: [ProductSizeService, JwtService],
  exports: [ProductSizeService],
})
export class ProductSizeModule {}
