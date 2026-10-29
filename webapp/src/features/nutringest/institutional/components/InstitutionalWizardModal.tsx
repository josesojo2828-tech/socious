"use client";

import React, { useState, useEffect } from "react";
import { X, Users, Activity, Coffee, Play, Info } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";

interface InstitutionalWizardModalProps {
  onClose: () => void;
  onSuccess: (id: string) => void;
}

export function InstitutionalWizardModal({ onClose, onSuccess }: InstitutionalWizardModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [femaleCount, setFemaleCount] = useState(69);
  const [maleCount, setMaleCount] = useState(50);
  const [sampleWeightsStr, setSampleWeightsStr] = useState("50, 60, 50, 51, 43, 51, 45, 50, 45");
  const [activityLevel, setActivityLevel] = useState<"SEDENTARY" | "MODERATE" | "ACTIVE" | "CUSTOM">("MODERATE");
  const [customKcalPerKg, setCustomKcalPerKg] = useState(30);

  // Meal distribution state (defaults) — método Lcda. Naomi Lamanna
  const [meals, setMeals] = useState([
    { name: "Desayuno", percentage: 25, proteinPercentage: 15, fatPercentage: 35, carbsPercentage: 50 },
    { name: "Almuerzo", percentage: 40, proteinPercentage: 15, fatPercentage: 35, carbsPercentage: 50 },
    { name: "Cena", percentage: 35, proteinPercentage: 15, fatPercentage: 35, carbsPercentage: 50 },
    { name: "Merienda", percentage: 0, proteinPercentage: 15, fatPercentage: 35, carbsPercentage: 50 },
  ]);

  // Live calculations
  const [averageWeight, setAverageWeight] = useState(50);
  const [vct, setVct] = useState(1800);

  useEffect(() => {
    const weights = sampleWeightsStr
      .split(",")
      .map((w) => parseFloat(w.trim()))
      .filter((w) => !isNaN(w));

    const avg = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 50;
    setAverageWeight(parseFloat(avg.toFixed(2)));

    let factor = 30;
    if (activityLevel === "SEDENTARY") factor = 20;
    else if (activityLevel === "MODERATE") factor = 30;
    else if (activityLevel === "ACTIVE") factor = 50;
    else factor = customKcalPerKg;

    const basePoblacional = Math.round((femaleCount + maleCount) / 2);
    setVct(Math.round(basePoblacional * factor));
  }, [femaleCount, maleCount, sampleWeightsStr, activityLevel, customKcalPerKg]);

  const generateMockSample = () => {
    // Generate a reasonable list of weights centered around 50kg
    const base = [50, 60, 50, 51, 43, 51, 45, 50, 45];
    setSampleWeightsStr(base.join(", "));
  };

  const handleMealChange = (index: number, field: string, value: number) => {
    const updated = [...meals];
    updated[index] = { ...updated[index], [field]: value };
    setMeals(updated);
  };

  const validate = () => {
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return false;
    }
    const totalPeople = femaleCount + maleCount;
    if (totalPeople <= 0) {
      setError("La población total debe ser mayor a 0.");
      return false;
    }
    const weights = sampleWeightsStr
      .split(",")
      .map((w) => parseFloat(w.trim()))
      .filter((w) => !isNaN(w));
    if (weights.length === 0) {
      setError("Debes ingresar al menos un peso válido para la muestra.");
      return false;
    }

    // Step 3 validation
    if (step === 3) {
      const totalMealPercent = meals.reduce((sum, m) => sum + m.percentage, 0);
      if (totalMealPercent !== 100) {
        setError(`La distribución de comidas debe sumar exactamente 100% (actual: ${totalMealPercent}%).`);
        return false;
      }
      for (const m of meals) {
        const macroPercent = m.proteinPercentage + m.fatPercentage + m.carbsPercentage;
        if (macroPercent !== 100) {
          setError(`Los macros de ${m.name} deben sumar exactamente 100% (actual: ${macroPercent}%).`);
          return false;
        }
      }
    }

    setError(null);
    return true;
  };

  const handleNext = () => {
    if (validate()) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError(null);

    const weights = sampleWeightsStr
      .split(",")
      .map((w) => parseFloat(w.trim()))
      .filter((w) => !isNaN(w));

    try {
      const payload = {
        title,
        totalPeople: femaleCount + maleCount,
        femaleCount,
        maleCount,
        sampleWeights: weights,
        activityLevel,
        activityFactor: activityLevel === "CUSTOM" ? customKcalPerKg : undefined,
        meals: meals.map((m) => ({
          mealType: m.name.toUpperCase(),
          percentage: m.percentage,
          proteinPercentage: m.proteinPercentage,
          fatPercentage: m.fatPercentage,
          carbsPercentage: m.carbsPercentage,
        })),
      };

      const { data } = await apiClient.post("/api/institutional-calculations", payload);
      onSuccess(data.id);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Ocurrió un error al guardar la simulación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-sans text-base-content/80 w-full max-w-2xl min-h-[450px]">
      {/* Header */}
      <div className="pb-4 border-b border-base-300 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-base-content text-lg">Cálculo de Alimentación Colectiva</h3>
          <p className="text-xs text-base-content/70 mt-0.5">Asistente interactivo de 10 pasos nutricionales</p>
        </div>
        <button onClick={onClose} className="text-base-content/50 hover:text-base-content transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Step Indicator */}
      <div className="py-3 bg-base-200 rounded-xl my-3 px-4 flex items-center justify-between text-xs font-semibold text-base-content/70 border border-base-300">
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded ${step === 1 ? "bg-primary text-primary-content font-bold" : "bg-base-300 text-base-content/70"}`}>
            1. Demografía
          </span>
          <span className={`px-2 py-1 rounded ${step === 2 ? "bg-primary text-primary-content font-bold" : "bg-base-300 text-base-content/70"}`}>
            2. Actividad y VCT
          </span>
          <span className={`px-2 py-1 rounded ${step === 3 ? "bg-primary text-primary-content font-bold" : "bg-base-300 text-base-content/70"}`}>
            3. Comidas y Macros
          </span>
        </div>
        <span className="text-base-content/50">Paso {step} de 3</span>
      </div>

      {/* Body Content */}
      <div className="py-2 flex-1 overflow-y-auto space-y-4 max-h-[85vh] w-full">
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-start gap-2">
            <Info size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Demographics */}
        {step === 1 && (
          <div className="space-y-4 w-full">
            <div>
              <label className="block text-xs font-bold text-base-content uppercase tracking-wider mb-1.5">
                Nombre/Título del Cálculo
              </label>
              <input
                type="text"
                placeholder="Ej. Comedor Escolar La Salle (119 personas)"
                className="w-full px-3.5 py-2 border border-base-300 rounded-xl bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-base-content transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-base-content uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Users size={14} className="text-base-content/50" /> Cantidad Mujeres (Fem)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3.5 py-2 border border-base-300 rounded-xl bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-base-content transition-all"
                  value={femaleCount}
                  onChange={(e) => setFemaleCount(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-base-content uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Users size={14} className="text-base-content/50" /> Cantidad Hombres (Masc)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3.5 py-2 border border-base-300 rounded-xl bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-base-content transition-all"
                  value={maleCount}
                  onChange={(e) => setMaleCount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-base-content uppercase tracking-wider">
                  Muestra de Pesos (kg, separados por comas)
                </label>
                <button
                  type="button"
                  onClick={generateMockSample}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Cargar Muestra Benchmark
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="Ej. 50, 60, 52, 48, 55"
                className="w-full px-3.5 py-2 border border-base-300 rounded-xl bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-base-content transition-all font-mono"
                value={sampleWeightsStr}
                onChange={(e) => setSampleWeightsStr(e.target.value)}
              />
              <p className="text-base-content/50 text-[10px] mt-1">
                Ingresa los pesos reales pesados de la muestra para calcular el peso promedio grupal de forma representativa.
              </p>
            </div>

            {/* Quick Summary Card */}
            <div className="p-4 bg-base-200 rounded-2xl border border-base-300 grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-base-content/50">Población Total</span>
                <div className="text-lg font-bold text-base-content">{femaleCount + maleCount} personas</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-base-content/50">Peso Promedio</span>
                <div className="text-lg font-bold text-base-content">{averageWeight} kg</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Activity Level and VCT */}
        {step === 2 && (
          <div className="space-y-4 w-full">
            <div>
              <label className="block text-xs font-bold text-base-content uppercase tracking-wider mb-2 flex items-center gap-1">
                <Activity size={14} className="text-base-content/50" /> Nivel de Actividad Física Colectiva
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "SEDENTARY", title: "Sedentario", desc: "20% (Baja actividad)" },
                  { key: "MODERATE", title: "Moderado", desc: "30% (Benchmark estándar)" },
                  { key: "ACTIVE", title: "Activo", desc: "50% (Trabajo físico/atletas)" },
                  { key: "CUSTOM", title: "Personalizado", desc: "Ingresar factor manual" },
                ].map((act) => (
                  <button
                    key={act.key}
                    type="button"
                    onClick={() => setActivityLevel(act.key as any)}
                    className={`p-3 text-left border rounded-xl transition-all ${
                      activityLevel === act.key
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-base-300 hover:bg-base-200 bg-base-100"
                    }`}
                  >
                    <div className="text-xs font-bold text-base-content">{act.title}</div>
                    <div className="text-[10px] text-base-content/50 mt-0.5">{act.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {activityLevel === "CUSTOM" && (
              <div>
                <label className="block text-xs font-bold text-base-content uppercase tracking-wider mb-1.5">
                  Factor de Gasto Personalizado (%)
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3.5 py-2 border border-base-300 rounded-xl bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-base-content transition-all"
                  value={customKcalPerKg}
                  onChange={(e) => setCustomKcalPerKg(parseInt(e.target.value) || 0)}
                />
              </div>
            )}

            {/* VCT Result Card */}
            <div className="p-5 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl shadow-sm space-y-2">
              <div className="text-xs uppercase font-semibold text-indigo-200 tracking-wider">
                Valor Calórico Total (VCT) Estimado por Persona
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">{vct}</span>
                <span className="text-sm text-indigo-200">kcal / día</span>
              </div>
              <p className="text-[10px] text-indigo-100/90 leading-relaxed pt-1">
                * Fórmulas aplicadas: Base Poblacional ({Math.round((femaleCount + maleCount) / 2)}) × Factor de Actividad (
                {activityLevel === "SEDENTARY" ? "20%" : activityLevel === "MODERATE" ? "30%" : activityLevel === "ACTIVE" ? "50%" : `${customKcalPerKg}%`}).
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: Meals and Macros Distribution */}
        {step === 3 && (
          <div className="space-y-4 w-full">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-xl text-[10px] leading-relaxed flex gap-2">
              <Info size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Importante:</strong> Las sumas de la distribución de comidas deben dar exactamente 100%. A su vez, los macros de cada comida (Proteínas + Grasas + Carbohidratos) también deben sumar 100%.
              </span>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-xl text-[10px] leading-relaxed flex gap-2">
              <Info size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                Los alimentos no están exentos del factor de desecho (mermas). Se sugiere al nutricionista tomar este factor en consideración al planificar el pedido.
              </span>
            </div>

            <div className="space-y-4 divide-y divide-base-300">
              {meals.map((meal, idx) => (
                <div key={meal.name} className={`${idx > 0 ? "pt-4" : ""} space-y-3`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-base-content flex items-center gap-1.5">
                      <Coffee size={14} className="text-primary" /> {meal.name}
                      {meal.name === "Merienda" && (
                        <span className="text-[10px] font-semibold text-base-content/50 normal-case bg-base-300 px-1.5 py-0.5 rounded">
                          (opcional)
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-base-content/70">Distribución de Kcal:</span>
                      <input
                        type="number"
                        className="w-14 px-1.5 py-0.5 border border-base-300 rounded-lg text-center text-xs font-bold bg-base-200 focus:bg-base-100 focus:border-primary text-base-content outline-none"
                        value={meal.percentage}
                        onChange={(e) => handleMealChange(idx, "percentage", parseInt(e.target.value) || 0)}
                      />
                      <span className="text-xs font-bold text-base-content/70">%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-base-content/70 uppercase mb-1">Proteínas</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border border-base-300 rounded-lg text-center text-xs font-semibold bg-base-200 focus:bg-base-100 focus:border-primary text-base-content outline-none"
                        value={meal.proteinPercentage}
                        onChange={(e) => handleMealChange(idx, "proteinPercentage", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-base-content/70 uppercase mb-1">Grasas</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border border-base-300 rounded-lg text-center text-xs font-semibold bg-base-200 focus:bg-base-100 focus:border-primary text-base-content outline-none"
                        value={meal.fatPercentage}
                        onChange={(e) => handleMealChange(idx, "fatPercentage", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-base-content/70 uppercase mb-1">Carbohidratos</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border border-base-300 rounded-lg text-center text-xs font-semibold bg-base-200 focus:bg-base-100 focus:border-primary text-base-content outline-none"
                        value={meal.carbsPercentage}
                        onChange={(e) => handleMealChange(idx, "carbsPercentage", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals validator footer */}
            <div className="p-3 bg-base-200 rounded-xl border border-base-300 flex items-center justify-between text-xs">
              <div>
                <span className="text-base-content/70 font-medium">Suma Comidas:</span>{" "}
                <span className={`font-bold ${meals.reduce((s, m) => s + m.percentage, 0) === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {meals.reduce((s, m) => s + m.percentage, 0)}% / 100%
                </span>
              </div>
              <div className="text-[10px] text-base-content/50">
                Macros pre-cargados al 15% P, 35% G, 50% C.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-base-300 flex justify-between items-center mt-2">
        {step > 1 ? (
          <button
            onClick={handlePrev}
            type="button"
            className="px-4 py-2 text-xs font-bold text-base-content/70 hover:bg-base-200 rounded-xl transition-colors"
          >
            Atrás
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            onClick={handleNext}
            type="button"
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-content text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            Siguiente <Play size={12} className="fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            type="button"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {loading ? "Calculando..." : "Crear Simulación"}
          </button>
        )}
      </div>
    </div>
  );
}
