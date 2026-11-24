import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateMeatCarcassDto {
  @IsNotEmpty({ message: "El nombre de la pieza o animal es requerido." })
  @IsString({ message: "El nombre debe ser una cadena de texto." })
  name: string;

  @IsOptional()
  @IsString({ message: "El código debe ser una cadena de texto." })
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El costo por kg sugerido debe ser un número." })
  @Min(0, { message: "El costo por kg no puede ser negativo." })
  defaultCostUSD?: number;
}

export class UpdateMeatCarcassDto {
  @IsOptional()
  @IsString({ message: "El nombre debe ser una cadena de texto." })
  name?: string;

  @IsOptional()
  @IsString({ message: "El código debe ser una cadena de texto." })
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "El costo por kg sugerido debe ser un número." })
  @Min(0, { message: "El costo por kg no puede ser negativo." })
  defaultCostUSD?: number;

  @IsOptional()
  @IsBoolean({ message: "El estado activo debe ser un booleano." })
  active?: boolean;
}
