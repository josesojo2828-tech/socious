import { Prisma } from "@prisma/client";

export type CONDIMENT_WHERE = Prisma.CondimentWhereInput;
export type CONDIMENT_WHERE_UNIQUE = Prisma.CondimentWhereUniqueInput;
export type CONDIMENT_CREATE = Prisma.CondimentCreateInput;
export type CONDIMENT_UPDATE = Prisma.CondimentUpdateInput;
export type CONDIMENT_WITH_ID = { id: string };
export type CONDIMENT_INCLUDE = Prisma.CondimentInclude;
export type CONDIMENT_ORDER = Prisma.CondimentOrderByWithRelationInput;

export const CONDIMENT_DEFAULT_INCLUDE: CONDIMENT_INCLUDE = {};

export interface ICreateCondimentDto {
  name: string;
}
