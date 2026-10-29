import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCategoryDto {
  @IsString({ message: "El nombre es obligatorio." })
  @MaxLength(120)
  name: string;

  /** Generated from the name when omitted. */
  @IsOptional()
  @Matches(SLUG_PATTERN, {
    message: "El slug solo puede contener minúsculas, números y guiones.",
  })
  @MaxLength(140)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Parent category id; omit to create a root category. */
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Matches(SLUG_PATTERN, {
    message: "El slug solo puede contener minúsculas, números y guiones.",
  })
  @MaxLength(140)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
