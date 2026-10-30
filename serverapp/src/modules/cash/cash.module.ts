import { PermitModule } from "../permit/permit.module";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";
import {  Module, forwardRef } from "@nestjs/common";
import { CashController } from "./cash.controller";
import { CashService } from "./cash.service";

/** Cash registers, shifts and manual movements (S7 support). */
@Module({
  imports: [
    forwardRef(() => PermitModule),
    forwardRef(() => UserModule),
  ],
  controllers: [CashController],
  providers: [CashService,
    JwtService,
  ],
  exports: [CashService],
})
export class CashModule {}
