import { forwardRef, Module } from "@nestjs/common";
import { PaymentMethodController } from "./payment-method.controller";
import PaymentMethodReporitory from "./repository/payment-method.repository";
import { PrismaService } from "nestjs-prisma";
import { LoggerService } from "src/shared/logger/logger.service";
import { PermitModule } from "../permit/permit.module";
import { PaymentMethodService } from "./payment-method.service";
import { UserModule } from "../user/user.module";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [forwardRef(() => PermitModule), forwardRef(() => UserModule)],
  controllers: [PaymentMethodController],
  providers: [
    PaymentMethodService,
    PaymentMethodReporitory,
    PrismaService,
    LoggerService,
    JwtService,
  ],
  exports: [PaymentMethodService, PaymentMethodReporitory],
})
export class PaymentMethodsModule {}
