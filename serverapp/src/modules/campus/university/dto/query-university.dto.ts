import { IsOptional, IsString, IsBoolean, IsInt, Min } from "class-validator";
import { Type, Transform } from "class-transformer";

export class QueryUniversityDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === undefined ? undefined : (value === "true" || value === true))
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
