import { IsNumber, IsOptional, IsString, MaxLength, Min, Max } from "class-validator";

export class CreateSupplierLocationDto {
  @IsString({ message: "La etiqueta es obligatoria." })
  @MaxLength(80)
  label: string;

  @IsNumber({}, { message: "La latitud debe ser numérica." })
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber({}, { message: "La longitud debe ser numérica." })
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}

export class UpdateSupplierLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}
