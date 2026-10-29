'use client';

import React, { useState } from 'react';
import { Milk, Sparkles, Clock, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { calculateInfantFormulaRequirements } from '../lib/infant-formula.engine';

interface InfantFormulaCalculatorCardProps {
  weightKg?: number;
  ageYears?: number;
}

export const InfantFormulaCalculatorCard: React.FC<InfantFormulaCalculatorCardProps> = ({
  weightKg = 5.0,
  ageYears = 0.2,
}) => {
  const currentWeight = weightKg > 0 ? weightKg : 5.0;
  const ageMonths = ageYears > 0 ? Math.round(ageYears * 12) : 2;
  const [isBreastfed, setIsBreastfed] = useState<boolean>(false);

  const calc = calculateInfantFormulaRequirements({
    weightKg: currentWeight,
    ageMonths,
    isBreastfed,
  });

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
            <Milk className="h-5 w-5 text-sky-600" /> Prescripción & Dosificación de Fórmulas Lácteas
          </h2>
          <p className="text-xs text-base-content/60 mt-1">
            Cálculo de volumen total, capacidad gástrica funcional y tomas diarias.
          </p>
        </div>
      </div>

      {/* Resumen de Datos del Paciente Sincronizados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-base-300 bg-base-200 p-3.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-base-content/60">
            Peso del Lactante
          </span>
          <p className="text-lg font-black text-base-content mt-0.5">
            {currentWeight} <span className="text-xs font-semibold text-base-content/60">kg</span>
          </p>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-200 p-3.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-base-content/60">
            Edad Calculada
          </span>
          <p className="text-lg font-black text-base-content mt-0.5">
            {ageMonths} <span className="text-xs font-semibold text-base-content/60">meses ({ageYears} años)</span>
          </p>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-200 p-3.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-base-content/60 mb-1">
            Tipo de Lactancia
          </span>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1 text-xs text-base-content/90 cursor-pointer">
              <input
                type="radio"
                name="breastfed"
                checked={!isBreastfed}
                onChange={() => setIsBreastfed(false)}
                className="text-sky-600 focus:ring-sky-500"
              />
              Fórmula
            </label>
            <label className="inline-flex items-center gap-1 text-xs text-base-content/90 cursor-pointer">
              <input
                type="radio"
                name="breastfed"
                checked={isBreastfed}
                onChange={() => setIsBreastfed(true)}
                className="text-sky-600 focus:ring-sky-500"
              />
              Materna Exclusiva
            </label>
          </div>
        </div>
      </div>

      {/* Resultados de Prescripción */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Capacidad Gástrica */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-sky-600" /> Capacidad Gástrica
          </span>
          <p className="mt-2 text-2xl font-black text-sky-950">
            {calc.gastricCapacityMl} <span className="text-sm font-semibold">ml</span>
          </p>
          <p className="mt-1 text-xs text-sky-700 font-medium">
            ≈ {calc.gastricCapacityOz} oz por toma (Fórmula Peso × 30)
          </p>
        </div>

        {/* Volumen Total Diario */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
            <Milk className="h-4 w-4 text-sky-600" /> Volumen Diario
          </span>
          <p className="mt-2 text-2xl font-black text-sky-950">
            {calc.totalDailyVolumeMlMin} – {calc.totalDailyVolumeMlMax} <span className="text-sm font-semibold">ml</span>
          </p>
          <p className="mt-1 text-xs text-sky-700 font-medium">
            (150–160 ml por kg/día)
          </p>
        </div>

        {/* Tomas Recomendadas */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-emerald-600" /> Tomas / Frecuencia
          </span>
          <p className="mt-2 text-2xl font-black text-emerald-950">
            {calc.suggestedFeedingsCount} <span className="text-sm font-semibold">tomas/día</span>
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">
            Cada {calc.feedingFrequencyHours}
          </p>
        </div>

        {/* Dosificación por Toma */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-amber-600" /> Por Toma
          </span>
          <p className="mt-2 text-2xl font-black text-amber-950">
            {calc.suggestedVolumePerFeedingMl} <span className="text-sm font-semibold">ml</span>
          </p>
          <p className="mt-1 text-xs text-amber-800 font-medium">
            ≈ {calc.suggestedVolumePerFeedingOz} oz ({calc.powderScoopsPerFeeding} medidas de polvo)
          </p>
        </div>
      </div>

      {/* Nota clínica de preparación */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4 text-xs text-base-content/90 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-base-content">Regla de Preparación Recomendada:</p>
          <p className="mt-0.5 text-base-content/70 leading-relaxed">
            Mezclar <b>1 medida al ras</b> de fórmula en polvo por cada <b>1 onza (30 ml)</b> de agua previamente hervida y tibia.
            {isBreastfed && ' Nota: En lactancia materna exclusiva el amamantamiento es a libre demanda (cada 2 a 3 horas).'}
          </p>
        </div>
      </div>
    </div>
  );
};
