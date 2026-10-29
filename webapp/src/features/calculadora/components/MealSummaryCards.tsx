"use client";

import { Coffee, Croissant, Sun, Moon, Cookie, type LucideIcon } from "lucide-react";
import type { MealDistribution } from "./MealDistributionStep";
import {
  MEAL_MOMENTS,
  MEAL_MOMENTS_GRID_CLASS,
  type MealIconName,
  type MealKey,
} from "../lib/meal-moments";

export interface MealSummaryCardsProps {
  distribution: MealDistribution;
  foodGroups: { id: string; name: string; category: string; prot: number; carbs: number; fat: number; kcal: number }[];
  targetKcal: number;
  mealSplits: Record<MealKey, number>;
}

const MEAL_ICONS: Record<MealIconName, LucideIcon> = {
  coffee: Coffee,
  croissant: Croissant,
  sun: Sun,
  cookie: Cookie,
  moon: Moon,
};

export const MealSummaryCards = ({
  distribution,
  foodGroups,
  targetKcal,
  mealSplits,
}: MealSummaryCardsProps) => {
  const getMealMacros = (mealKey: keyof MealDistribution) => {
    let prot = 0;
    let carbs = 0;
    let fat = 0;
    let kcal = 0;

    for (const group of foodGroups) {
      const rations = distribution[mealKey]?.[group.id] || 0;
      prot += rations * group.prot;
      carbs += rations * group.carbs;
      fat += rations * group.fat;
      kcal += rations * group.kcal;
    }

    return { prot, carbs, fat, kcal };
  };

  const getAdequacyBadge = (actual: number, target: number) => {
    if (target <= 0) return { label: "Sin meta", color: "bg-base-200 text-base-content/60" };
    const diff = Math.abs((actual - target) / target) * 100;
    if (diff <= 5) return { label: "Óptimo", color: "bg-emerald-100 text-emerald-800" };
    if (diff <= 10) return { label: "Aceptable", color: "bg-amber-100 text-amber-800" };
    return { label: "Ajustar", color: "bg-red-100 text-red-800" };
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${MEAL_MOMENTS_GRID_CLASS} gap-4 notranslate`} translate="no">
      {MEAL_MOMENTS.map((meal) => {
        const macros = getMealMacros(meal.key);
        const pct = mealSplits[meal.key];
        const targetMealKcal = Math.round(targetKcal * (pct / 100));
        const badge = getAdequacyBadge(macros.kcal, targetMealKcal);
        const Icon = MEAL_ICONS[meal.icon];

        // Get groups assigned to this meal
        const assignedGroups = foodGroups.filter(
          (g) => (distribution[meal.key]?.[g.id] || 0) > 0
        );

        return (
          <div
            key={meal.key}
            className={`${meal.bg} border ${meal.border} rounded-2xl p-4 space-y-3`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${meal.color}`} />
                <span className={`font-bold text-sm ${meal.color}`}>{meal.label}</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}
              >
                {badge.label}
              </span>
            </div>

            <div className="text-center">
              <span className="text-2xl font-black text-base-content">{macros.kcal}</span>
              <span className="text-xs text-base-content/60 ml-1">kcal</span>
              <div className="text-[10px] text-base-content/60 mt-0.5">
                Meta: {targetMealKcal} kcal ({pct}%)
              </div>
            </div>

            <div className="flex justify-center gap-3 text-[11px] font-bold">
              <span className="text-primary">P: {Math.round(macros.prot)}g</span>
              <span className="text-sky-600">C: {Math.round(macros.carbs)}g</span>
              <span className="text-amber-600">G: {Math.round(macros.fat)}g</span>
            </div>

            {assignedGroups.length > 0 ? (
              <div key="assigned-groups-list" className="space-y-1">
                {assignedGroups.map((g) => {
                  const rations = distribution[meal.key]?.[g.id] || 0;
                  return (
                    <div
                      key={g.id}
                      className="flex justify-between items-center text-[10px] text-base-content/70 bg-base-100/60 rounded-lg px-2 py-1"
                    >
                      <span className="font-medium truncate">{g.name}</span>
                      <span className="font-bold ml-1 whitespace-nowrap">
                        {rations} ración{rations !== 1 ? "es" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p key="no-assigned-groups" className="text-[10px] text-base-content/60 text-center italic">
                Sin alimentos asignados
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
