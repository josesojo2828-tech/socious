import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import {  Module, forwardRef } from "@nestjs/common";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { ProductImportService } from "./import/product-import.service";
import { PresentationService } from "./presentation.service";
import { PresentationController } from "./presentation.controller";

/** Product catalog with Kardex stock control (S6). */
@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
  ],
  controllers: [ProductController, PresentationController],
  providers: [ProductService,
    ProductImportService,
    PresentationService,
    JwtService,
  ],
  exports: [ProductService],
})
export class ProductModule {}
