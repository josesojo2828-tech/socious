"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle, GripVertical } from "lucide-react";
import {
  MEAL_MOMENTS,
  emptyMealDistribution,
  mealKeys,
  type MealKey,
} from "../lib/meal-moments";

export type { MealKey } from "../lib/meal-moments";

export type MealDistribution = Record<MealKey, Record<string, number>>;

export interface MealDistributionStepProps {
  exchangeRations: Record<string, number>;
  foodGroups: { id: string; name: string; category: string }[];
  distribution: MealDistribution;
  onDistributionChange: (distribution: MealDistribution) => void;
}

export const MealDistributionStep = ({
  exchangeRations,
  foodGroups,
  distribution,
  onDistributionChange,
}: MealDistributionStepProps) => {
  // Auto-distribute evenly on mount / when exchangeRations change
  useEffect(() => {
    const updated: MealDistribution = emptyMealDistribution();
    const keys = mealKeys();

    for (const group of foodGroups) {
      const total = exchangeRations[group.id] || 0;
      if (total <= 0) {
        for (const mk of keys) updated[mk][group.id] = 0;
        continue;
      }

      // Check if current distribution is valid for this group
      const currentSum = keys.reduce(
        (acc, mk) => acc + (distribution[mk]?.[group.id] || 0),
        0
      );

      if (currentSum === total) {
        // Preserve existing valid distribution
        for (const mk of keys) {
          updated[mk][group.id] = distribution[mk]?.[group.id] || 0;
        }
      } else {
        // Auto-distribute evenly (round to 0.5 increments)
        const base = Math.floor(total / MEAL_MOMENTS.length / 0.5) * 0.5;
        const remainder = total - base * MEAL_MOMENTS.length;
        for (let i = 0; i < keys.length; i++) {
          updated[keys[i]][group.id] = +(base + (i < remainder / 0.5 ? 0.5 : 0)).toFixed(1);
        }
      }
    }

    onDistributionChange(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchangeRations]);

  const handleRationChange = (
    mealKey: keyof MealDistribution,
    groupId: string,
    delta: number
  ) => {
    const current = distribution[mealKey]?.[groupId] || 0;
    const newVal = Math.max(0, +(current + delta).toFixed(1));
    onDistributionChange({
      ...distribution,
      [mealKey]: { ...distribution[mealKey], [groupId]: newVal },
    });
  };

  const handleDirectInput = (
    mealKey: keyof MealDistribution,
    groupId: string,
    raw: string
  ) => {
    const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, "");
    const val = cleaned === "" ? 0 : Math.max(0, parseFloat(cleaned) || 0);
    onDistributionChange({
      ...distribution,
      [mealKey]: { ...distribution[mealKey], [groupId]: val },
    });
  };

  const activeGroups = foodGroups.filter((g) => (exchangeRations[g.id] || 0) > 0);

  return (
    <div className="space-y-4 notranslate" translate="no">
      <div>
        <h3 className="font-display text-lg sm:text-xl font-bold text-base-content flex items-center gap-2">
          <GripVertical className="text-primary w-5 h-5" />
          5. Distribuir Raciones por Tiempo de Comida
        </h3>
        <p className="text-xs text-base-content/60 mt-1">
          Asigná cuántas raciones de cada grupo consumís en cada comida.
        </p>
      </div>

      {activeGroups.length === 0 ? (
        <div key="no-active-groups" className="text-center py-8 text-base-content/60 text-sm">
          No hay raciones asignadas. Completá el paso anterior primero.
        </div>
      ) : (
        <div key="active-groups-table" className="overflow-x-auto rounded-2xl border border-base-300">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-base-200 text-base-content/60 font-bold border-b border-base-300">
                <th className="p-3">Grupo</th>
                {MEAL_MOMENTS.map((m) => (
                  <th key={m.key} className={`p-3 text-center ${m.color}`}>
                    {m.label}
                  </th>
                ))}
                <th className="p-3 text-center">Total</th>
                <th className="p-3 text-center w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-300 text-base-content/80">
              {activeGroups.map((group) => {
                const total = exchangeRations[group.id] || 0;
                const distributed = MEAL_MOMENTS.reduce(
                  (acc, m) => acc + (distribution[m.key]?.[group.id] || 0),
                  0
                );
                const isValid = Math.abs(distributed - total) < 0.01;

                return (
                  <tr key={group.id} className="hover:bg-base-200/80 transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-base-content block">{group.name}</span>
                      <span className="text-[10px] text-base-content/60 font-semibold">
                        {group.category}
                      </span>
                    </td>
                    {MEAL_MOMENTS.map((m) => {
                      const val = distribution[m.key]?.[group.id] || 0;
                      return (
                        <td key={m.key} className="p-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRationChange(m.key, group.id, -0.5)}
                              className="w-6 h-6 rounded-lg bg-base-200 hover:bg-base-300 text-base-content/80 font-bold flex items-center justify-center transition-all cursor-pointer text-xs"
                            >
                              -
                            </button>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={val === 0 ? "" : String(val)}
                              onChange={(e) =>
                                handleDirectInput(m.key, group.id, e.target.value)
                              }
                              className="w-12 text-center bg-base-200 border border-base-300 rounded-lg py-1 font-bold text-base-content text-xs focus:bg-base-100 focus:border-primary outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRationChange(m.key, group.id, 0.5)}
                              className="w-6 h-6 rounded-lg bg-base-200 hover:bg-base-300 text-base-content/80 font-bold flex items-center justify-center transition-all cursor-pointer text-xs"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-3 text-center">
                      <span
                        className={`font-bold text-sm ${
                          isValid ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {distributed.toFixed(1)}
                      </span>
                      <span className="text-base-content/60 text-[10px] ml-1">
                        / {total}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {isValid ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 inline" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 inline" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeGroups.length > 0 && (
        <p className="text-[11px] text-base-content/60">
          Cada fila debe sumar el total de raciones del grupo. Los{" "}
          <span className="text-emerald-600 font-bold">valores correctos</span> se
          marcan en verde.
        </p>
      )}
    </div>
  );
};
