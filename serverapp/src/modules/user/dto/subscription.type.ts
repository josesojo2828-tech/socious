import { Prisma } from "@prisma/client";

export type SUBSCRIPTION_WHERE = Prisma.SubscriptionWhereInput;
export type SUBSCRIPTION_WHERE_UNIQUE = Prisma.SubscriptionWhereUniqueInput;
export type SUBSCRIPTION_CREATE = Prisma.SubscriptionCreateInput;
export type SUBSCRIPTION_UPDATE = Prisma.SubscriptionUpdateInput;
export type SUBSCRIPTION_WITH_ID = { id: string };
export type SUBSCRIPTION_INCLUDE = Prisma.SubscriptionInclude;
export type SUBSCRIPTION_ORDER = Prisma.SubscriptionOrderByWithRelationInput;

export const SUBSCRIPTION_DEFAULT_INCLUDE: SUBSCRIPTION_INCLUDE = {
  plan: true,
  user: true,
  organization: true,
};

export const SUBSCRIPTION_SELECT = {
  id: true,
  userId: true,
  planId: true,
  startDate: true,
  endDate: true,
  status: true,
  autoRenew: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  organizationId: true,
  gracePeriodEndsAt: true,
  readOnlyEndsAt: true,
  canceledAt: true,
  lastPlanChangeAt: true,
  plan: true,
  user: true,
  organization: true,
};

export interface IUserSubscriptionCreate {
  userId: string;
  organizationId?: string | null;

  planId: string;
  autoRenew: boolean;
  endDate?: Date | null;
  ignorePayment?: boolean;
}
