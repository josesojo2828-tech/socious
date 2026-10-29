"use client";

import { Activity, Calculator, CheckCircle2, FileSpreadsheet, ShieldCheck, Zap } from "lucide-react";

export const ExcelPrescripcionResource = () => {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 py-4">
      {/* Contenedor de la Ficha Clínica Interactiva */}
      <div className="w-full relative bg-white rounded-[2.5rem] border border-black/5 shadow-2xl overflow-hidden p-6 sm:p-10">
        {/* Header con Marca Institucional */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Plantilla Interactiva • .XLSX
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Prescripción Energética & Deporte
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-75">
            <ShieldCheck size={18} className="text-emerald-600" />
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Nutringest Official
            </span>
          </div>
        </div>

        {/* Módulos de Cálculo Incluidos */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
              <Calculator size={16} />
              <span>Tasa Metabólica Basal</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Fórmulas automatizadas: Harris-Benedict, Cunningham, Katch-McArdle y Mifflin-St Jeor.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
              <Zap size={16} />
              <span>Disponibilidad Energética</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Cálculo directo de EA (Energy Availability = (EI - EEE) / FFM) para prevención de la Tríada de la Atleta.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">
              <Activity size={16} />
              <span>Periodización Macro</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Distribución de carbohidratos (3-12 g/kg/día) según volumen de entrenamiento diario.
            </p>
          </div>
        </div>

        {/* Vista previa de la estructura de hojas de cálculo */}
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider">Estructura de la Plantilla Excel (.XLSX)</span>
            <span className="text-[10px] font-bold text-emerald-400">Automatizada con Fórmulas</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs text-slate-700">
            <div className="p-3.5 flex items-center justify-between font-bold bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Hoja 1: Evaluación Inicial & Calorimetría Estimada</span>
              </div>
              <span className="text-slate-500 font-medium">Ingreso de Antropometría</span>
            </div>

            <div className="p-3.5 flex items-center justify-between font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Hoja 2: Gasto Energético por Actividad (METs)</span>
              </div>
              <span className="text-slate-500 font-medium">Compendio de Actividades Físicas</span>
            </div>

            <div className="p-3.5 flex items-center justify-between font-bold bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Hoja 3: Distribución de Carbohidratos & Proteínas</span>
              </div>
              <span className="text-slate-500 font-medium">Timing Nutricional (Pre/Durante/Post)</span>
            </div>

            <div className="p-3.5 flex items-center justify-between font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Hoja 4: Estrategias de Hidratación & Tasa de Sudoración</span>
              </div>
              <span className="text-slate-500 font-medium">Reemplazo Electrolítico</span>
            </div>
          </div>
        </div>

        {/* Footer Informativo */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <span>Material Didáctico Exclusivo para la Práctica Nutricional Clínica</span>
          <span className="font-extrabold text-slate-900">Campus Nutringest © 2026</span>
        </div>
      </div>
    </div>
  );
};
