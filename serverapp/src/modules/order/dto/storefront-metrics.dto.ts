import { IsDateString, IsOptional } from "class-validator";

/** `GET /api/storefront/metrics?from&to` — same inclusive-day semantics as sales. */
export class StorefrontMetricsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
