import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { CashMovementType } from "@prisma/client";

const NOTES_MAX = 1000;

export class CreateCashRegisterDto {
  @IsString({ message: "El nombre de la caja es obligatorio." })
  @MaxLength(80)
  name: string;
}

export class UpdateCashRegisterDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

export class OpenShiftDto {
  @Type(() => Number)
  @IsNumber({}, { message: "El fondo inicial debe ser numérico." })
  @Min(0, { message: "El fondo inicial no puede ser negativo." })
  initialAmountUSD: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialAmountVES?: number;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;
}

export class CloseShiftDto {
  /** Blind count: what the cashier physically counted. */
  @Type(() => Number)
  @IsNumber({}, { message: "El conteo real debe ser numérico." })
  @Min(0, { message: "El conteo real no puede ser negativo." })
  actualAmountUSD: number;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  notes?: string;
}

export class CreateCashMovementDto {
  @IsEnum(CashMovementType, {
    message: "El tipo de movimiento debe ser INCOME o EXPENSE.",
  })
  type: CashMovementType;

  @Type(() => Number)
  @IsNumber({}, { message: "El monto debe ser numérico." })
  @Min(0.01, { message: "El monto debe ser mayor que cero." })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentMethod?: string;

  @IsString({ message: "El motivo del movimiento es obligatorio." })
  @MaxLength(200)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;
}

export class ListShiftsQueryDto {
  @IsOptional()
  @IsEnum(["OPEN", "CLOSED"])
  status?: "OPEN" | "CLOSED";

  @IsOptional()
  @IsString()
  cashRegisterId?: string;

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
