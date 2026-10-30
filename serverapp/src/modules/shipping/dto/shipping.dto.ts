import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

const KEY_PATTERN = /^[A-Z0-9_]{1,40}$/;

export class CreateShippingAgencyDto {
  @IsString({ message: "La clave de la agencia es obligatoria." })
  @Matches(KEY_PATTERN, {
    message: "La clave solo puede contener mayúsculas, números y guiones bajos (ej. ZOOM).",
  })
  key: string;

  @IsNotEmpty({ message: "El nombre de la agencia es obligatorio." })
  @IsString()
  @MaxLength(120)
  name: string;
}

/** Platform-owned catalog: only the name and the active switch move. */
export class UpdateShippingAgencyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
