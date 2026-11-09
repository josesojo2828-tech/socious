import { ConfigModule, ConfigService } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { UserModule } from "./modules/user/user.module";
import { PermitModule } from "./modules/permit/permit.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { FileModule } from "./modules/file/file.module";
import { SubscriptionModule } from "./modules/subscription/subscription.module";
import { TransactionModule } from "./modules/transaction/transaction.module";
import { EventModule } from "./shared/event/event.module";
import { PrismaModule } from "nestjs-prisma";
import { Prisma } from "@prisma/client";
import { AuthModule } from "./modules/auth/auth.module";
import {
  AcceptLanguageResolver,
  I18nJsonLoader,
  I18nModule,
  QueryResolver,
} from "nestjs-i18n";
import { join } from "path";
import { DataFixtureService } from "./shared/service/datafixture.service";
import UserReporitory from "./modules/user/repository/user.repository";
import PermitReporitory from "./modules/permit/repository/permit.repository";
import SubscriptionPlanReporitory from "./modules/subscription/repository/subscription-plan.repository";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { InjectUserInterceptor } from "./shared/interceptors/inject-user.interceptor";
import { WorkspaceContextInterceptor } from "./shared/interceptors/workspace-context.interceptor";
import { FieldPolicyModule } from "./modules/permit/field-policy/field-policy.module";
import { FieldPolicyInterceptor } from "./modules/permit/field-policy/field-policy.interceptor";
import { SharedModule } from "./shared/shared.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DashboardService } from "./modules/dashboard/dashboard.service";
import { CoreModule } from "./modules/core/core.module";
import { SelectController } from "./select.controller";
import { I18nCustomModule } from "./shared/lang/i18n-custom.module";
import { PaymentMethodsModule } from "./modules/payment-method/payment-method.module";
import PaymentMethodReporitory from "./modules/payment-method/repository/payment-method.repository";
import { CustomPersonalModule } from "./modules/custom-personal/custom-personal.module";
import { LoggerModule } from "nestjs-pino";
import { HealthModule } from "./shared/health/health.module";
import { LoggerService } from "./shared/logger/logger.service";
import { FakerInitService } from "./shared/faker/faker-init.service";
import { NotificationModule } from "./modules/notification/notification.module";
import NotificationRepository from "./modules/notification/repository/notification.repository";
import { UserCreatedListener } from "./shared/event/modules/user/user.listener";
import { MailModule } from './modules/mail/mail.module';
import { ThrottlerModule } from "@nestjs/throttler";
import { CmsModule } from "./modules/cms/cms.module";
import CmsRepository from "./modules/cms/repository/cms.repository";
import { ActivityModule } from "./modules/activity/activity.module";
import { ReferenceDataSeedModule } from "./shared/seed/reference-data-seed.module";
import { OrganizationModule } from "./modules/organization/organization.module";
import { EntitlementModule } from "./modules/organization/entitlement.module";
import { ExchangeModule } from "./modules/exchange/exchange.module";
import { ClientModule } from "./modules/client/client.module";
import { SupplierModule } from "./modules/supplier/supplier.module";
import { UnitOfMeasureModule } from "./modules/unit-of-measure/unit-of-measure.module";
import { OfferModule } from "./modules/offer/offer.module";
import { TenantPaymentMethodModule } from "./modules/tenant-payment-method/tenant-payment-method.module";
import { CategoryModule } from "./modules/category/category.module";
import { ProductModule } from "./modules/product/product.module";
import { CashModule } from "./modules/cash/cash.module";
import { SaleModule } from "./modules/sale/sale.module";
import { TutorialModule } from "./modules/tutorial/tutorial.module";
import { PurchaseModule } from "./modules/purchase/purchase.module";
import { OrderModule } from "./modules/order/order.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { ShippingAgencyModule } from "./modules/shipping/shipping-agency.module";
import { DeliveryRouteModule } from "./modules/delivery-route/delivery-route.module";
import { BranchModule } from "./modules/branch/branch.module";
import { StudioModule } from "./modules/studio/studio.module";
import { ModuleFrameworkModule } from "./modules/module-framework/module-framework.module";

import { SystemSettingModule } from "./modules/system-setting/system-setting.module";
import { CountryModule } from "./modules/country/country.module";

import { ScheduleModule } from "@nestjs/schedule";

@Module({
imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ".env",
        }),

        ScheduleModule.forRoot(),

        LoggerModule.forRoot({
            pinoHttp: {
                name: "nutringest-backend",
                level: process.env.NODE_ENV !== "production" ? "debug" : "info",
                transport:
                    process.env.NODE_ENV !== "production"
                        ? { target: "pino-pretty", options: { colorize: true } }
                        : undefined,
            },
        }),

        // Health checks
        HealthModule.forRoot(),

        ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000,
        limit: 3, // Máximo 3 peticiones por segundo
      },
      {
        name: "medium",
        ttl: 10000,
        limit: 10, // Máximo 10 peticiones cada 10 segundos
      },
      {
        name: "long",
        ttl: 60000,
        limit: 30, // Máximo 30 peticiones por minuto
      }
    ]),

    // FastifyMulterModule,

    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: ".",
    }),

    I18nModule.forRootAsync({
      useFactory: () => {
        const pathsToTry = [
          join(__dirname, "/i18n/"),
          join(__dirname, "../i18n/"),
          join(process.cwd(), "/src/i18n/"),
          join(process.cwd(), "/dist/i18n/"),
          join(process.cwd(), "/dist/src/i18n/"),
        ];

        let resolvedPath = pathsToTry[0];
        const { existsSync } = require("fs");
        for (const p of pathsToTry) {
          if (existsSync(p)) {
            resolvedPath = p;
            break;
          }
        }

        return {
          fallbackLanguage: "es",
          loader: I18nJsonLoader,
          loaderOptions: {
            path: resolvedPath,
            watch: true,
          },
          resolvers: [
            new QueryResolver(["lang", "l"]),
            AcceptLanguageResolver,
          ],
        };
      },
    }),

    PrismaModule.forRootAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const databaseUrl = configService.get<string>("DATABASE_URL");
        const logLevel = configService.get<string>("PRISMA_LOG_LEVEL", "warn");
        const explicitConnect = configService.get<boolean>(
          "PRISMA_EXPLICIT_CONNECT",
          false,
        );
        if (!databaseUrl) {
          throw new Error("DATABASE_URL environment variable is not set");
        }

        return {
          prismaOptions: {
            log: [logLevel as Prisma.LogLevel], // Cast al tipo correcto
            datasources: {
              db: {
                url: databaseUrl,
              },
            },
          },
          explicitConnect: explicitConnect,
        };
      },
      inject: [ConfigService],
    }),

    // SHARED
    I18nCustomModule,
    SharedModule,

    // MODULES
    UserModule,
    PermitModule,
    SystemSettingModule,
    CountryModule,
    FieldPolicyModule,
    WalletModule,
    FileModule,
    SubscriptionModule,
    TransactionModule,
    EventModule,
    AuthModule,
    DashboardModule,
    CoreModule,
    PaymentMethodsModule,
    CustomPersonalModule,
    NotificationModule,

    // CORE PLATFORM & ERP
    MailModule,
    CmsModule,
    ActivityModule,
    ReferenceDataSeedModule,
    OrganizationModule,
    EntitlementModule,
    ModuleFrameworkModule,
    ExchangeModule,
    ClientModule,
    SupplierModule,
    UnitOfMeasureModule,
    OfferModule,
    TenantPaymentMethodModule,
    CategoryModule,
    ProductModule,
    CashModule,
    SaleModule,
    TutorialModule,
    PurchaseModule,
    OrderModule,
    SettingsModule,
    ShippingAgencyModule,
    DeliveryRouteModule,
    BranchModule,
    StudioModule,
  ],
  controllers: [AppController, SelectController],
  providers: [
    DataFixtureService,
    UserReporitory,
    SubscriptionPlanReporitory,
    PermitReporitory,
    DashboardService,
    PaymentMethodReporitory,
    CmsRepository,

    LoggerService,
    FakerInitService,

    AppService,

    NotificationRepository,

    UserCreatedListener,

    {
      provide: APP_INTERCEPTOR,
      useClass: WorkspaceContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: InjectUserInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: FieldPolicyInterceptor,
    },
  ],
})
export class AppModule { }
