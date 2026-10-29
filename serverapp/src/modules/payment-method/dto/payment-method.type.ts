import { Prisma } from "@prisma/client";

export type PAYMENT_METHOD_WHERE = Prisma.PaymentMethodWhereInput;
export type PAYMENT_METHOD_WHERE_UNIQUE = Prisma.PaymentMethodWhereUniqueInput;
export type PAYMENT_METHOD_CREATE = Prisma.PaymentMethodCreateInput;
export type PAYMENT_METHOD_UPDATE = Prisma.PaymentMethodUpdateInput;
export type PAYMENT_METHOD_WICTH_ID = { id: string };
export type PAYMENT_METHOD_INCLUDE = Prisma.PaymentMethodInclude;
export type PAYMENT_METHOD_ORDER = Prisma.PaymentMethodOrderByWithRelationInput;

export const PAYMENT_METHOD_DEFAULT_INCLUDE: PAYMENT_METHOD_INCLUDE = {
  _count: {
    select: {
      userMethods: true,
    },
  },
  // subscriptions: true,
};

export interface PaymentMethodCreate {
  name: string;
  description: string;
  price: number;
  currency: string;
  code: string;
  imagePath: string;
  colorStart: string;
  colorEnd: string;
  colorText: string;
  active: boolean;
}

export interface PaymentMethodUpdate {
  name: string;
  description: string;
  price: number;
  currency: string;
  code: string;
  imagePath: string;
  colorStart: string;
  colorEnd: string;
  colorText: string;
  active: boolean;
}
