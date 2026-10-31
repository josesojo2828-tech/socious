import { Module, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OfferController } from "./offer.controller";
import { OfferService } from "./offer.service";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";

/** Promotional offers (S9) — Avanzado/Premium. */
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [OfferController],
  providers: [OfferService, JwtService],
  exports: [OfferService],
})
export class OfferModule {}
