import { Prisma } from "@prisma/client";
import { USER_PAYMENT_METHOD_DEFAULT_INCLUDE } from "src/modules/user/dto/user-payment-method.types";
import { DEFAULT_INCLUDE as USER_DEFAULT_INCLUDE } from "src/modules/user/dto/user.types";
import { TransactionStatus } from "src/shared/types/schema.types";

export type TRANSACTION_WHERE = Prisma.TransactionWhereInput;
export type TRANSACTION_WHERE_UNIQUE = Prisma.TransactionWhereUniqueInput;
export type TRANSACTION_CREATE = Prisma.TransactionCreateInput;
export type TRANSACTION_UPDATE = Prisma.TransactionUpdateInput;
export type TRANSACTION_WICTH_ID = { id: string };
export type TRANSACTION_INCLUDE = Prisma.TransactionInclude;
export type TRANSACTION_ORDER = Prisma.TransactionOrderByWithRelationInput;

export const TRANSACTION_DEFAULT_INCLUDE: TRANSACTION_INCLUDE = {
  user: {
    include: USER_DEFAULT_INCLUDE,
  },
  paymentMethod: {
    include: USER_PAYMENT_METHOD_DEFAULT_INCLUDE,
  },
};

export interface TransactionCreate {
  description?: string;
  amount: number;
  referenceCode: string;
  status: TransactionStatus;
  paymentMethodId: string;
  currency?: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRateUsed?: number;
}

export interface TransactionUpdate {
  description?: string;
  referenceCode: string;
  status: TransactionStatus;
}
