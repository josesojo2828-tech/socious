import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

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
