import { IsOptional, IsString, IsInt, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export interface CommunityItemResponse {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  tags: string[];
  importCount: number;
  publishedAt: Date;
  author: {
    id: string;
    fullName?: string;
    email?: string;
  };
  macros?: {
    kcal: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export class CommunityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perPage?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  authorId?: string;
}

export interface PathologyStat {
  tag: string;
  label: string;
  count: number;
}

export interface CategoryStat {
  category: string;
  label: string;
  count: number;
}

export interface CommunityStatsResponse {
  totalMenus: number;
  totalKcalAvg: number;
  pathologyStats: PathologyStat[];
  categoryStats: CategoryStat[];
}
