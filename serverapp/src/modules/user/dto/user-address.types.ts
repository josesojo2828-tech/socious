import { Prisma } from "@prisma/client";

export type USER_ADDRESS_WHERE = Prisma.UserAddressWhereInput;
export type USER_ADDRESS_WHERE_UNIQUE = Prisma.UserAddressWhereUniqueInput;
export type USER_ADDRESS_CREATE = Prisma.UserAddressCreateInput;
export type USER_ADDRESS_UPDATE = Prisma.UserAddressUpdateInput;
export type USER_ADDRESS_WICTH_ID = { id: string };
export type USER_ADDRESS_INCLUDE = Prisma.UserAddressInclude;
export type USER_ADDRESS_ORDER = Prisma.UserAddressOrderByWithRelationInput;

export const DEFAULT_INCLUDE: USER_ADDRESS_INCLUDE = {
  user: true,
};
