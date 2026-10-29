import { Prisma } from "@prisma/client";
import { DEFAULT_INCLUDE } from "./user.types";
import { PAYMENT_METHOD_DEFAULT_INCLUDE } from "src/modules/payment-method/dto/payment-method.type";

export type USER_PAYMENT_METHOD_WHERE = Prisma.UserPaymentMethodWhereInput;
export type USER_PAYMENT_METHOD_WHERE_UNIQUE =
  Prisma.UserPaymentMethodWhereUniqueInput;
export type USER_PAYMENT_METHOD_CREATE = Prisma.UserPaymentMethodCreateInput;
export type USER_PAYMENT_METHOD_UPDATE = Prisma.UserPaymentMethodUpdateInput;
export type USER_PAYMENT_METHOD_WICTH_ID = { id: string };
export type USER_PAYMENT_METHOD_INCLUDE = Prisma.UserPaymentMethodInclude;
export type USER_PAYMENT_METHOD_ORDER =
  Prisma.UserPaymentMethodOrderByWithRelationInput;

export const USER_PAYMENT_METHOD_DEFAULT_INCLUDE: USER_PAYMENT_METHOD_INCLUDE =
  {
    user: {
      include: DEFAULT_INCLUDE,
    },
    paymentMethod: {
      include: PAYMENT_METHOD_DEFAULT_INCLUDE,
    },
  };
