import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateCampaignPlanDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(1)
  duration: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  designs?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  videos?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  posts?: number;

  @IsBoolean()
  @IsOptional()
  socialMedia?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
