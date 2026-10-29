import { FastifyRequest } from "fastify";
import { User } from "./schema.types";
import type { ResolvedEntitlements } from "src/modules/permit/service/entitlement-resolver";
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsIn,
  IsDateString,
} from "class-validator";
import { Type, Transform } from "class-transformer";

export interface RequestWithUser extends FastifyRequest {
  user: User & { entitlements?: ResolvedEntitlements };
  lang: string;
}

export class FilterParamsDto {
  // ==========================================
  // 1. CAMPOS DE BÚSQUEDA GENERAL
  // ==========================================
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  status?: string;

  // ==========================================
  // 2. FILTROS POR RELACIONES (IDs)
  // ==========================================

  @IsOptional()
  @IsString()
  permitId?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  // ==========================================
  // 3. FILTROS DE CLASIFICACIÓN
  // ==========================================

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sub?: string;

  // ==========================================
  // 4. FILTROS BOOLEANOS
  // ==========================================

  @IsOptional()
  @Transform(({ value }) => value === undefined ? undefined : (value === "true" || value === true))
  autoRenew?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === undefined ? undefined : (value === "true" || value === true))
  active?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === undefined ? undefined : (value === "true" || value === true))
  selected?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === undefined ? undefined : (value === "true" || value === true))
  isDefault?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === undefined ? undefined : (value === "true" || value === true))
  isDemo?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === undefined ? undefined : (value === "true" || value === true))
  includeArchived?: boolean;

  // ==========================================
  // 5. RANGOS DE FECHAS
  // ==========================================

  @IsOptional()
  @IsDateString()
  createdAt_gte?: string;

  @IsOptional()
  @IsDateString()
  createdAt_lte?: string;

  @IsOptional()
  @IsDateString()
  updatedAt_gte?: string;

  @IsOptional()
  @IsDateString()
  updatedAt_lte?: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  // ==========================================
  // 6. PAGINACIÓN Y ORDENAMIENTO
  // ==========================================

  @IsOptional()
  @Transform(({ value }) => Array.isArray(value) ? Number(value[0]) : Number(value))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => Array.isArray(value) ? Number(value[0]) : Number(value))
  @IsInt()
  @Min(1)
  limit: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";
}
