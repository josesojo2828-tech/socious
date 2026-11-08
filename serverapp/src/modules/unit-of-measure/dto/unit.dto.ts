import { IsBoolean,
  IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { UnitKind } from "@prisma/client";

export class CreateUnitDto {
  @IsString({ message: "El nombre es obligatorio." })
  @MaxLength(60)
  name: string;

  @IsString({ message: "La abreviatura es obligatoria." })
  @MaxLength(12)
  abbreviation: string;

  @IsEnum(UnitKind, { message: "Tipo de unidad no válido." })
  kind: UnitKind;
}

/**
 * Partial update: the units panel toggles `active` alone, so every other field
 * MUST be optional — without `@IsOptional()` class-validator validates the
 * missing properties and rejects the PATCH.
 */
export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  abbreviation?: string;

  @IsOptional()
  @IsEnum(UnitKind, { message: "Tipo de unidad no válido." })
  kind?: UnitKind;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
