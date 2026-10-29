"use client";

import { Award, BookOpen, CheckCircle, ChevronRight, FileSpreadsheet, Layers, ShieldCheck, UserCheck } from "lucide-react";

export const MasterclassAntropometriaResource = () => {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 py-4">
      {/* Contenedor de la Ficha Clínica Interactiva */}
      <div className="w-full relative bg-white rounded-[2.5rem] border border-black/5 shadow-2xl overflow-hidden p-6 sm:p-10">
        {/* Header con Marca Institucional */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <Layers size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                Herramienta Clínica Pro • ISAK 1
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Antropometría & Somatocarta Pro
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

        {/* Resumen del Contenido Técnico */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
              <UserCheck size={16} />
              <span>Marcaje Puntos Anatomicos</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Guía paso a paso para la localización exacta del Acromiale, Radiale, Iliospinale y Subscapulare.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
              <CheckCircle size={16} />
              <span>Fórmulas de Fraccionamiento</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Modelos de 4 y 5 componentes: Durnin-Womersley, Jackson-Pollock y ecuación de Kerr.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">
              <Award size={16} />
              <span>Graficación en Somatocarta</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Cálculo automatizado de coordenadas X e Y (Endomorfia, Mesomorfia, Ectomorfia).
            </p>
          </div>
        </div>

        {/* Tabla de Referencia de Pliegues Anatómicos */}
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider">Protocolo de Medición de Pliegues (ISAK 1)</span>
            <span className="text-[10px] font-bold text-slate-400">Técnica de Caliper</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs text-slate-700">
            <div className="p-3.5 flex items-center justify-between font-bold bg-slate-50/50">
              <span>Tríceps</span>
              <span className="text-slate-500 font-medium">Línea media entre Acromiale y Radiale</span>
            </div>
            <div className="p-3.5 flex items-center justify-between font-bold">
              <span>Subescapular</span>
              <span className="text-slate-500 font-medium">1 cm por debajo del ángulo inferior de la escápula</span>
            </div>
            <div className="p-3.5 flex items-center justify-between font-bold bg-slate-50/50">
              <span>Bíceps</span>
              <span className="text-slate-500 font-medium">Aspecto anterior del brazo a la misma altura del tríceps</span>
            </div>
            <div className="p-3.5 flex items-center justify-between font-bold">
              <span>Suprailíaco</span>
              <span className="text-slate-500 font-medium">Pliegue oblicuo a nivel de la cresta ilíaca</span>
            </div>
            <div className="p-3.5 flex items-center justify-between font-bold bg-slate-50/50">
              <span>Abdominal</span>
              <span className="text-slate-500 font-medium">Pliegue vertical a 5 cm del ombligo</span>
            </div>
            <div className="p-3.5 flex items-center justify-between font-bold">
              <span>Muslo Frontal</span>
              <span className="text-slate-500 font-medium">Punto medio entre pliegue inguinal y patela</span>
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
