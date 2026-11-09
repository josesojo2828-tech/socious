import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

/** Physical workstation kinds of a service business. */
export const STATION_KINDS = ["TABLE", "CHAIR"] as const;
export type StationKind = (typeof STATION_KINDS)[number];

/** Lifecycle of a booked slot. */
export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "DONE",
  "CANCELED",
  "NO_SHOW",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export class CreateStationDto {
  @IsNotEmpty({ message: "El nombre de la mesa o silla es obligatorio." })
  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsIn([...STATION_KINDS])
  kind?: StationKind;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateStationDto extends PartialType(CreateStationDto) {}

export class CreateAppointmentDto {
  @IsDateString({}, { message: "La fecha de inicio no es válida." })
  startAt: string;

  @IsDateString({}, { message: "La fecha de fin no es válida." })
  endAt: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  stationId?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsIn([...APPOINTMENT_STATUSES])
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}

export class AppointmentRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
