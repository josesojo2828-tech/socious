import { Prisma } from "@prisma/client";

export type FILE_WHERE = Prisma.FileWhereUniqueInput;
export type FILE_CREATE = Prisma.FileCreateInput;
export type FILE_UPDATE = Prisma.FileUpdateInput;
export type FILE_WICTH_ID = { id: string };
export type FILE_INCLUDE = Prisma.FileInclude;
export type FILE_ORDER = Prisma.FileOrderByWithRelationInput;

export const FILE_DEFAULT_INCLUDE: FILE_INCLUDE = {
  uploadedBy: true,
};
