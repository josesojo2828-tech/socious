import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { DeliveryRouteStatus, RouteItemStatus } from "@prisma/client";

const NOTES_MAX = 1000;

export class CreateDeliveryRouteDto {
  /** The delivery day (S8: "el sabado va a realizar entregas"). */
  @IsDateString({}, { message: "La fecha de la ruta es obligatoria." })
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  vehicle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;

  /** Orders the merchant already knows belong to that day. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orderIds?: string[];
}

export class AssignOrdersDto {
  @IsArray({ message: "Indica al menos un pedido." })
  @ArrayNotEmpty({ message: "Indica al menos un pedido." })
  @IsString({ each: true })
  orderIds: string[];
}

export class UpdateRouteStatusDto {
  @IsEnum(DeliveryRouteStatus, { message: "Estado de ruta no válido." })
  status: DeliveryRouteStatus;
}

/** Item states: delivered or failed (with a reason) — no silent PENDING. */
export class MarkRouteItemDto {
  @IsIn(["DELIVERED", "FAILED"], {
    message: "El resultado del pedido debe ser DELIVERED o FAILED.",
  })
  status: "DELIVERED" | "FAILED";

  @IsOptional()
  @IsString()
  @MaxLength(300)
  failureReason?: string;
}

export class ListDeliveryRoutesQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(DeliveryRouteStatus)
  status?: DeliveryRouteStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
