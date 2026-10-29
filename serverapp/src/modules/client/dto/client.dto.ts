import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";

const NAME_MAX = 160;
const NOTES_MAX = 2000;

export class CreateClientDto {
  @IsString({ message: "El nombre es obligatorio." })
  @MaxLength(NAME_MAX, { message: `El nombre no puede exceder ${NAME_MAX} caracteres.` })
  name: string;

  @IsOptional()
  @IsString({ message: "El documento debe ser una cadena de texto." })
  @MaxLength(40, { message: "El documento no puede exceder 40 caracteres." })
  taxId?: string;

  @IsOptional()
  @IsEmail({}, { message: "Formato de email inválido." })
  email?: string;

  @IsOptional()
  @IsString({ message: "El teléfono debe ser una cadena de texto." })
  @MaxLength(40, { message: "El teléfono no puede exceder 40 caracteres." })
  phone?: string;

  @IsOptional()
  @IsString({ message: "La dirección debe ser una cadena de texto." })
  @MaxLength(NOTES_MAX, { message: "La dirección es demasiado larga." })
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El límite de crédito debe ser numérico." })
  @Min(0, { message: "El límite de crédito no puede ser negativo." })
  creditLimitUSD?: number;

  @IsOptional()
  @IsString({ message: "Las notas deben ser una cadena de texto." })
  @MaxLength(NOTES_MAX, { message: "Las notas son demasiado largas." })
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Every field is optional: PATCH semantics only. */
export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(NAME_MAX)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  taxId?: string;

  @IsOptional()
  @IsEmail({}, { message: "Formato de email inválido." })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimitUSD?: number;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListClientsQueryDto {
  /** Free-text search over name, document, email and phone. */
  @IsOptional()
  @IsString()
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

  /** `true` → only active, `false` → only inactive, omitted → all. */
  @IsOptional()
  @Transform(({ value }) =>
    value === true || value === "true" ? true : value === false || value === "false" ? false : undefined,
  )
  @IsBoolean()
  isActive?: boolean;
}
