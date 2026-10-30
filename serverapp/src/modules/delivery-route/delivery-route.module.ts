import { Module, forwardRef } from "@nestjs/common";
import { DeliveryRouteController } from "./delivery-route.controller";
import { DeliveryRouteService } from "./delivery-route.service";
import { UserModule } from "../user/user.module";
import { PermitModule } from "../permit/permit.module";
import { JwtService } from "@nestjs/jwt";

/** Delivery routes (S8), gated by `settings.routes.enabled`. */
@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [DeliveryRouteController],
  providers: [DeliveryRouteService, JwtService],
  exports: [DeliveryRouteService],
})
export class DeliveryRouteModule {}
