import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AssignMenuToPatientDto {
  @ApiProperty({ description: "ID del Menú a asignar" })
  @IsUUID()
  @IsNotEmpty()
  menuId: string;

  @ApiPropertyOptional({
    description: "Momento de consumo (ej: Desayuno)",
    example: "Desayuno",
  })
  @IsOptional()
  @IsString()
  eatingMoment?: string;

  @ApiPropertyOptional({ description: "Notas específicas para el paciente" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignExchangeListToPatientDto {
  @ApiProperty({ description: "ID de la Lista de Intercambio" })
  @IsUUID()
  @IsNotEmpty()
  exchangeListId: string;

  @ApiProperty({ description: "Cantidad de porciones", example: 2 })
  @IsNumber()
  @Min(0.1)
  portions: number;

  @ApiPropertyOptional({ description: "Momento de consumo", example: "Cena" })
  @IsOptional()
  @IsString()
  eatingMoment?: string;
}
