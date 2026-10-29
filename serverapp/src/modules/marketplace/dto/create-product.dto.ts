import { IsString, IsNumber, IsOptional, IsEnum, IsArray, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(['COURSE', 'EBOOK', 'TEMPLATE', 'WEBINAR'] as const)
  type: 'COURSE' | 'EBOOK' | 'TEMPLATE' | 'WEBINAR';

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  previewUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
