import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  Matches,
  IsString,
  MaxLength,
  Min,
  registerDecorator,
  ValidateNested,
  ValidationOptions,
} from "class-validator";
import { Type } from "class-transformer";
import { PaymentStatus, PurchaseStatus } from "@prisma/client";

const NOTES_MAX = 1000;

export class PurchaseItemInputDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString({ message: "El nombre del producto es obligatorio." })
  @MaxLength(200)
  productName: string;

  @Type(() => Number)
  @IsNumber({}, { message: "La cantidad debe ser numérica." })
  @Min(0.0001, { message: "La cantidad debe ser mayor que cero." })
  quantity: number;

  @Type(() => Number)
  @IsNumber({}, { message: "El costo debe ser numérico." })
  @Min(0, { message: "El costo no puede ser negativo." })
  unitCostUSD: number;
}

export class PurchasePaymentInputDto {
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

  /** Real payment date; defaults to now. Keeps the accrual month intact. */
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  cashShiftId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;
}

export class CreatePurchaseDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;

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

  @IsArray({ message: "La compra necesita al menos un artículo." })
  @ArrayNotEmpty({ message: "La compra necesita al menos un artículo." })
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemInputDto)
  items: PurchaseItemInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchasePaymentInputDto)
  payments?: PurchasePaymentInputDto[];
}

export class AddPurchasePaymentDto extends PurchasePaymentInputDto {}

export class ListPurchasesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

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

export class PurchasesReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/**
 * Draft payload (S13): free-form Json, but it MUST be an object carrying an
 * `items` array — the shape the /dashboard/compras/nuevo screen writes and
 * reads back. Anything else is refused by the global ValidationPipe with a
 * 400 before it reaches the controller.
 */
export function IsPurchaseDraftPayload(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isPurchaseDraftPayload",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (!value || typeof value !== "object" || Array.isArray(value)) {
            return false;
          }
          return Array.isArray((value as { items?: unknown }).items);
        },
        defaultMessage(): string {
          return "El borrador debe ser un objeto con un arreglo items.";
        },
      },
    });
  };
}

/** Body PUT /api/purchases/drafts — one draft per organization + creator. */
export class SavePurchaseDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsObject({ message: "El borrador debe ser un objeto." })
  @IsPurchaseDraftPayload()
  payload: Record<string, unknown>;
}
