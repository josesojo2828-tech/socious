import { Prisma } from "@prisma/client";

export type WALLET_WHERE = Prisma.UserWalletWhereInput;
export type WALLET_WHERE_UNIQUE = Prisma.UserWalletWhereUniqueInput;
export type WALLET_CREATE = Prisma.UserWalletCreateInput;
export type WALLET_UPDATE = Prisma.UserWalletUpdateInput;
export type WALLET_WICTH_ID = { id: string };
export type WALLET_INCLUDE = Prisma.UserWalletInclude;
export type WALLET_ORDER = Prisma.UserWalletOrderByWithRelationInput;

export const DEFAULT_INCLUDE: WALLET_INCLUDE = {
  user: true,
};
