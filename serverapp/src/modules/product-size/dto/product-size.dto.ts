import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateProductSizeDto {
  @IsString({ message: "La talla es obligatoria." })
  @MaxLength(40)
  label: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** Partial update: the panel toggles `active` alone. */
export class UpdateProductSizeDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
