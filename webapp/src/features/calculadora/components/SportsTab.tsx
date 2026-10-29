"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Activity, Flame, Info, Target, Dumbbell, Calculator, AlertTriangle } from "lucide-react";
import { trackCalculatorUse } from "../lib/tracking";
import {
  calculateAthleteTotal,
  calculateCunninghamRmr,
  calculateDirectExpenditure,
  calculateMetsExpenditure,
  round2,
} from "@/features/calculadora/lib/sport-calculation.engine";
import { getCalPerMinForCategory, getCalorieSourceForCategory } from "@/features/calculadora/lib/sport-calorie-table";
import { SPORT_CATEGORIES, sportDisciplines } from "@/features/calculadora/lib/sport-disciplines";

type SportMethod = "DIRECTO" | "MET";

const METHOD_OPTIONS: { id: SportMethod; name: string; desc: string }[] = [
  { id: "DIRECTO", name: "Método 1 · DIRECTO", desc: "kcal/min de referencia por categoría (tabla curada ACSM/McArdle)." },
  { id: "MET", name: "Método 2 · MET", desc: "Gasto por equivalentes metabólicos (MET) del Compendio 2024." },
];

export const SportsTab = () => {
  const [method, setMethod] = useState<SportMethod>("DIRECTO");
  const [disciplineCode, setDisciplineCode] = useState<string>("");

  // Datos de entrenamiento
  const [weightInput, setWeightInput] = useState<string>("75");
  const [minutesInput, setMinutesInput] = useState<string>("60");
  const [daysInput, setDaysInput] = useState<string>("3");
  const [sessionsInput, setSessionsInput] = useState<string>("1");

  // Composición corporal
  const [ffmInput, setFfmInput] = useState<string>("60");
  const [fatPercentageInput, setFatPercentageInput] = useState<string>("20");

  const weight = parseFloat(weightInput) || 0;
  const minutes = parseFloat(minutesInput) || 0;
  const days = parseFloat(daysInput) || 0;
  const sessions = parseFloat(sessionsInput) || 0;
  const ffm = parseFloat(ffmInput) || 0;
  const fatPercentage = parseFloat(fatPercentageInput) || 0;

  const selectedDiscipline = useMemo(
    () => sportDisciplines.find((d) => d.code === disciplineCode) ?? null,
    [disciplineCode],
  );

  // Validaciones
  const trainingInvalid = weight <= 0 || minutes <= 0 || days <= 0 || sessions <= 0;
  const ffmNegative = ffm < 0;
  const ffmZero = ffm === 0;
  const canSuggestFfm = weight > 0 && fatPercentage > 0 && fatPercentage < 100;

  const calPerMin = selectedDiscipline ? getCalPerMinForCategory(selectedDiscipline.category) : undefined;
  const directSource = selectedDiscipline ? getCalorieSourceForCategory(selectedDiscipline.category) : "";
  const directUnavailable = method === "DIRECTO" && !!selectedDiscipline && calPerMin === undefined;

  const ready = !!selectedDiscipline && !trainingInvalid && !ffmNegative;

  // Cálculos (Método 2 es DIARIO ÷7; Método 1 es SEMANAL sin ÷7)
  const metsDaily = ready
    ? calculateMetsExpenditure({
        met: selectedDiscipline!.metValue,
        weightKg: weight,
        minutesPerSession: minutes,
        daysPerWeek: days,
        sessionsPerDay: sessions,
      })
    : 0;

  const directWeekly = ready && calPerMin !== undefined
    ? calculateDirectExpenditure({
        calPerMin: calPerMin!,
        minutesPerSession: minutes,
        daysPerWeek: days,
        sessionsPerDay: sessions,
      })
    : 0;

  const cunninghamRmr = ready ? calculateCunninghamRmr(ffm) : 0;
  const athleteTotal = ready ? calculateAthleteTotal(ffm, metsDaily) : 0;

  const lastTrackedRef = useRef<string>('');

  useEffect(() => {
    const key = JSON.stringify({ method, disciplineCode, weight, minutes, days, sessions, ffm, metsDaily, directWeekly, cunninghamRmr, athleteTotal });
    if (key === lastTrackedRef.current) return;
    lastTrackedRef.current = key;
    trackCalculatorUse('deportistas', { method, disciplineCode, weightKg: weight, minutes, days, sessions, ffm }, { metsDaily, directWeekly, cunninghamRmr, athleteTotal }, 'dashboard');
  }, [method, disciplineCode, weight, minutes, days, sessions, ffm, metsDaily, directWeekly, cunninghamRmr, athleteTotal]);

  const applyFfmSuggestion = () => {
    if (!canSuggestFfm) return;
    setFfmInput(String(round2(weight * (1 - fatPercentage / 100))));
  };

  return (
    <div className="@container space-y-6">
      {/* Paso 1 — Método */}
      <div className="bg-base-100 border border-base-300 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl shadow-base-300/50">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-base-content mb-1">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black">1</span>
            Elegí el Método de Cálculo
          </h2>
          <p className="text-xs text-base-content/60">Seleccioná cómo querés estimar el gasto energético de la disciplina.</p>
        </div>
        <div className="grid grid-cols-1 @lg:grid-cols-2 gap-4">
          {METHOD_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`p-4 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                method === m.id
                  ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                  : "bg-base-200 border-base-300 text-base-content hover:bg-base-300"
              }`}
            >
              <span className="font-bold text-sm flex items-center gap-2">
                {m.id === "DIRECTO" ? <Flame className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                {m.name}
              </span>
              <span className={`text-[11px] leading-relaxed ${method === m.id ? "text-white/85" : "text-base-content/60"}`}>
                {m.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Paso 2 — Disciplina */}
      <div className="bg-base-100 border border-base-300 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl shadow-base-300/50">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-base-content mb-1">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black">2</span>
            Elegí la Disciplina
          </h2>
          <p className="text-xs text-base-content/60">
            {sportDisciplines.length} disciplinas del catálogo embebido (fuente: traincalc 2024 Compendium / calorique 2026).
          </p>
        </div>
        <select
          value={disciplineCode}
          onChange={(e) => setDisciplineCode(e.target.value)}
          className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3.5 px-4 text-base-content font-semibold transition-all cursor-pointer"
        >
          <option value="">Seleccioná una disciplina…</option>
          {SPORT_CATEGORIES.map((category) => (
            <optgroup key={category} label={category}>
              {sportDisciplines
                .filter((d) => d.category === category)
                .map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name} — MET {d.metValue}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>

        {selectedDiscipline && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-base-200 border border-base-300 text-xs text-base-content/80">
            <Dumbbell className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              <span className="font-bold text-base-content">{selectedDiscipline.name}</span> · {selectedDiscipline.category} · MET{" "}
              {selectedDiscipline.metValue}
              <span className="text-base-content/60"> — {selectedDiscipline.description}</span>
            </span>
          </div>
        )}

        {directUnavailable && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Valor directo (kcal/min) no disponible para esta disciplina: se usa Método 2 (MET).</span>
          </div>
        )}
      </div>

      {/* Datos de entrenamiento + Composición corporal */}
      <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
        <div className="bg-base-100 border border-base-300 rounded-[2.5rem] p-6 sm:p-8 space-y-5 shadow-xl shadow-base-300/50">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-base-content mb-1">
              <Target className="w-5 h-5 text-primary" />
              Datos de Entrenamiento
            </h2>
            <p className="text-xs text-base-content/60">Todos los valores deben ser positivos.</p>
          </div>
          <div className="grid grid-cols-1 @sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="sport-weight" className="text-sm font-semibold text-base-content/80 block">Peso corporal (kg)</label>
              <input
                id="sport-weight"
                type="number"
                min="0"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3 px-4 text-base-content font-bold transition-all text-center text-lg"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="sport-minutes" className="text-sm font-semibold text-base-content/80 block">Minutos por sesión</label>
              <input
                id="sport-minutes"
                type="number"
                min="0"
                value={minutesInput}
                onChange={(e) => setMinutesInput(e.target.value)}
                className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3 px-4 text-base-content font-bold transition-all text-center text-lg"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="sport-days" className="text-sm font-semibold text-base-content/80 block">Días por semana</label>
              <input
                id="sport-days"
                type="number"
                min="0"
                max="7"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3 px-4 text-base-content font-bold transition-all text-center text-lg"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="sport-sessions" className="text-sm font-semibold text-base-content/80 block">Sesiones por día</label>
              <input
                id="sport-sessions"
                type="number"
                min="0"
                value={sessionsInput}
                onChange={(e) => setSessionsInput(e.target.value)}
                className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3 px-4 text-base-content font-bold transition-all text-center text-lg"
              />
            </div>
          </div>
        </div>

        <div className="bg-base-100 border border-base-300 rounded-[2.5rem] p-6 sm:p-8 space-y-5 shadow-xl shadow-base-300/50">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-base-content mb-1">
              <Calculator className="w-5 h-5 text-primary" />
              Composición Corporal (Cunningham)
            </h2>
            <p className="text-xs text-base-content/60">
              FFM (masa libre de grasa, kg) para el cálculo de la tasa metabólica en reposo.
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="sport-ffm" className="text-sm font-semibold text-base-content/80 block">FFM (kg) — manual</label>
            <input
              id="sport-ffm"
              type="number"
              min="0"
              value={ffmInput}
              onChange={(e) => setFfmInput(e.target.value)}
              className={`w-full bg-base-200 border focus:ring-1 focus:bg-base-100 outline-none rounded-2xl py-3 px-4 text-base-content font-bold transition-all text-center text-lg ${
                ffmNegative
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-base-300 focus:border-primary focus:ring-primary"
              }`}
            />
          </div>

          <div className="border-t border-base-300 pt-4 space-y-2">
            <label htmlFor="sport-fat" className="text-sm font-semibold text-base-content/80 block">Sugerencia: % grasa corporal</label>
            <div className="flex gap-2 items-end">
              <input
                id="sport-fat"
                type="number"
                min="0"
                max="99"
                value={fatPercentageInput}
                onChange={(e) => setFatPercentageInput(e.target.value)}
                className="flex-1 bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3 px-4 text-base-content font-bold transition-all text-center text-lg"
              />
              <button
                type="button"
                onClick={applyFfmSuggestion}
                disabled={!canSuggestFfm}
                className="px-4 py-3 rounded-2xl text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Usar sugerencia
              </button>
            </div>
            <p className="text-[11px] text-base-content/60">
              FFM sugerida = peso × (1 − %grasa/100)
              {canSuggestFfm && ` → ${round2(weight * (1 - fatPercentage / 100))} kg`}
            </p>
          </div>

          {ffmNegative && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>FFM no puede ser negativo. Revisá el valor ingresado.</span>
            </div>
          )}
          {ffmZero && !ffmNegative && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>FFM = 0: verificar medición. El cálculo continúa con aviso.</span>
            </div>
          )}
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-gradient-to-br from-[#2b0c4f] via-[#1e0e5a] to-[#0d0ea0] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

        {!selectedDiscipline && (
          <p className="text-sm text-white/80">Completá el Paso 1 y 2 para ver los resultados.</p>
        )}

        {selectedDiscipline && trainingInvalid && (
          <p className="text-sm text-amber-200 font-semibold">
            Ingresá valores positivos de peso, minutos, días y sesiones para calcular.
          </p>
        )}

        {selectedDiscipline && !trainingInvalid && ffmNegative && (
          <p className="text-sm text-amber-200 font-semibold">Corregí el FFM negativo para calcular.</p>
        )}

        {ready && (
          <div className="space-y-6">
            <div className="flex flex-col @lg:flex-row justify-between items-start @lg:items-center gap-3">
              <h3 className="font-bold text-lg text-white/90 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Resultado de Gasto por Actividad
              </h3>
              <span className="text-xs bg-white/15 px-3 py-1 rounded-full font-bold">
                Método activo: {method === "DIRECTO" ? "1 · DIRECTO" : "2 · MET"}
              </span>
            </div>

            {/* Dual view: ambos métodos */}
            <div className="grid grid-cols-1 @sm:grid-cols-2 gap-4">
              <div className={`bg-white/10 p-4 rounded-2xl border ${method === "DIRECTO" && !directUnavailable ? "border-white/40" : "border-white/10 opacity-70"}`}>
                <p className="text-[10px] text-white/60 uppercase font-black tracking-wider">
                  Método 1 · Gasto DIRECTO (semanal)
                </p>
                {calPerMin === undefined ? (
                  <p className="text-sm font-bold text-amber-200 mt-2">Valor directo no disponible → se usa Método 2</p>
                ) : (
                  <>
                    <p className="text-2xl font-black text-white mt-1">{directWeekly.toLocaleString()} <span className="text-sm font-bold text-sky-300">kcal/semana</span></p>
                    <p className="text-[10px] text-white/60 mt-1">
                      {minutes}×{days}×{sessions} min × {calPerMin} kcal/min ({directSource})
                    </p>
                  </>
                )}
              </div>
              <div className={`bg-white/10 p-4 rounded-2xl border ${method === "MET" || directUnavailable ? "border-white/40" : "border-white/10 opacity-70"}`}>
                <p className="text-[10px] text-white/60 uppercase font-black tracking-wider">Método 2 · Gasto MET (diario)</p>
                <p className="text-2xl font-black text-white mt-1">{metsDaily.toLocaleString()} <span className="text-sm font-bold text-sky-300">kcal/día</span></p>
                <p className="text-[10px] text-white/60 mt-1">MET {selectedDiscipline.metValue} · 4 pasos con redondeo round2 (÷7)</p>
              </div>
            </div>

            <p className="text-[11px] text-white/70 bg-white/5 rounded-xl px-3 py-2">
              El Método 1 expresa el gasto como total semanal (sin ÷7); el Método 2 como promedio diario. El TDEE diario usa el gasto MET.
            </p>

            <div className="w-full h-px bg-white/15" />

            {/* TDEE adulto — gasto separado del requerimiento */}
            <div>
              <h4 className="text-sm font-semibold text-purple-200/80 mb-3">Requerimiento Estimado Adulto (Cunningham + actividad)</h4>
              <div className="grid grid-cols-1 @lg:grid-cols-3 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-white/60 uppercase font-black tracking-wider">RMR Cunningham</p>
                  <p className="text-lg font-bold text-white mt-1">{cunninghamRmr.toLocaleString()} <span className="text-xs font-bold text-sky-300">kcal/día</span></p>
                  <p className="text-[9px] text-white/60 mt-0.5">500 + 22 × {ffm} kg FFM</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-white/60 uppercase font-black tracking-wider">Gasto METs (actividad)</p>
                  <p className="text-lg font-bold text-sky-300 mt-1">{metsDaily.toLocaleString()} <span className="text-xs font-bold text-white">kcal/día</span></p>
                  <p className="text-[9px] text-white/60 mt-0.5">Separado del TDEE para evitar doble conteo</p>
                </div>
                <div className="bg-white/15 p-4 rounded-2xl border border-white/30">
                  <p className="text-[10px] text-white/70 uppercase font-black tracking-wider">TDEE Total</p>
                  <p className="text-xl font-black text-emerald-300 mt-1">{athleteTotal.toLocaleString()} <span className="text-xs font-bold text-white">kcal/día</span></p>
                  <p className="text-[9px] text-white/60 mt-0.5">Cunningham + gasto METs</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};