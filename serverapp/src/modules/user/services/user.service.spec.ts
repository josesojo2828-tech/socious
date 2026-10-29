import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "./user.service";
import UserRepository from "../repository/user.repository";
import PermitRepository from "../../permit/repository/permit.repository";
import SubscriptionRepository from "../repository/subscription.repository";
import SubscriptionPlanRepository from "../../subscription/repository/subscription-plan.repository";
import UserPaymentMethodRepository from "../repository/user-payment-method.repository";
import { SubscriptionService } from "../services/subscription.service";
import { UserPaymentMethodService } from "../services/user-payment-method.service";
import { LoggerService } from "src/shared/logger/logger.service";
import { I18nService } from "src/shared/lang/i18n.service";
import { FeedbackService } from "./feedback.service";
import FeedbackRepository from "../repository/feedback.repository";
import { MailService } from "../../mail/mail.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "nestjs-prisma";

describe("UserService — getPaginate (SUPERADMIN vs normal user)", () => {
  let service: UserService;
  let userRepositoryMock: any;

  beforeEach(async () => {
    userRepositoryMock = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(84),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: userRepositoryMock },
        { provide: PermitRepository, useValue: { SUPERADMIN: "SUPERADMIN" } },
        { provide: EventEmitter2, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: SubscriptionRepository, useValue: {} },
        { provide: SubscriptionService, useValue: {} },
        { provide: SubscriptionPlanRepository, useValue: {} },
        { provide: UserPaymentMethodRepository, useValue: {} },
        { provide: UserPaymentMethodService, useValue: {} },
        { provide: LoggerService, useValue: { log: jest.fn(), error: jest.fn() } },
        { provide: FeedbackService, useValue: {} },
        { provide: FeedbackRepository, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: MailService, useValue: {} },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it("should NOT filter out SUPERADMIN, demo users, or orgId when sessionUser is SUPERADMIN", async () => {
    const superadminSession = {
      id: "admin-1",
      email: "superadmin@example.com",
      permits: { name: "SUPERADMIN" },
    };

    await service.getPaginate(
      { page: 1, limit: 10 },
      undefined,
      false,
      undefined,
      superadminSession,
    );

    expect(userRepositoryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [] },
      }),
    );
    expect(userRepositoryMock.count).toHaveBeenCalledWith({
      where: { AND: [] },
    });
  });

  it("should filter out SUPERADMIN, demo users, and deleted users when caller is a regular user", async () => {
    const regularUserSession = {
      id: "user-1",
      email: "regular@example.com",
      permits: { name: "USER" },
    };

    await service.getPaginate(
      { page: 1, limit: 10 },
      undefined,
      false,
      undefined,
      regularUserSession,
    );

    expect(userRepositoryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { deletedAt: null },
            { permits: { id: { not: "SUPERADMIN" } } },
            { isDemo: false },
          ],
        },
      }),
    );
  });
});
