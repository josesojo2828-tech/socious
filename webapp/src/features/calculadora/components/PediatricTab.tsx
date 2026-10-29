"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import {
  Baby,
  Ruler,
  User,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  Info,
  Flame,
  Activity,
  Sparkles,
  PieChart,
} from "lucide-react";
import { calculateMirwaldPhv, type PhvResult } from "@/features/calculadora/lib/mirwald.engine";
import {
  calculatePediatricEnergyRequirement,
  PEDIATRIC_ACTIVITY_OPTIONS,
  PEDIATRIC_FA_MIDPOINT,
  type PediatricEnergyRequirementResult,
  type PediatricGoal,
} from "@/features/nutringest/patient/lib/pediatric-calculation.engine";
import { trackCalculatorUse } from "../lib/tracking";

type Gender = "MALE" | "FEMALE";

const ACTIVITY_OPTIONS = PEDIATRIC_ACTIVITY_OPTIONS;

export const PediatricTab = () => {
  const [gender, setGender] = useState<Gender | null>(null);

  // Mediciones
  const [ageInput, setAgeInput] = useState<string>("13");
  const [weightInput, setWeightInput] = useState<string>("55");
  const [heightInput, setHeightInput] = useState<string>("165");
  const [sittingHeightInput, setSittingHeightInput] = useState<string>("88");
  const [activityFactor, setActivityFactor] = useState<number>(PEDIATRIC_FA_MIDPOINT.ACTIVE);

  // Objetivo nutricional — default Mantener (seguro en pediatría; en adultos
  // el default es déficit, acá el mantenimiento es la base clínica).
  const [goal, setGoal] = useState<PediatricGoal>("MAINTAIN");
  const [deficitPct, setDeficitPct] = useState<number>(0.1);

  const age = parseFloat(ageInput) || 0;
  const weight = parseFloat(weightInput) || 0;
  const height = parseFloat(heightInput) || 0;
  const sittingHeight = parseFloat(sittingHeightInput) || 0;

  const medicionesInvalid = age <= 0 || weight <= 0 || height <= 0 || sittingHeight <= 0;
  const lei = height - sittingHeight;
  const leiInvalid = lei <= 0;

  const ready = !!gender && !medicionesInvalid && !leiInvalid;

  const result: PhvResult | null = useMemo(() => {
    if (!ready || !gender) return null;
    return calculateMirwaldPhv({
      gender,
      age,
      weightKg: weight,
      heightCm: height,
      sittingHeightCm: sittingHeight,
    });
  }, [ready, gender, age, weight, height, sittingHeight]);

  const energyResult: PediatricEnergyRequirementResult | null = useMemo(() => {
    if (!gender || age <= 0 || weight <= 0) return null;
    return calculatePediatricEnergyRequirement({
      gender,
      ageYears: age,
      weightKg: weight,
      activityFactor,
      goal,
      deficitPct,
    });
  }, [gender, age, weight, activityFactor, goal, deficitPct]);

  const lastTrackedRef = useRef<string>('');

  useEffect(() => {
    const key = JSON.stringify({ gender, age, weight, height, sittingHeight, result });
    if (key === lastTrackedRef.current) return;
    lastTrackedRef.current = key;
    if (ready && result) {
      trackCalculatorUse(
        'pediatria',
        { gender, age, weightKg: weight, heightCm: height, sittingHeightCm: sittingHeight },
        { phv: result.value, sign: result.sign, rangeValid: result.rangeValid },
        'dashboard'
      );
    }
  }, [gender, age, weight, height, sittingHeight, ready, result]);

  const rangeDescription = gender === "MALE" ? "13–15.6 años" : "12–14.9 años";

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: Mediciones e Input */}
      <div className="bg-base-100 border border-base-300 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-xl shadow-base-300/50">
        {/* Género — requerido */}
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-base-content mb-1">
              <Baby className="w-5 h-5 text-primary" />
              Módulo Pediátrico: Biometría & Crecimiento
            </h2>
            <p className="text-xs text-base-content/60">
              Evaluación del pico de crecimiento (Mirwald et al. 2002) y requerimiento energético infantil (Schofield / Holliday-Segar).
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setGender("MALE")}
              className={`py-4 px-6 rounded-2xl border font-bold flex items-center justify-center gap-3 transition-all cursor-pointer ${
                gender === "MALE"
                  ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                  : "bg-base-200 border-base-300 text-base-content/60 hover:bg-base-300 hover:text-base-content"
              }`}
            >
              Chico
            </button>
            <button
              type="button"
              onClick={() => setGender("FEMALE")}
              className={`py-4 px-6 rounded-2xl border font-bold flex items-center justify-center gap-3 transition-all cursor-pointer ${
                gender === "FEMALE"
                  ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                  : "bg-base-200 border-base-300 text-base-content/60 hover:bg-base-300 hover:text-base-content"
              }`}
            >
              Chica
            </button>
          </div>
        </div>

        {/* Mediciones */}
        <div>
          <h3 className="text-sm font-bold text-base-content flex items-center gap-2 mb-3">
            <Ruler className="w-4 h-4 text-primary" />
            Mediciones Antropométricas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label htmlFor="ped-age" className="text-sm font-semibold text-base-content/80 block">Edad (años)</label>
              <input
                id="ped-age"
                type="number"
                min="0"
                step="0.1"
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3 px-4 text-base-content font-bold transition-all text-center text-lg"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="ped-weight" className="text-sm font-semibold text-base-content/80 block">Peso / MC (kg)</label>
              <input
                id="ped-weight"
                type="number"
                min="0"
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3 px-4 text-base-content font-bold transition-all text-center text-lg"
              />
              <p className="text-[10px] text-base-content/60">MC = masa corporal (kg)</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="ped-height" className="text-sm font-semibold text-base-content/80 block">Talla (cm)</label>
              <input
                id="ped-height"
                type="number"
                min="0"
                step="0.1"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3 px-4 text-base-content font-bold transition-all text-center text-lg"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="ped-sitting" className="text-sm font-semibold text-base-content/80 block">Talla Sentado TS (cm)</label>
              <input
                id="ped-sitting"
                type="number"
                min="0"
                step="0.1"
                value={sittingHeightInput}
                onChange={(e) => setSittingHeightInput(e.target.value)}
                className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3 px-4 text-base-content font-bold transition-all text-center text-lg"
              />
              <p className="text-[10px] text-base-content/60">LEI = Talla − TS</p>
            </div>
          </div>
        </div>

        {/* Factor de Actividad para Gasto Energético */}
        <div className="pt-2 border-t border-base-200">
          <label htmlFor="ped-fa" className="text-sm font-semibold text-base-content/80 block mb-2">
            Factor de Actividad Física (FAO/OMS)
          </label>
          <select
            id="ped-fa"
            value={activityFactor}
            onChange={(e) => setActivityFactor(parseFloat(e.target.value))}
            className="w-full max-w-md bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-2.5 px-4 text-base-content font-semibold transition-all text-sm"
          >
            {ACTIVITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Avisos */}
        {!gender && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <User className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Seleccionar género para calcular el PHV y el metabolismo basal.</span>
          </div>
        )}
        {medicionesInvalid && gender && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Todas las mediciones deben ser positivas para calcular.</span>
          </div>
        )}
        {leiInvalid && !medicionesInvalid && gender && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>La talla sentado debe ser menor a la talla total (LEI = {lei.toFixed(1)} cm no es válida).</span>
          </div>
        )}
        {ready && result && !result.rangeValid && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Edad fuera del rango validado de Mirwald ({gender === "MALE" ? "chicos 13–15.6" : "chicas 12–14.9"} años). El
              resultado se calcula pero es orientativo.
            </span>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: Resultado Mirwald (PHV) Enriquecido */}
      <div className="bg-gradient-to-br from-[#2b0c4f] via-[#1e0e5a] to-[#0d0ea0] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

        {!ready && (
          <p className="text-sm text-white/80">
            Completá el género y las mediciones para calcular el PHV y las pautas madurativas.
          </p>
        )}

        {ready && result && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-bold text-lg text-white/90 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Predicción del Pico de Crecimiento (Mirwald PHV)
              </h3>
              <span className="text-xs bg-white/15 px-3 py-1 rounded-full font-bold">
                {gender === "MALE" ? "Chico" : "Chica"} · Rango validado {rangeDescription}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] text-white/60 uppercase font-black tracking-wider">Maturity Offset</p>
                <p className={`text-3xl font-black mt-1 ${result.sign === 1 ? "text-emerald-300" : "text-sky-300"}`}>
                  {result.sign === 1 ? "+" : "−"}{Math.abs(result.value)}
                  <span className="text-sm font-bold text-white/70"> años</span>
                </p>
                <p className="text-[11px] text-white/70 mt-1">
                  {result.sign === 1 ? "Desde el PHV" : "Hasta el PHV"}
                </p>
              </div>

              <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] text-white/60 uppercase font-black tracking-wider">Edad al Pico (PHV)</p>
                <p className="text-3xl font-black mt-1 text-amber-300">
                  {result.ageAtPhv} <span className="text-sm font-bold text-white/70">años</span>
                </p>
                <p className="text-[11px] text-white/70 mt-1">Edad decimal proyectada</p>
              </div>

              <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] text-white/60 uppercase font-black tracking-wider">Etapa Madurativa</p>
                <p className="text-base font-bold text-white mt-1">
                  {result.maturationLabel}
                </p>
                <span className="text-[10px] px-2 py-0.5 mt-1 inline-block rounded-full bg-white/20 font-mono font-bold">
                  {result.maturationStage}
                </span>
              </div>

              <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] text-white/60 uppercase font-black tracking-wider">LEI Derivada</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {lei.toFixed(1)} <span className="text-xs font-bold text-sky-300">cm</span>
                </p>
                <p className="text-[10px] text-white/60 mt-0.5">Talla − Talla Sentado</p>
              </div>
            </div>

            {/* Tarjeta de Recomendaciones Clínicas & Deportivas */}
            <div className="bg-white/10 p-5 rounded-2xl border border-white/15 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Pautas Clínicas & Deportivas ({result.maturationLabel})
              </div>
              <p className="text-xs text-white/90 leading-relaxed">
                {result.clinicalRecommendations}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: Requerimiento Energético Pediátrico & Macronutrientes */}
      {energyResult && (
        <div className="bg-base-100 border border-base-300 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-xl shadow-base-300/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-base-200 pb-4">
            <div>
              <h3 className="text-xl font-bold text-base-content flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Requerimiento Energético Pediátrico
              </h3>
              <p className="text-xs text-base-content/60">
                Tasa basal por Schofield (1985), regla hidro-calórica de Holliday-Segar y costo calórico de crecimiento.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-base-content/60 block">Meta Calórica</span>
              <span className="text-2xl font-black text-orange-600">
                {energyResult.targetKcal} <span className="text-sm font-bold text-base-content/70">kcal/día</span>
              </span>
              <span className="text-[11px] text-base-content/50 block">
                Mantenimiento (RCT): {energyResult.totalKcal} kcal
              </span>
            </div>
          </div>

          {/* Objetivo — mismas opciones que la calculadora de adultos */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-base-content flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Objetivo Nutricional
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: "LOSE_WEIGHT" as PediatricGoal, name: "Perder Peso", icon: <TrendingDown size={18} /> },
                { id: "MAINTAIN" as PediatricGoal, name: "Mantener Peso", icon: <RefreshCw size={16} /> },
                { id: "GAIN_MUSCLE" as PediatricGoal, name: "Ganar Músculo", icon: <TrendingUp size={18} /> },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setGoal(o.id)}
                  className={`py-4 px-4 rounded-2xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    goal === o.id
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                      : "bg-base-200 border-base-300 text-base-content/60 hover:bg-base-300 hover:text-base-content"
                  }`}
                >
                  {o.icon}
                  <span className="text-sm">{o.name}</span>
                </button>
              ))}
            </div>

            {goal === "LOSE_WEIGHT" && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-base-content/70">
                  Déficit sobre el RCT
                  <span className="font-normal text-base-content/50 ml-1">
                    (piso de seguridad: 90% de la TMB)
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 0.05, name: "5%" },
                    { value: 0.1, name: "10%" },
                    { value: 0.15, name: "15%" },
                  ].map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setDeficitPct(o.value)}
                      className={`py-3 px-4 rounded-2xl border font-bold flex items-center justify-center transition-all cursor-pointer ${
                        deficitPct === o.value
                          ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                          : "bg-base-200 border-base-300 text-base-content/60 hover:bg-base-300 hover:text-base-content"
                      }`}
                    >
                      <span className="text-sm">{o.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-base-content/50">
              {goal === "LOSE_WEIGHT"
                ? `Meta = RCT − ${Math.round(deficitPct * 100)}% (déficit), nunca por debajo del 90% de la TMB.`
                : goal === "GAIN_MUSCLE"
                  ? "Meta = RCT + 300 kcal (superávit para ganancia muscular)."
                  : "Meta = RCT (mantenimiento con costo de crecimiento incluido)."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-base-200/60 p-4 rounded-2xl border border-base-300 space-y-1">
              <p className="text-xs font-semibold text-base-content/60">TMB Schofield</p>
              <p className="text-2xl font-black text-base-content">
                {energyResult.tmbSchofield !== null ? `${energyResult.tmbSchofield}` : "N/A"}
                <span className="text-xs font-semibold text-base-content/60 ml-1">kcal/día</span>
              </p>
              <p className="text-[11px] text-base-content/50">Gasto metabólico basal según edad y sexo</p>
            </div>

            <div className="bg-base-200/60 p-4 rounded-2xl border border-base-300 space-y-1">
              <p className="text-xs font-semibold text-base-content/60">Holliday-Segar</p>
              <p className="text-2xl font-black text-base-content">
                {energyResult.hollidaySegarKcal}
                <span className="text-xs font-semibold text-base-content/60 ml-1">kcal/día</span>
              </p>
              <p className="text-[11px] text-base-content/50">Estimación por bandas de peso corporal</p>
            </div>

            <div className="bg-base-200/60 p-4 rounded-2xl border border-base-300 space-y-1">
              <p className="text-xs font-semibold text-base-content/60">Costo de Crecimiento</p>
              <p className="text-2xl font-black text-emerald-600">
                +{energyResult.growthCostKcal}
                <span className="text-xs font-semibold text-base-content/60 ml-1">kcal/día</span>
              </p>
              <p className="text-[11px] text-base-content/50">
                Aporte anabólico específico según edad ({Math.round(energyResult.growthCostPercent * 100)} % del gasto)
              </p>
            </div>
          </div>

          {/* Distribución de Macronutrientes */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-base-content flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Distribución Pediátrica de Macronutrientes
            </h4>
            <p className="text-[11px] text-base-content/50 -mt-2">
              Calculados sobre la Meta Calórica ({energyResult.targetKcal} kcal), no sobre el RCT.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Carbohidratos (55%)</span>
                  <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
                    {energyResult.macronutrients.carbohydrates.grams} g
                  </span>
                </div>
                <p className="text-xl font-black text-amber-900 dark:text-amber-200">
                  {energyResult.macronutrients.carbohydrates.kcal} <span className="text-xs font-normal">kcal</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-sky-700 dark:text-sky-400">Proteínas (15%)</span>
                  <span className="text-xs font-extrabold text-sky-800 dark:text-sky-300">
                    {energyResult.macronutrients.proteins.grams} g
                  </span>
                </div>
                <p className="text-xl font-black text-sky-900 dark:text-sky-200">
                  {energyResult.macronutrients.proteins.kcal} <span className="text-xs font-normal">kcal</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Grasas (30%)</span>
                  <span className="text-xs font-extrabold text-rose-800 dark:text-rose-300">
                    {energyResult.macronutrients.fats.grams} g
                  </span>
                </div>
                <p className="text-xl font-black text-rose-900 dark:text-rose-200">
                  {energyResult.macronutrients.fats.kcal} <span className="text-xs font-normal">kcal</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};