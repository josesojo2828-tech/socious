import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PassportModule } from "@nestjs/passport";
import { UserModule } from "../user/user.module";
import { DashboardModule } from "../dashboard/dashboard.module";
import { AuthListenerService } from "./service/auth-listener.service";
import { LoggerService } from "src/shared/logger/logger.service";
import { JwtService } from "@nestjs/jwt";
import { AtStrategy } from "./strategies/at.strategy";
import { RtStrategy } from "./strategies/rt.strategy";
import { SessionAuthGuard } from "./guards/authenticated.guard";
import { APP_GUARD } from "@nestjs/core";
import { PermitModule } from "../permit/permit.module";
import { EntitlementGuard } from "../permit/guards/entitlement.guard";

@Module({
  imports: [UserModule, DashboardModule, PassportModule, PermitModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthListenerService,
    LoggerService,
    JwtService,
    AtStrategy,
    RtStrategy,
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: EntitlementGuard,
    },
  ],
})
export class AuthModule {}
