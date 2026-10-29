import { Module } from "@nestjs/common";
import { FieldPolicyController } from "./field-policy.controller";
import { FieldPolicyInterceptor } from "./field-policy.interceptor";
import { FieldPolicyService } from "./field-policy.service";

/**
 * Role-based field-policy enforcement (design D8).
 *
 * `FieldPolicyService` is exported so `AppModule` can wire the global
 * `FieldPolicyInterceptor` as an `APP_INTERCEPTOR`. `PrismaService` comes from
 * the global `PrismaModule`.
 */
@Module({
  controllers: [FieldPolicyController],
  providers: [FieldPolicyService, FieldPolicyInterceptor],
  exports: [FieldPolicyService, FieldPolicyInterceptor],
})
export class FieldPolicyModule {}
