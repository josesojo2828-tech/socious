import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  CategorizedFoodMetrics,
  FoodDatabaseMetrics,
  GetExchangeMetricsParams,
  GetFoodMetricsParams,
} from "../dto/food-metrics";
import { PrismaService } from "nestjs-prisma";
import { normalizeSearchText } from "src/shared/helpers/search-text.util";

@Injectable()
export class FoodMetricsService {
  constructor(private prisma: PrismaService) { }

  async getDashboardMetrics(
    params: GetFoodMetricsParams = {},
  ): Promise<FoodDatabaseMetrics> {
    const { includeInactive = false, searchQuery } = params;

    const baseFilter: Prisma.FoodItemWhereInput = {
      isActive: includeInactive ? undefined : true,
      ...(searchQuery && {
        name: { contains: searchQuery, mode: "insensitive" },
      }),
    };

    // Usamos $transaction para hacer todas las consultas en paralelo
    const [
      totalFoods,
      systemFoods,
      userFoods,
      zeroCaloriesFoods,
      foodsWithFiber,
      foodsWithSodium,
      foodsWithIron,
      aggregates,
      // Distribución por Rangos Calóricos (Ya que no hay categorías)
      lowCalFoods, // < 50 kcal (Vegetales, liquidos)
      midCalFoods, // 50 - 200 kcal (Frutas, carnes magras, cereales cocidos)
      highCalFoods, // > 200 kcal (Grasas, procesados, frutos secos)
    ] = await this.prisma.$transaction([
      // 1. KPIs Generales
      this.prisma.foodItem.count({ where: baseFilter }),
      this.prisma.foodItem.count({
        where: { ...baseFilter, createdById: null },
      }),
      this.prisma.foodItem.count({
        where: { ...baseFilter, createdById: { not: null } },
      }),

      // 2. Por Revisar: Alimentos con 0 calorías (sospechoso)
      this.prisma.foodItem.count({
        where: { ...baseFilter, calories: { equals: 0 } },
      }),

      // 3. Calidad de Datos (> 0 significa que fue registrado)
      this.prisma.foodItem.count({
        where: { ...baseFilter, fiberTotal: { gt: 0 } },
      }),
      this.prisma.foodItem.count({
        where: { ...baseFilter, sodium: { gt: 0 } },
      }),
      this.prisma.foodItem.count({ where: { ...baseFilter, iron: { gt: 0 } } }),

      // 4. Promedios
      this.prisma.foodItem.aggregate({
        where: baseFilter,
        _avg: {
          calories: true,
          proteins: true,
          carbohydrates: true,
          fats: true,
        },
      }),

      // 5. Distribución Calórica (NUEVO)
      this.prisma.foodItem.count({
        where: { ...baseFilter, calories: { lt: 50 } },
      }),
      this.prisma.foodItem.count({
        where: { ...baseFilter, calories: { gte: 50, lt: 200 } },
      }),
      this.prisma.foodItem.count({
        where: { ...baseFilter, calories: { gte: 200 } },
      }),
    ]);

    const safeTotal = totalFoods > 0 ? totalFoods : 1;

    return {
      overview: {
        totalFoods,
        systemFoods,
        userFoods,
        needsReview: zeroCaloriesFoods,
      },
      dataQuality: {
        fiberCompletion: Math.round((foodsWithFiber / safeTotal) * 100),
        sodiumCompletion: Math.round((foodsWithSodium / safeTotal) * 100),
        ironCompletion: Math.round((foodsWithIron / safeTotal) * 100),
      },
      averages: {
        avgCalories: Math.round(Number(aggregates._avg.calories || 0)),
        avgProtein: Number(Number(aggregates._avg.proteins || 0).toFixed(1)),
        avgCarbs: Number(Number(aggregates._avg.carbohydrates || 0).toFixed(1)),
        avgFats: Number(Number(aggregates._avg.fats || 0).toFixed(1)),
      },
      // Devolvemos una distribución que el gráfico del Frontend pueda entender
      distribution: [
        {
          name: "Baja Densidad (<50kcal)",
          count: lowCalFoods,
          color: "bg-green-500",
        },
        {
          name: "Media Densidad (50-200)",
          count: midCalFoods,
          color: "bg-emerald-500",
        },
        {
          name: "Alta Densidad (>200kcal)",
          count: highCalFoods,
          color: "bg-orange-500",
        },
      ].filter((d) => d.count > 0), // Solo mostramos lo que tenga datos
    };
  }

  async getDashboardExchangeMetrics(
    params: GetExchangeMetricsParams = {},
  ): Promise<CategorizedFoodMetrics> {
    const { searchQuery } = params;

    // Filtro base (opcional si hay búsqueda).
    //
    // Tiene que pasar por `searchText`, la única columna que ya guarda
    // name + category + sub plegados. Un `contains` sobre `name` o `category`
    // crudos no puede plegar el lado guardado, así que "corazon" no encontraba
    // "Corazón de alcachofa" — y plegar solo la consulta tampoco lo arregla.
    // Mismo normalizador que usa la lista de intercambios para esta misma tabla.
    const baseFilter: Prisma.FoodExchangeListWhereInput = searchQuery
      ? {
        searchText: {
          contains: normalizeSearchText(searchQuery),
          mode: "insensitive",
        },
      }
      : {};

    // ----------------------------------------------------------------------
    // 3. CONSULTAS PRISMA (Agrupación y Agregación)
    // ----------------------------------------------------------------------

    // Usamos Promise.all porque groupBy no siempre soporta $transaction dependiendo del driver,
    // pero idealmente se usa $transaction si es postgres puro.
    const [totalCount, caloriesAggregate, categoryGroups, subCategoryGroups] =
      await Promise.all([
        // 1. Total de ítems
        this.prisma.foodExchangeList.count({ where: baseFilter }),

        // 2. Promedio de Calorías
        this.prisma.foodExchangeList.aggregate({
          where: baseFilter,
          _avg: { calories: true },
        }),

        // 3. Distribución por Categoría (Para los gráficos)
        this.prisma.foodExchangeList.groupBy({
          by: ["category"],
          where: { ...baseFilter, category: { not: null } },
          _count: { category: true },
          orderBy: { _count: { category: "desc" } },
        }),

        // 4. Conteo de Subcategorías únicas
        // Prisma no tiene 'count distinct' directo fácil, así que agrupamos y contamos el array
        this.prisma.foodExchangeList.groupBy({
          by: ["sub"],
          where: { ...baseFilter, sub: { not: null } },
        }),
      ]);

    // ----------------------------------------------------------------------
    // 4. MAPEO DE DATOS
    // ----------------------------------------------------------------------

    return {
      overview: {
        totalItems: totalCount,
        totalCategories: categoryGroups.length,
        totalSubCategories: subCategoryGroups.length,
      },
      averages: {
        // Convertir Decimal a Number y redondear
        avgCalories: Math.round(Number(caloriesAggregate._avg.calories || 0)),
      },
      distribution: categoryGroups.map((group) => ({
        name: group.category || "Sin Categoría",
        count: group._count.category,
      })),
    };
  }
}
