import { Module } from "@nestjs/common";
import { ProductLotController } from "./product-lot.controller";
import { ProductLotService } from "./product-lot.service";

/** Rollos y partidas (S3): stock derivado de la suma de los lotes. */
@Module({
  controllers: [ProductLotController],
  providers: [ProductLotService],
  exports: [ProductLotService],
})
export class ProductLotModule {}
