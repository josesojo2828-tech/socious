import { Prisma } from "@prisma/client";

export type PERMIT_WHERE = Prisma.PermitWhereInput;
export type PERMIT_WHERE_UNIQUE = Prisma.PermitWhereUniqueInput;
export type PERMIT_CREATE = Prisma.PermitCreateInput;
export type PERMIT_UPDATE = Prisma.PermitUpdateInput;
export type PERMIT_WICTH_ID = { id: string };
export type PERMIT_INCLUDE = Prisma.PermitInclude;
export type PERMIT_ORDER = Prisma.PermitOrderByWithRelationInput;

export const PERMIT_DEFAULT_INCLUDE: PERMIT_INCLUDE = {
  _count: true,
};
