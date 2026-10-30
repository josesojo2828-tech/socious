import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  Matches,
  Min,
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
}

/** The visibility keys the DTO accepts, exported for the controller's docs. */
export const SUPPORTED_CURRENCY_KEYS: readonly CurrencyVisibilityKey[] =
  CURRENCY_VISIBILITY_KEYS;
