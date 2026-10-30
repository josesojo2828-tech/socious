import { Module, forwardRef } from "@nestjs/common";
import { ShippingAgencyController } from "./shipping-agency.controller";
import { ShippingAgencyService } from "./shipping-agency.service";
import { UserModule } from "../user/user.module";
import { PermitModule } from "../permit/permit.module";
import { JwtService } from "@nestjs/jwt";

/** Platform-owned shipping agency catalog (S4). */
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [ShippingAgencyController],
  providers: [ShippingAgencyService, JwtService],
  exports: [ShippingAgencyService],
})
export class ShippingAgencyModule {}
