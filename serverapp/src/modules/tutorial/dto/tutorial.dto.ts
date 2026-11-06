import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from "class-validator";

export const TUTORIAL_SERIES = [
  "primeros-pasos",
  "dia-a-dia",
  "diferencias",
] as const;

export class PreviewTutorialDto {
  /** The YouTube link pasted by the admin (any common URL form). */
  @IsString({ message: "Pegá el enlace de YouTube." })
  @MaxLength(300)
  url: string;
}

export class CreateTutorialDto {
  @IsString({ message: "Pegá el enlace de YouTube." })
  @MaxLength(300)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(TUTORIAL_SERIES, { message: "Serie no válida." })
  series?: (typeof TUTORIAL_SERIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(12)
  duration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateTutorialDto {
  @IsOptional()
  @IsUrl({}, { message: "El enlace no es una URL válida." })
  @MaxLength(300)
  youtubeUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(TUTORIAL_SERIES, { message: "Serie no válida." })
  series?: (typeof TUTORIAL_SERIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(12)
  duration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
