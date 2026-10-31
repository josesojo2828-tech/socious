import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PaymentStatus, SaleStatus } from "@prisma/client";

const NOTES_MAX = 1000;

export class SaleItemInputDto {
  @IsOptional()
  @IsString()
  productId?: string;

  /** Sale of a presentation: its stock is the one that decrements (S6). */
  @IsOptional()
  @IsString()
  presentationId?: string;

  /**
   * Denormalized on purpose: the sale keeps the name sold even when the
   * product is later renamed or deleted.
   */
  @IsString({ message: "El nombre del producto es obligatorio." })
  @MaxLength(200)
  productName: string;

  @Type(() => Number)
  @IsNumber({}, { message: "La cantidad debe ser numérica." })
  @Min(0.0001, { message: "La cantidad debe ser mayor que cero." })
  quantity: number;

  @Type(() => Number)
  @IsNumber({}, { message: "El precio debe ser numérico." })
  @Min(0, { message: "El precio no puede ser negativo." })
  unitPriceUSD: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountUSD?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

export class SalePaymentInputDto {
  @Type(() => Number)
  @IsNumber({}, { message: "El monto debe ser numérico." })
  @Min(0.01, { message: "El monto debe ser mayor que cero." })
  amountOriginal: number;

  @IsIn(["USD", "VES", "USDT"], { message: "Moneda no soportada." })
  currency: "USD" | "VES" | "USDT";

  @Matches(/^[A-Z][A-Z0-9_]{1,39}$/, {
    message: "Método de pago no reconocido.",
  })
  paymentMethod: string;

  /** Real collection date; defaults to now. Keeps the accrual month intact. */
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;
}

export class CreateSaleDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  /** Credit terms (S3): the service computes dueDate from the cadence. */
  @IsOptional()
  @IsIn(["QUINCENAL", "MONTHLY", "EVERY_N_DAYS", "FREE"])
  creditCadence?: "QUINCENAL" | "MONTHLY" | "EVERY_N_DAYS" | "FREE";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  creditEveryNDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(28)
  creditMonthlyDay?: number;

  @IsOptional()
  @IsString()
  cashShiftId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountUSD?: number;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;

  /** Explicit rates freeze the document at the cashier's value. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  rateBcv?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  rateUsdt?: number;

  @IsArray({ message: "La venta necesita al menos un artículo." })
  @ArrayNotEmpty({ message: "La venta necesita al menos un artículo." })
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items: SaleItemInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentInputDto)
  payments?: SalePaymentInputDto[];
}

export class AddSalePaymentDto extends SalePaymentInputDto {}

export class ListSalesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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
}

export class SalesReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
