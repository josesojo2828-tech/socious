import { Prisma } from "@prisma/client";

// --- PRISMA TYPES (FOOD ITEM) ---
export type FOOD_ITEM_WHERE = Prisma.FoodItemWhereInput;
export type FOOD_ITEM_WHERE_UNIQUE = Prisma.FoodItemWhereUniqueInput;
export type FOOD_ITEM_CREATE = Prisma.FoodItemCreateInput;
export type FOOD_ITEM_UPDATE = Prisma.FoodItemUpdateInput;
export type FOOD_ITEM_WITH_ID = { id: string };
export type FOOD_ITEM_INCLUDE = Prisma.FoodItemInclude;
export type FOOD_ITEM_ORDER = Prisma.FoodItemOrderByWithRelationInput;

// --- PRISMA TYPES (CATEGORY) ---
export type CATEGORY_WHERE = Prisma.FoodExchangeListWhereInput;
export type CATEGORY_CREATE = Prisma.FoodExchangeListCreateInput;

// --- DEFAULT INCLUDE ---
export const FOOD_ITEM_DEFAULT_INCLUDE: FOOD_ITEM_INCLUDE = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  },
  _count: {
    select: {
      menuItems: true,
    },
  },
};

// --- FRONTEND / API DTOs ---
export interface ICreateFoodDto {
  name: string;
  categoryId: string;
  brand?: string;

  // Base
  baseQuantity: number;

  // Macros
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;

  // Micronutrientes clave (opcionales)
  sodium?: number;
  fiberTotal?: number;
  sugar?: number;

  // Porciones (Array para crear relaciones en una sola transacción)
  portions?: {
    name: string; // ej: "Taza"
    gramWeight: number; // ej: 200
  }[];
}
