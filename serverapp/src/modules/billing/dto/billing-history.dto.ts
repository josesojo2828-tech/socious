import { InvoiceStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from "class-validator";

/**
 * Query for the monthly billing history.
 *
 * Owner resolution:
 *   * `ownerType=organization&ownerId=<orgId>` → that organization's invoices.
 *   * `ownerType=user&ownerId=<userId>`        → that user's personal invoices.
 *   * omitted → the current workspace org (when `x-workspace-id` is present) or
 *     the caller's personal invoices.
 */
export class BillingHistoryQueryDto {
  @IsOptional()
  @IsIn(["organization", "user"])
  ownerType?: "organization" | "user";

  @IsOptional()
  @IsString()
  ownerId?: string;

  /** Convenience period filter in `YYYY-MM`. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, {
    message: "period debe tener el formato YYYY-MM",
  })
  period?: string;

  /** Inclusive lower bound on the billing period (`periodStart`). */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Exclusive upper bound on the billing period (`periodStart`). */
  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;
}
