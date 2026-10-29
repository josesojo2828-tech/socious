import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";

// --- PRISMA TYPES ---
export type LAB_WHERE = Prisma.LabResultWhereInput;
export type LAB_CREATE = Prisma.LabResultCreateInput;
export type LAB_UPDATE = Prisma.LabResultUpdateInput;
export type LAB_INCLUDE = Prisma.LabResultInclude;

// --- DTO: REGISTRAR EXAMEN ---
export class CreateLabResultDto {
  @ApiProperty({ description: "ID del Paciente" })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    description: "Nombre del examen",
    example: "Perfil Lipídico Completo",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Fecha de toma de muestra",
    example: "2023-10-20",
  })
  @IsDateString()
  @IsNotEmpty()
  date: string | Date;

  @ApiPropertyOptional({ description: "URL del archivo PDF adjunto" })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({
    description: "Datos estructurados extraídos",
    example: { cholesterol: 200, hdl: 45, ldl: 130 },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class UpdateLabResultDto extends CreateLabResultDto {}
