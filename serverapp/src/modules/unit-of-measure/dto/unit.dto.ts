import { IsEnum, IsString, MaxLength } from "class-validator";
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

export class UpdateUnitDto {
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsString()
  @MaxLength(12)
  abbreviation?: string;

  @IsEnum(UnitKind, { message: "Tipo de unidad no válido." })
  kind?: UnitKind;

  active?: boolean;
}
