'use me';
'use client';

import React, { useState } from 'react';
import { Droplet, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

interface HydrationModuleCardProps {
  weightKg: number;
}

export const HydrationModuleCard: React.FC<HydrationModuleCardProps> = ({ weightKg }) => {
  const w = weightKg > 0 ? weightKg : 70;

  const [dailyFluidLiters, setDailyFluidLiters] = useState<number>(2.5);
  const [hasDehydrationHistory, setHasDehydrationHistory] = useState<boolean>(false);
  const [hasCrampsHistory, setHasCrampsHistory] = useState<boolean>(false);
  const [usesDiuretics, setUsesDiuretics] = useState<boolean>(false);

  // Estimaciones del plan de hidratación Winder
  const preWorkoutMl = Math.round(w * 6); // 5-7 ml/kg en las 4h previas
  const intraWorkoutMlPerHour = Math.round(w * 8); // 400-800 ml/h orientativo
  const postWorkoutMlPerKgLost = Math.round(1.5 * 1000); // 1.5L por kg de peso perdido

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
            <Droplet className="h-5 w-5 text-cyan-600" /> Cuestionario & Evaluación de Hidratación Deportivo
          </h2>
          <p className="text-xs text-base-content/60 mt-1">
            Evaluación de hábitos hídricos, sintomatología y protocolo de reposición.
          </p>
        </div>
      </div>

      {/* Inputs de hábitos e historial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-base-300 bg-base-200 p-4">
          <label className="block text-xs font-bold uppercase text-base-content/70 mb-1">
            Consumo Diario (Litros)
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="10"
            value={dailyFluidLiters}
            onChange={(e) => setDailyFluidLiters(Number(e.target.value))}
            className="w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm font-bold text-base-content focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <p className="mt-1 text-[11px] text-base-content/60">Agua + Infusiones + Bebidas</p>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-200 p-4">
          <label className="block text-xs font-bold uppercase text-base-content/70 mb-1">
            Medicamentos / Diuréticos
          </label>
          <div className="flex items-center gap-4 mt-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-base-content/90 cursor-pointer">
              <input
                type="radio"
                name="diuretics"
                checked={usesDiuretics}
                onChange={() => setUsesDiuretics(true)}
                className="text-cyan-600 focus:ring-cyan-500"
              />
              Sí
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-base-content/90 cursor-pointer">
              <input
                type="radio"
                name="diuretics"
                checked={!usesDiuretics}
                onChange={() => setUsesDiuretics(false)}
                className="text-cyan-600 focus:ring-cyan-500"
              />
              No
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-200 p-4">
          <label className="block text-xs font-bold uppercase text-base-content/70 mb-1">
            Historial de Deshidratación
          </label>
          <div className="flex items-center gap-4 mt-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-base-content/90 cursor-pointer">
              <input
                type="radio"
                name="dehydration"
                checked={hasDehydrationHistory}
                onChange={() => setHasDehydrationHistory(true)}
                className="text-cyan-600 focus:ring-cyan-500"
              />
              Sí
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-base-content/90 cursor-pointer">
              <input
                type="radio"
                name="dehydration"
                checked={!hasDehydrationHistory}
                onChange={() => setHasDehydrationHistory(false)}
                className="text-cyan-600 focus:ring-cyan-500"
              />
              No
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-200 p-4">
          <label className="block text-xs font-bold uppercase text-base-content/70 mb-1">
            Calambres por Calor / Ejercicio
          </label>
          <div className="flex items-center gap-4 mt-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-base-content/90 cursor-pointer">
              <input
                type="radio"
                name="cramps"
                checked={hasCrampsHistory}
                onChange={() => setHasCrampsHistory(true)}
                className="text-cyan-600 focus:ring-cyan-500"
              />
              Sí
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-base-content/90 cursor-pointer">
              <input
                type="radio"
                name="cramps"
                checked={!hasCrampsHistory}
                onChange={() => setHasCrampsHistory(false)}
                className="text-cyan-600 focus:ring-cyan-500"
              />
              No
            </label>
          </div>
        </div>
      </div>

      {/* Alerta en caso de riesgo */}
      {(hasDehydrationHistory || hasCrampsHistory || usesDiuretics) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Factores de Riesgo Hídrico Detectados:</p>
            <p className="mt-0.5 text-amber-800">
              Se sugiere realizar prueba de tasa de sudoración en campo (pesaje pre/post entrenamiento) y añadir electrólitos (300-600 mg de Sodio/litro de agua).
            </p>
          </div>
        </div>
      )}

      {/* Protocolo Recomendado de Reposición */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/60 mb-3">
          Protocolo Personalizado de Hidratación (Peso Atleta: {w} kg)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
            <span className="text-xs font-bold uppercase text-cyan-900 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-600" /> Pre-Entrenamiento
            </span>
            <p className="mt-2 text-2xl font-black text-cyan-900">
              {preWorkoutMl} <span className="text-sm font-semibold">ml</span>
            </p>
            <p className="mt-1 text-xs text-cyan-800 font-medium">
              5–7 ml/kg en las 4 horas previas al inicio de la sesión.
            </p>
          </div>

          <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
            <span className="text-xs font-bold uppercase text-cyan-900 flex items-center gap-1.5">
              <Droplet className="h-4 w-4 text-cyan-600" /> Intra-Entrenamiento
            </span>
            <p className="mt-2 text-2xl font-black text-cyan-900">
              {intraWorkoutMlPerHour} <span className="text-sm font-semibold">ml/hora</span>
            </p>
            <p className="mt-1 text-xs text-cyan-800 font-medium">
              Sorbo regular cada 15-20 minutos (400-800 ml/h según ambiente).
            </p>
          </div>

          <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
            <span className="text-xs font-bold uppercase text-cyan-900 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-cyan-600" /> Post-Entrenamiento
            </span>
            <p className="mt-2 text-2xl font-black text-cyan-900">
              150% <span className="text-sm font-semibold">del peso perdido</span>
            </p>
            <p className="mt-1 text-xs text-cyan-800 font-medium">
              ~1.5 Litros de fluido con Sodio por cada kg de peso corporal perdido.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
