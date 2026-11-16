import { Module, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ProductLotController } from "./product-lot.controller";
import { ProductLotService } from "./product-lot.service";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";

/** Rollos y partidas (S3): stock derivado de la suma de los lotes. */
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [ProductLotController],
  providers: [ProductLotService, JwtService],
  exports: [ProductLotService],
})
export class ProductLotModule {}
