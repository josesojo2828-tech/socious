import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class CreateActivityLogDto {
  @IsString()
  userId: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  eventName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  eventVersion?: string;
}

export class ActivityFeedQueryDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class ActivityStatsQueryDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}

export class UserActivityResponseDto {
  id: string;
  userId: string;
  action: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  eventName?: string | null;
  category?: string | null;
  organizationId?: string | null;
  source?: string | null;
  eventVersion?: string | null;
  createdAt: Date;
  user?: { id: string; fullName: string; email: string };
}

export class ActiveUsersStatsResponseDto {
  dau: number;
  wau: number;
  mau: number;
}

export class PaginatedActivityResponseDto<T> {
  data: T[];
  nextCursor: string | null;
}
