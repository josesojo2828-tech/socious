import { Prisma } from "@prisma/client";

// --- PRISMA TYPES ---
export type EXCHANGE_LIST_WHERE = Prisma.FoodExchangeListWhereInput;
export type EXCHANGE_LIST_WHERE_UNIQUE =
  Prisma.FoodExchangeListWhereUniqueInput;
export type EXCHANGE_LIST_CREATE = Prisma.FoodExchangeListCreateInput;
export type EXCHANGE_LIST_UPDATE = Prisma.FoodExchangeListUpdateInput;
export type EXCHANGE_LIST_WITH_ID = { id: string };
export type EXCHANGE_LIST_INCLUDE = Prisma.FoodExchangeListInclude;
export type EXCHANGE_LIST_ORDER =
  Prisma.FoodExchangeListOrderByWithRelationInput;

// --- FRONTEND / API DTOs ---
export interface ICreateExchangeListDto {
  name: string; // Ej: "Cereales"
  category?: string; // Ej: "Carbohidratos"
  sub?: string; // Ej: "Bajos en grasa"
  unity?: string; // Ej: "1/2 Taza"
  calories?: number; // Ej: 70
}

export interface IUpdateExchangeListDto
  extends Partial<ICreateExchangeListDto> {}
