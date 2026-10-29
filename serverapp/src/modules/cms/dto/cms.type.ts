import { Prisma } from "@prisma/client";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export type CMS_WHERE = Prisma.CorporateContentWhereInput;
export type CMS_WHERE_UNIQUE = Prisma.CorporateContentWhereUniqueInput;
export type CMS_CREATE = Prisma.CorporateContentCreateInput;
export type CMS_UPDATE = Prisma.CorporateContentUpdateInput;
export type CMS_WICTH_ID = { id: string };
export type CMS_ORDER = Prisma.CorporateContentOrderByWithRelationInput;

export class CmsCreateDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CmsUpdateDto {
  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
