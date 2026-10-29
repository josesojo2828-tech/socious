'use me';
'use client';

import React, { useState } from 'react';
import { Target, Zap, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  calculatePeriodizedMacros,
  TrainingLoadLevel,
} from '../lib/sports-history.engine';

interface PeriodizedMacrosCardProps {
  weightKg: number;
}

const LOAD_OPTIONS: { id: TrainingLoadLevel; label: string; desc: string; badgeCls: string }[] = [
  {
    id: 'LOW',
    label: 'Carga Baja / Lesión',
    desc: '< 1 hora/día de entrenamiento',
    badgeCls: 'bg-base-200 text-base-content/90 border-base-300',
  },
  {
    id: 'MODERATE',
    label: 'Carga Moderada',
    desc: '1 – 2 horas/día de entrenamiento',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'HIGH',
    label: 'Carga Alta / Pre-competición',
    desc: '2 – 3 horas/día de entrenamiento',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'EXTREME',
    label: 'Carga Extrema / Ultradistancia',
    desc: '> 4 horas/día de entrenamiento',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'CUT',
    label: 'Déficit Calórico Estructurado',
    desc: 'Pérdida de grasa / Protección muscular',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
  },
];

export const PeriodizedMacrosCard: React.FC<PeriodizedMacrosCardProps> = ({ weightKg }) => {
  const [selectedLoad, setSelectedLoad] = useState<TrainingLoadLevel>('MODERATE');

  const w = weightKg > 0 ? weightKg : 70;
  const macros = calculatePeriodizedMacros({ weightKg: w, loadLevel: selectedLoad });

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" /> Prescripción Periodizada de Macronutrientes
          </h2>
          <p className="text-xs text-base-content/60 mt-1">
            Dosificación periodizada basada en gramos por kilogramo de peso corporal ({w} kg).
          </p>
        </div>
      </div>

      {/* Selector de Carga */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-base-content/60 mb-3">
          Fase de Carga Deportiva Actual
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOAD_OPTIONS.map((opt) => {
            const isSelected = selectedLoad === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedLoad(opt.id)}
                className={`flex flex-col text-left p-3.5 rounded-xl border text-xs transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-base-300 bg-base-200/50 hover:bg-base-200 hover:border-base-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-base-content">{opt.label}</span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </div>
                <span className="text-[11px] text-base-content/60">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rango Recomendado de Macronutrientes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Carbohidratos */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-blue-900 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-600" /> Carbohidratos (CHO)
            </span>
            <span className="text-[10px] font-semibold bg-blue-200/60 text-blue-800 px-2 py-0.5 rounded-full">
              Energía
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-blue-900">
            {macros.carbsGramsMin} – {macros.carbsGramsMax} <span className="text-sm font-semibold">g/día</span>
          </p>
          <p className="mt-1 text-xs text-blue-700 font-medium">
            Rango: {selectedLoad === 'CUT' ? '3.5 - 5.0' : selectedLoad === 'LOW' ? '3.0 - 5.0' : selectedLoad === 'MODERATE' ? '5.0 - 7.0' : selectedLoad === 'HIGH' ? '6.0 - 10.0' : '8.0 - 12.0'} g/kg/día
          </p>
        </div>

        {/* Proteínas */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-900 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-emerald-600" /> Proteínas (PRO)
            </span>
            <span className="text-[10px] font-semibold bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full">
              Síntesis mTORC1
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">
            {macros.proteinGramsMin} – {macros.proteinGramsMax} <span className="text-sm font-semibold">g/día</span>
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">
            Rango: {selectedLoad === 'CUT' ? '2.2 - 2.8' : selectedLoad === 'LOW' ? '1.6 - 2.0' : '1.6 - 2.2'} g/kg/día
          </p>
        </div>

        {/* Grasas */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-amber-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-600" /> Grasas Saludables
            </span>
            <span className="text-[10px] font-semibold bg-amber-200/60 text-amber-800 px-2 py-0.5 rounded-full">
              Hormonal
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900">
            {macros.fatGramsMin} – {macros.fatGramsMax} <span className="text-sm font-semibold">g/día</span>
          </p>
          <p className="mt-1 text-xs text-amber-700 font-medium">
            Rango: {selectedLoad === 'CUT' ? '0.6 - 0.8' : '1.0 - 1.2'} g/kg/día
          </p>
        </div>
      </div>

      {/* Sinergia Peri-prandial & Umbral de Leucina */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4 text-xs text-base-content/90 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-base-content">Sinergia Peri-prandial & Umbral de Leucina:</p>
          <p className="mt-0.5 text-base-content/70">
            Distribuir la proteína en <b>3 a 5 tomas diarias</b> de <b>{macros.leucineTargetGrams}</b>.
            Cada ingesta estimula al máximo la síntesis proteica muscular (MPS) vía mTORC1.
          </p>
        </div>
      </div>
    </div>
  );
};
