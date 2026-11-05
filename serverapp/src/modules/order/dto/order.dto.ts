import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { OrderStatus } from "@prisma/client";
import {
  COORDINATION_METHODS,
  FULFILLMENT_TYPES,
  type CoordinationMethod,
  type FulfillmentType,
} from "src/shared/constants/tenant-settings";

const NOTES_MAX = 1000;

export class OrderItemInputDto {
  @IsString({ message: "El producto es obligatorio." })
  productId: string;

  @Type(() => Number)
  @IsNumber({}, { message: "La cantidad debe ser numérica." })
  @Min(0.0001, { message: "La cantidad debe ser mayor que cero." })
  quantity: number;

  /** Unit price captured at order time; the storefront price wins. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceUSD?: number;
}

/** Public cart submission (S9): no account, no stock reservation. */
export class CreateOrderDto {
  @IsString({ message: "La tienda es obligatoria." })
  @MaxLength(80)
  organizationSlug: string;

  @IsNotEmpty({ message: "El nombre del cliente es obligatorio." })
  @IsString({ message: "El nombre del cliente es obligatorio." })
  @MaxLength(160)
  customerName: string;

  /**
   * Contact (S5): the order needs at least one channel. The storefront asks
   * for the WhatsApp number; the email stays optional and is validated when
   * present.
   */
  @IsOptional()
  @IsEmail({}, { message: "El correo del cliente debe ser válido." })
  @MaxLength(160)
  customerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  customerAddress?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  /** Defaults to PICKUP; every value is checked against the tenant settings. */
  @IsOptional()
  @IsIn(FULFILLMENT_TYPES, { message: "Tipo de entrega no válido." })
  fulfillmentType?: FulfillmentType;

  /** Required when `fulfillmentType` is SHIPPING. */
  @IsOptional()
  @IsString()
  agencyId?: string;

  @IsOptional()
  @IsIn(COORDINATION_METHODS, { message: "Coordinación no válida." })
  coordination?: CoordinationMethod;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;

  @IsArray({ message: "El pedido necesita al menos un producto." })
  @ArrayNotEmpty({ message: "El pedido necesita al menos un producto." })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: "Estado de pedido no válido." })
  status: OrderStatus;
}

export class ListOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  /** S7: "what do I ship today" — by kind of fulfillment or agency. */
  @IsOptional()
  @IsIn(FULFILLMENT_TYPES)
  fulfillmentType?: FulfillmentType;

  @IsOptional()
  @IsString()
  agencyId?: string;

  /** `true` → only dispatched, `false` → only pending dispatch. */
  @IsOptional()
  @Transform(({ value }) =>
    value === true || value === "true"
      ? true
      : value === false || value === "false"
        ? false
        : undefined,
  )
  @IsBoolean()
  shipped?: boolean;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  q?: string;

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

/** Dispatching an order (S7): stamp it and keep the agency's tracking code. */
export class ShipOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  trackingNumber?: string;

  @IsOptional()
  @IsDateString()
  shippedAt?: string;
}
