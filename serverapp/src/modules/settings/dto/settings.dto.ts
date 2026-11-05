import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import {
  AGENCY_KEY_PATTERN,
  COORDINATION_METHODS,
  CURRENCY_VISIBILITY_KEYS,
  FULFILLMENT_TYPES,
  type CoordinationMethod,
  type CurrencyVisibilityKey,
  type FulfillmentType,
} from "src/shared/constants/tenant-settings";

/**
 * PATCH body for `GET/PATCH /api/settings`.
 *
 * Global `ValidationPipe` runs with `whitelist` + `forbidNonWhitelisted`, so a
 * unknown key is a 400 before it reaches the service; the service re-validates
 * because it is also called outside HTTP.
 */

export class CashSettingsDto {
  @IsOptional()
  @IsBoolean({ message: "cash.shiftControl debe ser verdadero o falso." })
  shiftControl?: boolean;
}

export class CurrencyVisibilityDto {
  @IsOptional()
  @IsBoolean()
  showUSD?: boolean;

  @IsOptional()
  @IsBoolean()
  showVES?: boolean;

  @IsOptional()
  @IsBoolean()
  showUSDT?: boolean;

  @IsOptional()
  @IsBoolean()
  showBCV?: boolean;

  @IsOptional()
  @IsBoolean()
  showEUR?: boolean;
}

export class FulfillmentSettingsDto {
  @IsOptional()
  @IsArray({ message: "fulfillment.enabledTypes debe ser una lista." })
  @ArrayNotEmpty({ message: "Selecciona al menos un tipo de entrega." })
  @IsIn(FULFILLMENT_TYPES, {
    each: true,
    message: `Tipo de entrega no válido. Valores: ${FULFILLMENT_TYPES.join(", ")}.`,
  })
  enabledTypes?: FulfillmentType[];

  @IsOptional()
  @IsIn(COORDINATION_METHODS, { message: "Coordinación no válida." })
  coordination?: CoordinationMethod;
}

export class ShippingSettingsDto {
  @IsOptional()
  @IsArray({ message: "shipping.enabledAgencies debe ser una lista." })
  @Matches(AGENCY_KEY_PATTERN, {
    each: true,
    message: "Clave de agencia inválida (ej. ZOOM).",
  })
  enabledAgencies?: string[];
}

export class DeliverySettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "delivery.feeUSD debe ser numérico." })
  @Min(0, { message: "delivery.feeUSD no puede ser negativo." })
  feeUSD?: number;
}

export class RoutesSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class ReturnsSettingsDto {
  @IsOptional()
  @IsArray({ message: "returns.reasons debe ser una lista." })
  @IsString({ each: true })
  reasons?: string[];
}

export class CreditSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialPaymentUSD?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  initialPercent?: number;

  @IsOptional()
  @IsIn(["QUINCENAL", "MONTHLY", "EVERY_N_DAYS", "FREE"], {
    message: "Cadencia de crédito no válida.",
  })
  cadence?: "QUINCENAL" | "MONTHLY" | "EVERY_N_DAYS" | "FREE";

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  everyNDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  monthlyDay?: number;
}

export class NotificationsSettingsDto {
  @IsOptional()
  @IsBoolean()
  lowStock?: boolean;

  @IsOptional()
  @IsBoolean()
  creditDue?: boolean;

  @IsOptional()
  @IsBoolean()
  orderReceived?: boolean;

  @IsOptional()
  @IsBoolean()
  saleCreated?: boolean;
}

export class PaymentsSettingsDto {
  @IsOptional()
  @IsArray({ message: "payments.disabledCodes debe ser una lista." })
  @IsString({ each: true })
  disabledCodes?: string[];
}

export class PurchasesSettingsDto {
  @IsOptional()
  @IsBoolean({
    message: "purchases.onlySupplierProducts debe ser verdadero o falso.",
  })
  onlySupplierProducts?: boolean;
}

export class InventorySettingsDto {
  @IsOptional()
  @IsBoolean({
    message: "inventory.useRawMaterials debe ser verdadero o falso.",
  })
  useRawMaterials?: boolean;

  @IsOptional()
  @IsBoolean({
    message: "inventory.useServices debe ser verdadero o falso.",
  })
  useServices?: boolean;
}

export class UpdateTenantSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CashSettingsDto)
  cash?: CashSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CurrencyVisibilityDto)
  currencies?: CurrencyVisibilityDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FulfillmentSettingsDto)
  fulfillment?: FulfillmentSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingSettingsDto)
  shipping?: ShippingSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliverySettingsDto)
  delivery?: DeliverySettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RoutesSettingsDto)
  routes?: RoutesSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReturnsSettingsDto)
  returns?: ReturnsSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreditSettingsDto)
  credit?: CreditSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsSettingsDto)
  notifications?: NotificationsSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentsSettingsDto)
  payments?: PaymentsSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PurchasesSettingsDto)
  purchases?: PurchasesSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => InventorySettingsDto)
  inventory?: InventorySettingsDto;
}

/** The visibility keys the DTO accepts, exported for the controller's docs. */
export const SUPPORTED_CURRENCY_KEYS: readonly CurrencyVisibilityKey[] =
  CURRENCY_VISIBILITY_KEYS;
