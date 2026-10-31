import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  Matches,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CURRENCY_CODES } from "src/shared/constants/payment-methods";

const NOTES_MAX = 1000;

export class SaleReturnItemInputDto {
  /** Points at the exact sale line; falls back to productId / productName. */
  @IsOptional()
  @IsString()
  saleItemId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  productName?: string;

  @Type(() => Number)
  @IsNumber({}, { message: "La cantidad debe ser numérica." })
  @Min(0.0001, { message: "La cantidad debe ser mayor que cero." })
  quantity: number;
}

/**
 * Prices are never accepted from the client: a return reverses exactly what
 * the sale line charged (unit price, prorated discount and tax rate).
 */
export class CreateSaleReturnDto {
  @IsArray({ message: "La devolución necesita al menos un artículo." })
  @ArrayNotEmpty({ message: "La devolución necesita al menos un artículo." })
  @ValidateNested({ each: true })
  @Type(() => SaleReturnItemInputDto)
  items: SaleReturnItemInputDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @Matches(/^[A-Z][A-Z0-9_]{1,39}$/, {
    message: "Método de reintegro no reconocido.",
  })
  refundMethod?: string;

  /** Currency the money was handed back in; defaults to USD. */
  @IsOptional()
  @IsIn(CURRENCY_CODES, { message: "Moneda no soportada." })
  currency?: "USD" | "VES" | "USDT";

  /**
   * Optional: the refund was paid out of an open turn. Only accepted while
   * `settings.cash.shiftControl` is on (S2).
   */
  @IsOptional()
  @IsString()
  cashShiftId?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;
}

export class ListSaleReturnsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  saleId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
