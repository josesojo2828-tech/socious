import { Injectable } from "@nestjs/common";
import { PrismaService } from "nestjs-prisma";
import {
  CATEGORY_CONFIG,
  GetMenuMetricsParams,
  MenuDashboardMetrics,
} from "../dto/menu-metrics.type";
import { Prisma } from "@prisma/client";
import { MenuCategory } from "src/shared/types/schema.types";
import { patientsWhereNutritionistAccess } from "../../patient/helpers/can-access-patient";

@Injectable()
export class MenuMetricsService {
  constructor(private prisma: PrismaService) {}

  async getMenuMetrics(
    params: GetMenuMetricsParams = {},
  ): Promise<MenuDashboardMetrics> {
    const { nutritionistId, patientId, startDate, endDate } = params;

    // Filtro base: Opcionalmente por nutricionista, paciente y rango de fechas
    const baseFilter: Prisma.MenuWhereInput = {
      deletedAt: null, // Ignorar eliminados
      archivedAt: null, // Ignorar archivados
      ...(nutritionistId && { nutritionistId }),
      ...(patientId && {
        assignedToPlans: {
          some: {
            plan: {
              patientId: patientId,
              status: "ACTIVE",
            },
          },
        },
      }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    // Ejecutamos consultas en paralelo para velocidad
    const [totalMenus, aggregates, categoryGroups, assignedPatients] =
      await this.prisma.$transaction([
        // 1. Total de menús
        this.prisma.menu.count({ where: baseFilter }),

        // 2. Promedios de Macros (Usando los campos cacheados del modelo)
        this.prisma.menu.aggregate({
          where: baseFilter,
          _avg: {
            totalKcal: true,
            totalProtein: true,
            totalCarbs: true,
            totalFats: true,
          },
        }),

        // 3. Distribución por Categoría
        this.prisma.menu.groupBy({
          by: ["category"],
          where: baseFilter,
          _count: {
            category: true, // Cuenta cuántos hay de cada categoría
          },
          // CORRECCIÓN: Agregamos orderBy para satisfacer al compilador de TS
          orderBy: {
            _count: {
              category: "desc",
            },
          },
        }),

        // 4. Pacientes únicos con menús asignados en planes activos
        this.prisma.patient.count({
          where: {
            deletedAt: null,
            ...(patientId ? { id: patientId } : {}),
            ...patientsWhereNutritionistAccess(nutritionistId),
            plans: {
              some: {
                status: "ACTIVE",
                assignedMenus: {
                  some: {},
                },
              },
            },
          },
        }),
      ]);

    // --- PROCESAMIENTO DE DATOS ---

    // 1. Calcular Categoría Top
    // Ordenamos los grupos de mayor a menor count usando validación segura y casting
    const sortedCategories = [...categoryGroups].sort((a, b) => {
      // Cast explícito: aseguramos a TS que _count tiene la forma { category: number }
      // Esto evita el error "Property 'category' does not exist on type 'true'"
      const countA = (a._count as { category: number }).category ?? 0;
      const countB = (b._count as { category: number }).category ?? 0;
      return countB - countA;
    });

    const topCategoryKey =
      sortedCategories.length > 0 ? sortedCategories[0].category : null;
    const topCategoryLabel = topCategoryKey
      ? CATEGORY_CONFIG[topCategoryKey]?.label
      : "N/A";

    // 2. Formatear Distribución para el Gráfico
    const safeTotal = totalMenus > 0 ? totalMenus : 1;

    const distribution = categoryGroups.map((group) => {
      const config =
        CATEGORY_CONFIG[`${group.category}`] || CATEGORY_CONFIG.OTHER;

      // Cast explícito nuevamente para el mapeo
      const count = (group._count as { category: number }).category ?? 0;

      return {
        category: config.label,
        count: count,
        percentage: Math.round((count / safeTotal) * 100),
        color: config.color,
      };
    });

    // 3. Rellenar categorías vacías (opcional, para que el gráfico siempre tenga todas las keys)
    // Si prefieres solo mostrar las que tienen datos, comenta este bloque.
    Object.keys(CATEGORY_CONFIG).forEach((key) => {
      const catKey = key as MenuCategory;
      if (!categoryGroups.find((g) => g.category === catKey)) {
        // Si no existe en los resultados, lo añadimos con 0 si quieres estructura fija
        // distribution.push({ ... }) -> Omitido para mantenerlo limpio como en la imagen
      }
    });

    return {
      overview: {
        totalMenus,
        assignedPatients,
        topCategory: topCategoryLabel,
      },
      averages: {
        avgCalories: Math.round(Number(aggregates._avg.totalKcal || 0)),
        avgProtein: Number(
          Number(aggregates._avg.totalProtein || 0).toFixed(1),
        ),
        avgCarbs: Number(Number(aggregates._avg.totalCarbs || 0).toFixed(1)),
        avgFats: Number(Number(aggregates._avg.totalFats || 0).toFixed(1)),
      },
      distribution: distribution.sort((a, b) => b.count - a.count), // Ordenar mayor a menor
    };
  }
}
