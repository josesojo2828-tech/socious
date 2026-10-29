import { IsNotEmpty, IsString, IsOptional, IsBoolean } from "class-validator";

export class CreateUniversityDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
