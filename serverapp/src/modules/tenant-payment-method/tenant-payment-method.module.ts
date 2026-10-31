import { Module, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TenantPaymentMethodController } from "./tenant-payment-method.controller";
import { TenantPaymentMethodService } from "./tenant-payment-method.service";
import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";

/** Tenant payment methods (S1). */
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [TenantPaymentMethodController],
  providers: [TenantPaymentMethodService, JwtService],
  exports: [TenantPaymentMethodService],
})
export class TenantPaymentMethodModule {}
