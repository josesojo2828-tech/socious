import { ModuleScope } from "@prisma/client";
import { PartialType } from "@nestjs/mapped-types";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

/**
 * Catalog CRUD DTOs (design D1). `key` is the STABLE MACHINE KEY used by the
 * resolver, sidebar and the dashboard registry — it is immutable on update.
 */
export class CreateModuleDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsArray()
  @IsEnum(ModuleScope, { each: true })
  scopes: ModuleScope[];

  @IsOptional()
  @IsString()
  operatorPermit?: string;

  @IsOptional()
  @IsString()
  dashboardKind?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateModuleDto extends PartialType(CreateModuleDto) {}
