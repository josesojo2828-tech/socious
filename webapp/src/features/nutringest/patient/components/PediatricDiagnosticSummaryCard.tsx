'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, AlertOctagon, Info, FileText, Layers, Stethoscope, Dumbbell } from 'lucide-react';
import {
  evaluatePediatricDiagnosis,
  evaluateCombinedPediatricDiagnosis,
  mapZoneToTriaxialZone,
  computeTriaxialIndices,
  type TriaxialZone,
  type CombinedPediatricDiagnosisResult,
  type PediatricDiagnosticInput,
} from '../lib/pediatric-diagnostic.engine';
import {
  calculateFrisanchoComposition,
  type FrisanchoCompositionResult,
} from '../lib/frisancho.engine';

export interface PediatricDiagnosticSummaryCardProps extends PediatricDiagnosticInput {
  pesoTallaZone?: TriaxialZone;
  pesoEdadZone?: TriaxialZone;
  tallaEdadZone?: TriaxialZone;
  onTriaxialChange?: (indices: {
    pesoTalla: TriaxialZone;
    pesoEdad: TriaxialZone;
    tallaEdad: TriaxialZone;
  }) => void;
  midUpperArmCircumferenceCm?: number;
  tricepsSkinfoldMm?: number;
}

const TRIAXIAL_OPTIONS: TriaxialZone[] = ['BAJO', 'NORMAL', 'ALTO'];

const getTriaxialOptionClass = (opt: TriaxialZone, isSelected: boolean): string => {
  if (!isSelected) {
    return 'bg-base-200 text-base-content/70 hover:bg-base-300';
  }
  switch (opt) {
    case 'BAJO':
      return 'bg-rose-600 text-white shadow-xs hover:bg-rose-700 dark:bg-rose-600';
    case 'ALTO':
      return 'bg-amber-500 text-white shadow-xs hover:bg-amber-600 dark:bg-amber-600';
    case 'NORMAL':
    default:
      return 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700';
  }
};

export const PediatricDiagnosticSummaryCard: React.FC<PediatricDiagnosticSummaryCardProps> = (
  props
) => {
  const {
    selectedZone,
    pesoTallaZone: propPT,
    pesoEdadZone: propPE,
    tallaEdadZone: propTE,
    onTriaxialChange,
    midUpperArmCircumferenceCm,
    tricepsSkinfoldMm,
    ...restInput
  } = props;

  const frisancho = useMemo<FrisanchoCompositionResult | null>(() => {
    const age = restInput.ageYears;
    if (
      typeof age === 'number' &&
      age >= 1 &&
      typeof midUpperArmCircumferenceCm === 'number' &&
      midUpperArmCircumferenceCm > 0 &&
      typeof tricepsSkinfoldMm === 'number' &&
      tricepsSkinfoldMm >= 0
    ) {
      return calculateFrisanchoComposition({
        muacCm: midUpperArmCircumferenceCm,
        tsfMm: tricepsSkinfoldMm,
        gender: restInput.gender,
        ageYears: age,
      });
    }
    return null;
  }, [restInput.ageYears, restInput.gender, midUpperArmCircumferenceCm, tricepsSkinfoldMm]);

  // Si no se pasaron props explícitas para la matriz triaxial, se inicializa mapeando la zona seleccionada o NORMAL
  const initialDefault = mapZoneToTriaxialZone(selectedZone);
  const [pesoTalla, setPesoTalla] = useState<TriaxialZone>(propPT || 'NORMAL');
  const [pesoEdad, setPesoEdad] = useState<TriaxialZone>(propPE || initialDefault);
  const [tallaEdad, setTallaEdad] = useState<TriaxialZone>(propTE || 'NORMAL');

  // Reactividad en tiempo real: recalcula automáticamente los 3 canales al modificarse peso, talla o edad
  useEffect(() => {
    if (restInput.weightKg && restInput.heightCm && restInput.ageYears !== undefined) {
      const auto = computeTriaxialIndices({
        weightKg: restInput.weightKg,
        heightCm: restInput.heightCm,
        ageYears: restInput.ageYears,
        gender: restInput.gender,
      });
      const nextPT = propPT || auto.pesoTalla;
      const nextPE = propPE || auto.pesoEdad;
      const nextTE = propTE || auto.tallaEdad;
      setPesoTalla(nextPT);
      setPesoEdad(nextPE);
      setTallaEdad(nextTE);
      if (onTriaxialChange) {
        onTriaxialChange({ pesoTalla: nextPT, pesoEdad: nextPE, tallaEdad: nextTE });
      }
    }
  }, [restInput.weightKg, restInput.heightCm, restInput.ageYears, restInput.gender]);

  useEffect(() => {
    if (propPT) setPesoTalla(propPT);
  }, [propPT]);

  useEffect(() => {
    if (propPE) setPesoEdad(propPE);
  }, [propPE]);

  useEffect(() => {
    if (propTE) setTallaEdad(propTE);
  }, [propTE]);

  const handleIndexChange = (
    indicator: 'PT' | 'PE' | 'TE',
    zone: TriaxialZone
  ) => {
    let nextPT = pesoTalla;
    let nextPE = pesoEdad;
    let nextTE = tallaEdad;

    if (indicator === 'PT') {
      nextPT = zone;
      setPesoTalla(zone);
    } else if (indicator === 'PE') {
      nextPE = zone;
      setPesoEdad(zone);
    } else if (indicator === 'TE') {
      nextTE = zone;
      setTallaEdad(zone);
    }

    if (onTriaxialChange) {
      onTriaxialChange({ pesoTalla: nextPT, pesoEdad: nextPE, tallaEdad: nextTE });
    }
  };

  const combinedResult: CombinedPediatricDiagnosisResult = evaluateCombinedPediatricDiagnosis({
    pesoTalla,
    pesoEdad,
    tallaEdad,
  });

  const baseResult = evaluatePediatricDiagnosis({
    ...restInput,
    selectedZone,
    triaxialIndices: { pesoTalla, pesoEdad, tallaEdad },
  });

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0" />;
      case 'ALERT':
        return <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />;
      case 'NORMAL':
      default:
        return <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />;
    }
  };

  return (
    <div translate="no" className="notranslate rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8 space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-base-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-base-content">
              Diagnóstico Nutricional Combinado
            </h2>
            <p className="text-xs text-base-content/60">
              Matriz clínica multidimensional (Waterlow / Ramos Galván / INN-OMS): P/T, P/E y T/E.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${combinedResult.badgeColor} ${combinedResult.badgeBorder}`}
        >
          {getAlertIcon(combinedResult.severity)}
          {combinedResult.title}
        </span>
      </div>

      {/* Selectores de los 3 Índices Antropométricos Triaxiales */}
      <div className="rounded-xl bg-base-200/70 p-4 border border-base-300 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-base-content/80">
            Evaluación Triaxial de Crecimiento
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Índice 1: Peso para la Talla (P/T) */}
          <div className="space-y-1.5 bg-base-100 p-3 rounded-xl border border-base-300/80 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-base-content">Peso / Talla (P/T)</span>
              <span className="text-[10px] text-base-content/60 font-semibold">Agudo / Masa</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {TRIAXIAL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleIndexChange('PT', opt)}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${getTriaxialOptionClass(
                    opt,
                    pesoTalla === opt
                  )}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Índice 2: Peso para la Edad (P/E) */}
          <div className="space-y-1.5 bg-base-100 p-3 rounded-xl border border-base-300/80 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-base-content">Peso / Edad (P/E)</span>
              <span className="text-[10px] text-base-content/60 font-semibold">Global</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {TRIAXIAL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleIndexChange('PE', opt)}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${getTriaxialOptionClass(
                    opt,
                    pesoEdad === opt
                  )}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Índice 3: Talla para la Edad (T/E) */}
          <div className="space-y-1.5 bg-base-100 p-3 rounded-xl border border-base-300/80 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-base-content">Talla / Edad (T/E)</span>
              <span className="text-[10px] text-base-content/60 font-semibold">Crónico / Talla</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {TRIAXIAL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleIndexChange('TE', opt)}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${getTriaxialOptionClass(
                    opt,
                    tallaEdad === opt
                  )}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta de Diagnóstico de la Matriz Combinada */}
      <div className="rounded-xl bg-base-200 p-4 border border-base-300 space-y-2">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-emerald-600 shrink-0" />
          <h3 className="text-sm font-bold text-base-content">
            {combinedResult.classification}
          </h3>
        </div>
        <p className="text-xs text-base-content/80 leading-relaxed pl-6">
          {combinedResult.clinicalDescription}
        </p>
      </div>

      {/* Resumen Clínico adicional si hay mediciones */}
      {baseResult.summary && (
        <div className="rounded-xl bg-base-200/50 p-3 border border-base-300/80 text-xs text-base-content/70 flex items-start gap-2">
          <FileText className="h-4 w-4 text-base-content/50 mt-0.5 shrink-0" />
          <span>{baseResult.summary}</span>
        </div>
      )}

      {/* Sección: Composición Corporal Pediátrica (Frisancho) */}
      {frisancho ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/30 p-5 dark:bg-emerald-950/20 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-3 dark:border-emerald-900/40">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-base-content">
                  Composición Corporal Pediátrica (Frisancho)
                </h3>
                <p className="text-[11px] text-base-content/60">
                  Evaluación braquial de reservas proteico-calóricas (NHANES / Heymsfield{frisancho.ageBracket ? ` • Rango ${frisancho.ageBracket} años` : ''})
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                frisancho.clinicalAlert === 'CRITICAL'
                  ? 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400'
                  : frisancho.clinicalAlert === 'WARNING'
                  ? 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400'
              }`}
            >
              Alerta: {frisancho.clinicalAlert}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Masa Muscular */}
            <div className="rounded-xl bg-base-100 p-3.5 border border-base-300 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-base-content">Masa Muscular</span>
                <span className="text-[10px] text-base-content/60 font-semibold">Heymsfield</span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-base-content">
                    {frisancho.camaCm2 != null ? frisancho.camaCm2 : frisancho.amaCm2}
                  </span>
                  <span className="text-xs font-medium text-base-content/60">
                    cm² ({frisancho.camaCm2 != null ? 'cAMA' : 'AMA'})
                  </span>
                </div>
                <p className="text-[11px] text-base-content/70 mt-0.5">
                  Percentil: <strong className="font-semibold">{frisancho.muscleEvaluation.category}</strong>
                </p>
              </div>
              <div
                className={`text-[11px] font-semibold px-2 py-1 rounded-lg border ${frisancho.muscleEvaluation.badgeColor} ${frisancho.muscleEvaluation.badgeBorder}`}
              >
                {frisancho.muscleEvaluation.classification}
              </div>
            </div>

            {/* Reserva Grasa */}
            <div className="rounded-xl bg-base-100 p-3.5 border border-base-300 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-base-content">Reserva Grasa</span>
                <span className="text-[10px] text-base-content/60 font-semibold">AFA</span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-base-content">{frisancho.afaCm2}</span>
                  <span className="text-xs font-medium text-base-content/60">cm²</span>
                </div>
                <p className="text-[11px] text-base-content/70 mt-0.5">
                  Percentil: <strong className="font-semibold">{frisancho.fatEvaluation.category}</strong>
                </p>
              </div>
              <div
                className={`text-[11px] font-semibold px-2 py-1 rounded-lg border ${frisancho.fatEvaluation.badgeColor} ${frisancho.fatEvaluation.badgeBorder}`}
              >
                {frisancho.fatEvaluation.classification}
              </div>
            </div>

            {/* Índice Graso Braquial */}
            <div className="rounded-xl bg-base-100 p-3.5 border border-base-300 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-base-content">Índice Graso (AFI)</span>
                <span className="text-[10px] text-base-content/60 font-semibold">Proporción</span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {frisancho.afiPercent}%
                  </span>
                </div>
                <p className="text-[11px] text-base-content/70 mt-0.5">
                  Área Total: <strong className="font-semibold">{frisancho.taaCm2} cm²</strong>
                </p>
              </div>
              <div className="text-[11px] text-base-content/70 px-2 py-1 rounded-lg bg-base-200">
                Pliegue: <strong>{frisancho.tsfMm} mm</strong> | Brazo: <strong>{frisancho.muacCm} cm</strong>
              </div>
            </div>
          </div>

          {/* Resumen clínico Frisancho */}
          <div className="text-xs text-base-content/80 bg-base-100/80 p-2.5 rounded-lg border border-base-200">
            <p>
              <strong>Diagnóstico Braquial:</strong> {frisancho.summary}
            </p>
            {frisancho.muscleEvaluation.recommendation && (
              <p className="mt-1 text-base-content/70">• {frisancho.muscleEvaluation.recommendation}</p>
            )}
            {frisancho.fatEvaluation.recommendation && (
              <p className="mt-0.5 text-base-content/70">• {frisancho.fatEvaluation.recommendation}</p>
            )}
          </div>
        </div>
      ) : typeof restInput.ageYears === 'number' && restInput.ageYears < 1 ? (
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-4 dark:bg-sky-950/30 dark:border-sky-900/50 flex items-start gap-3">
          <Info className="h-5 w-5 text-sky-600 mt-0.5 shrink-0 dark:text-sky-400" />
          <div className="text-xs text-sky-900 dark:text-sky-200 space-y-1">
            <p className="font-bold">Composición Corporal Pediátrica (Frisancho)</p>
            <p className="text-sky-800/90 dark:text-sky-300">
              Las tablas de referencia de Frisancho (NHANES) aplican a partir de 1 año (12 meses) de edad hasta los 18 años. En lactantes menores de 1 año, utilice las curvas antropométricas de la OMS.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-base-300 bg-base-200/40 p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-base-content/50 mt-0.5 shrink-0" />
          <div className="text-xs text-base-content/70 space-y-1">
            <p className="font-bold text-base-content">Composición Corporal Pediátrica (Frisancho)</p>
            <p>
              Para calcular la masa muscular (cAMA Heymsfield), reserva grasa (AFA) e índice graso braquial (AFI), ingrese el <strong>Perímetro Braquial (cm)</strong> y el <strong>Pliegue Tricipital (mm)</strong> en los parámetros antropométricos.
            </p>
          </div>
        </div>
      )}

      {/* Conducta Clínica y Recomendaciones */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/60 mb-3 flex items-center gap-1.5">
          <Info className="h-4 w-4 text-emerald-600" /> Conducta Clínica & Recomendaciones Específicas
        </h3>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {combinedResult.recommendations.map((rec, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-xs text-base-content/90 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-100/60 dark:border-emerald-900/40"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
