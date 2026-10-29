'use me';
'use client';

import React, { useState } from 'react';
import { Pill, Sparkles, CheckCircle2, Info, ChevronRight } from 'lucide-react';
import { round2 } from '../../../calculadora/lib/sport-calculation.engine';

interface ErgogenicSupplementsCardProps {
  weightKg: number;
}

interface SupplementDetail {
  id: string;
  name: string;
  category: string;
  evidence: string;
  calculateDose: (w: number) => { dose: string; timing: string; mechanism: string };
}

const SUPPLEMENTS: SupplementDetail[] = [
  {
    id: 'creatine',
    name: 'Creatina Monohidratada',
    category: 'Fuerza / Potencia / Resíntesis ATP',
    evidence: 'AIS Categoría A (Máxima evidencia)',
    calculateDose: (w) => ({
      dose: `Carga: ${round2(w * 0.3)} g/día (5-7 días) | Mantención: ${round2(w * 0.06)} g/día`,
      timing: 'Post-entrenamiento con 30-50g de carbohidratos para acelerar transporte vía insulina.',
      mechanism: 'Aumento de fosfocreatina intramuscular (+10-20%), resíntesis rápida de ATP en esfuerzos explosivos.',
    }),
  },
  {
    id: 'caffeine',
    name: 'Cafeína Anhidra',
    category: 'Rendimiento SNC / Resistencia',
    evidence: 'AIS Categoría A',
    calculateDose: (w) => ({
      dose: `${round2(w * 3)} mg – ${round2(w * 6)} mg total`,
      timing: '45 – 60 minutos previos al entrenamiento o competencia.',
      mechanism: 'Antagonista de receptores de adenosina, reducción del RPE (esfuerzo percibido) y mayor reclutamiento de unidades motoras.',
    }),
  },
  {
    id: 'beta_alanine',
    name: 'Beta-Alanina',
    category: 'Tampón Intracelular / Resistencia Láctica',
    evidence: 'AIS Categoría A',
    calculateDose: (w) => ({
      dose: `${round2(w * 0.065)} g/día (~3.2g – 6.4g repartidos en 4 tomas)`,
      timing: 'Dividir en 4 tomas de 0.8-1.6g/día por 4 a 8 semanas.',
      mechanism: 'Aumento del 60-80% en carnosina muscular. Amortiguador de H+ en esfuerzos de alta intensidad (1-10 min).',
    }),
  },
  {
    id: 'nitrate',
    name: 'Nitrato Dietético / Jugo de Remolacha',
    category: 'Vasodilatación / Eficiencia O2',
    evidence: 'AIS Categoría A',
    calculateDose: (w) => ({
      dose: `${round2(w * 6.4)} mg – ${round2(w * 12.8)} mg NO3⁻ (~350–800 mg de Nitrato)`,
      timing: 'Consumir 2.5 a 3 horas antes de la prueba deportiva.',
      mechanism: 'Vasodilatación mediada por óxido nítrico (vía NO3-NO2-NO), reducción del costo de O2 a intensidad submáxima.',
    }),
  },
  {
    id: 'bicarbonate',
    name: 'Bicarbonato de Sodio',
    category: 'Amortiguador Extracelular / Esfuerzo Láctico',
    evidence: 'AIS Categoría A',
    calculateDose: (w) => ({
      dose: `${round2(w * 0.2)} g – ${round2(w * 0.3)} g de NaHCO3`,
      timing: 'Consumir 60 – 150 min antes con 1L de agua y pequeñas dosis de CHO.',
      mechanism: 'Amortiguador extracelular de H+, potencia el eflujo de lactato fuera del miocito en ejercicios lácticos intensos.',
    }),
  },
];

export const ErgogenicSupplementsCard: React.FC<ErgogenicSupplementsCardProps> = ({ weightKg }) => {
  const w = weightKg > 0 ? weightKg : 70;
  const [selectedSuppId, setSelectedSuppId] = useState<string>('creatine');

  const selectedSupp = SUPPLEMENTS.find((s) => s.id === selectedSuppId) || SUPPLEMENTS[0];
  const calculated = selectedSupp.calculateDose(w);

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
            <Pill className="h-5 w-5 text-indigo-600" /> Protocolos de Suplementación Ergogénica (Evidencia A - AIS)
          </h2>
          <p className="text-xs text-base-content/60 mt-1">
            Calculadora de dosificación basada en el peso del atleta ({w} kg) según la clasificación del Australian Institute of Sport.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Protocolo Winder
        </span>
      </div>

      {/* Tabs Selector de Suplemento */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-base-200 no-scrollbar">
        {SUPPLEMENTS.map((s) => {
          const isSelected = selectedSuppId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSuppId(s.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-base-200 text-base-content/70 hover:bg-base-300'
              }`}
            >
              {s.name}
              {isSelected && <ChevronRight className="h-3.5 w-3.5 text-white" />}
            </button>
          );
        })}
      </div>

      {/* Card del Suplemento Seleccionado */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-indigo-950 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-indigo-600" /> {selectedSupp.name}
            </h3>
            <p className="text-xs text-indigo-700 font-medium">{selectedSupp.category}</p>
          </div>
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-indigo-200/60 text-indigo-900 px-2.5 py-1 rounded-full w-fit">
            {selectedSupp.evidence}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-base-100 p-3.5 border border-indigo-100/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">Dosis Calculada</span>
            <p className="mt-1 text-sm font-bold text-indigo-900">{calculated.dose}</p>
          </div>

          <div className="rounded-lg bg-base-100 p-3.5 border border-indigo-100/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">Timing & Frecuencia</span>
            <p className="mt-1 text-xs font-semibold text-base-content/90">{calculated.timing}</p>
          </div>
        </div>

        <div className="rounded-lg bg-base-100 p-3.5 border border-indigo-100/80 shadow-sm flex items-start gap-2.5">
          <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">Mecanismo & Aplicación Clínica</span>
            <p className="mt-0.5 text-xs text-base-content/70 leading-relaxed">{calculated.mechanism}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
