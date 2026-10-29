import { Prisma } from "@prisma/client";
import type { NormalizedSubscriptionPlanContent } from "../util/subscription-plan-content.util";

export type SUBSCRIPTION_PLAN_WHERE = Prisma.SubscriptionPlanWhereInput;
export type SUBSCRIPTION_PLAN_WHERE_UNIQUE =
  Prisma.SubscriptionPlanWhereUniqueInput;
export type SUBSCRIPTION_PLAN_CREATE = Prisma.SubscriptionPlanCreateInput;
export type SUBSCRIPTION_PLAN_UPDATE = Prisma.SubscriptionPlanUpdateInput;
export type SUBSCRIPTION_PLAN_WICTH_ID = { id: string };
export type SUBSCRIPTION_PLAN_INCLUDE = Prisma.SubscriptionPlanInclude;
export type SUBSCRIPTION_PLAN_ORDER =
  Prisma.SubscriptionPlanOrderByWithRelationInput;

export const SUBSCRIPTION_PLAN_DEFAULT_INCLUDE: SUBSCRIPTION_PLAN_INCLUDE = {
  _count: {
    select: {
      subscriptions: true,
    },
  },
  // subscriptions: true,
};

export interface SubscriptionPlanCreate {
  name: string;
  description: string;
  price: number;
  currency: string;
  badge?: string;
  featured?: boolean;
  colorTheme?: Record<string, string>;
  content?: NormalizedSubscriptionPlanContent;
}

export interface SubscriptionPlanUpdate {
  name: string;
  description: string;
  price: number;
  currency: string;
  badge?: string;
  featured?: boolean;
  colorTheme?: Record<string, string>;
  content?: NormalizedSubscriptionPlanContent;
}
