import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import {  Module, forwardRef } from "@nestjs/common";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";

/** Product catalog with Kardex stock control (S6). */
@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
  ],
  controllers: [ProductController],
  providers: [ProductService,
    JwtService,
  ],
  exports: [ProductService],
})
export class ProductModule {}
