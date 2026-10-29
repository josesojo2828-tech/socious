import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsUUID,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";

export type SHOPPING_WHERE = Prisma.ShoppingListWhereInput;
export type SHOPPING_CREATE = Prisma.ShoppingListCreateInput;
export type SHOPPING_INCLUDE = Prisma.ShoppingListInclude;

// --- DEFAULT INCLUDE ---
export const SHOPPING_DEFAULT_INCLUDE: SHOPPING_INCLUDE = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
};

export class CreateShoppingListDto {
  @ApiProperty({ description: "ID del Paciente" })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    description: "Nombre de la lista",
    example: "Compras Semana 1",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Items consolidados (JSON)",
    example: { Avena: "500g", Huevos: "12un" },
  })
  @IsObject()
  @IsNotEmpty()
  items: Record<string, string>;
}
