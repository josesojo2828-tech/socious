"use client";

import React from 'react';
import { Ruler, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PatientDetail } from '@/types/nutringest/patient.interface';

interface Props {
  patient: PatientDetail;
}

export const PatientFichaAnthropometry = ({ patient }: Props) => {
  const measurements = patient.anthropometrics || [];

  const getWeightChange = (current: number, prev?: number) => {
    if (!prev) return null;
    const diff = current - prev;
    return {
      val: Math.abs(diff).toFixed(1),
      dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
    };
  };

  const getBmiBadgeClass = (bmi: number | null | undefined): string => {
    if (!bmi) return 'bg-base-200 text-base-content/70';
    const val = Number(bmi);
    if (val < 18.5) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
    if (val < 25.0) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
    if (val < 30.0) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
    return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
  };

  return (
    <div className="space-y-6">
      <div className="bg-base-100 border border-base-300 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-base-content flex items-center gap-2 mb-4">
          <Ruler className="text-emerald-600" size={20} />
          Historial Antropométrico
        </h3>

        {measurements.length === 0 ? (
          <div className="text-center py-12 text-base-content/50">
            No hay mediciones registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-base-200 text-base-content/70 font-semibold border-b border-base-300">
                <tr>
                  <th className="px-4 sm:px-6 py-4">Fecha</th>
                  <th className="px-4 sm:px-6 py-4">Peso (kg)</th>
                  <th className="px-4 sm:px-6 py-4">Altura (cm)</th>
                  <th className="px-4 sm:px-6 py-4">IMC</th>
                  <th className="px-4 sm:px-6 py-4">% Grasa</th>
                  <th className="px-4 sm:px-6 py-4">% Masa Muscular</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300/50">
                {measurements.map((item, index) => {
                  const prevItem = measurements[index + 1];
                  const change = getWeightChange(
                    Number(item.weight),
                    prevItem ? Number(prevItem.weight) : undefined
                  );

                  return (
                    <tr key={item.id} className="hover:bg-base-200/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-base-content">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base-content">{item.weight}</span>
                          {change && (
                            <span className="text-xs flex items-center text-base-content/70">
                              {change.dir === 'down' ? <TrendingDown size={12} /> : change.dir === 'up' ? <TrendingUp size={12} /> : <Minus size={12} />}
                              {change.val}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-base-content/70">{item.height || '-'}</td>
                      <td className="px-6 py-4 text-base-content/70">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getBmiBadgeClass(item.bmi)}`}>
                          {item.bmi ? Number(item.bmi).toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-base-content/70">
                        {item.fatPercentage ? `${Number(item.fatPercentage).toFixed(2)}%` : '-'}
                      </td>
                      <td className="px-6 py-4 text-base-content/70">
                        {item.muscleMass ? `${Number(item.muscleMass).toFixed(2)}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
