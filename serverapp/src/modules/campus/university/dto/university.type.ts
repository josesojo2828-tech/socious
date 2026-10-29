import { Prisma } from "@prisma/client";

export type UNIVERSITY_WHERE = Prisma.UniversityWhereInput;
export type UNIVERSITY_WHERE_UNIQUE = Prisma.UniversityWhereUniqueInput;
export type UNIVERSITY_CREATE = Prisma.UniversityCreateInput;
export type UNIVERSITY_UPDATE = Prisma.UniversityUpdateInput;
export type UNIVERSITY_WICTH_ID = { id: string };
export type UNIVERSITY_INCLUDE = Prisma.UniversityInclude;
export type UNIVERSITY_ORDER = Prisma.UniversityOrderByWithRelationInput;

export const UNIVERSITY_DEFAULT_INCLUDE: UNIVERSITY_INCLUDE = {
  _count: true,
};
