import { forwardRef, Module } from "@nestjs/common";
import { UserService } from "./services/user.service";
import { UserController } from "./user.controller";
import UserReporitory from "./repository/user.repository";
import { UserListController } from "./user.list.controller";
import PermitReporitory from "../permit/repository/permit.repository";
import { WalletModule } from "../wallet/wallet.module";
import { UserAddressService } from "./services/user-address.service";
import UserAddressReporitory from "./repository/user-address.repository";
import UserPaymentMethodReporitory from "./repository/user-payment-method.repository";
import { UserPaymentMethodService } from "./services/user-payment-method.service";
import { TransactionModule } from "../transaction/transaction.module";
import { SubscriptionService } from "./services/subscription.service";
import SubscriptionReporitory from "./repository/subscription.repository";
import { SubscriptionModule } from "../subscription/subscription.module";
import { DashboardModule } from "../dashboard/dashboard.module";
import { PaymentMethodsModule } from "../payment-method/payment-method.module";
import UserAnaliticsService from "./services/user-analytics.service";
import { PermitModule } from "../permit/permit.module";
import { UserStatsService } from "./services/stat.service";
import { LoggerService } from "src/shared/logger/logger.service";
import { JwtService } from "@nestjs/jwt";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./services/user-analitics.service";
import { ReferralAnalyticsService } from "./services/referral-analytics.service";
import { ReferralAnalyticsController } from "./referral-analytics.controller";
import { FeedbackService } from "./services/feedback.service";
import FeedbackRepository from "./repository/feedback.repository";
import { ActivityModule } from "../activity/activity.module";
import { SubscriptionSyncService } from "./services/subscription-sync.service";
import { SubscriptionRenewalJobService } from "./services/subscription-renewal-job.service";
import { ExchangeModule } from "../exchange/exchange.module";
import { BillingModule } from "../billing/billing.module";

@Module({
  imports: [
    forwardRef(() => WalletModule),
    forwardRef(() => TransactionModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => DashboardModule),
    forwardRef(() => PermitModule),
    forwardRef(() => PaymentMethodsModule),
    forwardRef(() => ActivityModule),
    forwardRef(() => ExchangeModule),
    BillingModule,
    // forwardRef(() => I18nCustomModule),
  ],
  controllers: [
    UserController,
    UserListController,
    AnalyticsController,
    ReferralAnalyticsController,
  ],
  providers: [
    UserService,
    UserReporitory,
    PermitReporitory,
    UserAddressService,
    UserAddressReporitory,
    UserPaymentMethodReporitory,
    UserPaymentMethodService,
    SubscriptionService,
    SubscriptionReporitory,
    UserAnaliticsService,
    UserStatsService,
    LoggerService,
    AnalyticsService,
    JwtService,
    ReferralAnalyticsService,
    FeedbackService,
    FeedbackRepository,
    SubscriptionSyncService,
    SubscriptionRenewalJobService,
  ],
  exports: [
    UserService,
    UserReporitory,
    SubscriptionService,
    SubscriptionReporitory,
    UserPaymentMethodService,
    UserPaymentMethodReporitory,
    UserAnaliticsService,
    FeedbackService,
    FeedbackRepository,
  ],
})
export class UserModule {}
