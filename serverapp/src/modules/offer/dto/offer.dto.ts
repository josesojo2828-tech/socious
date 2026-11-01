import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

/** GET /api/offers — page/limit like every other list, plus a text filter. */
export class ListOffersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class CreateOfferDto {
  @IsString({ message: "El nombre es obligatorio." })
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slogan?: string;

  /** Clave MinIO del banner (subida a /api/file/upload con prefix=offer). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bannerKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsDateString()
  expiresAt: string;

  @IsArray({ message: "La oferta necesita al menos un producto." })
  @ArrayNotEmpty({ message: "La oferta necesita al menos un producto." })
  @IsString({ each: true })
  items: string[];
}

export class UpdateOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slogan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bannerKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];
}
