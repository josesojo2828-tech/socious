"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { trackCalculatorUse } from "@/features/calculadora/lib/tracking";
import {
  MEAL_MOMENTS,
  defaultSplits,
  sumMealSplits,
  type MealKey,
} from "@/features/calculadora/lib/meal-moments";
import {
  calculateSchofieldTmb,
  getGrowthCostPercent,
  PEDIATRIC_ACTIVITY_FACTORS,
} from "@/features/nutringest/patient/lib/pediatric-calculation.engine";
import {
  ArrowLeft,
  Calculator,
  Info,
  CheckCircle,
  Copy,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Activity,
  Award,
  Sparkles,
  RefreshCw,
  Home,
  Bookmark,
  Trash2,
  PieChart,
  UtensilsCrossed,
  Layers,
  Scale
} from "lucide-react";
import { useTranslation } from "@/context/i18n.context";

// Definición de tipos
type Gender = "MALE" | "FEMALE";
type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
type Goal = "LOSE_WEIGHT" | "MAINTAIN" | "GAIN_MUSCLE";
type DietType = "BALANCED" | "LOW_CARB" | "HIGH_PROTEIN" | "KETO" | "CUSTOM";
type WeightSource = "current" | "ideal" | "adjusted";

interface MacroSplit {
  protein: number; // porcentaje
  carbs: number;   // porcentaje
  fat: number;     // porcentaje
}

interface FoodGroupItem {
  id: string;
  name: string;
  category: string;
  prot: number;
  carbs: number;
  fat: number;
  kcal: number;
}

const DIET_PRESETS: Record<Exclude<DietType, "CUSTOM">, MacroSplit> = {
  BALANCED: { protein: 30, carbs: 40, fat: 30 },
  LOW_CARB: { protein: 40, carbs: 20, fat: 40 },
  HIGH_PROTEIN: { protein: 40, carbs: 35, fat: 25 },
  KETO: { protein: 25, carbs: 5, fat: 70 },
};

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

const FOOD_GROUPS_CATALOG: FoodGroupItem[] = [
  { id: "milk_skim", name: "Leche Descremada", category: "Lácteos", prot: 9, carbs: 12, fat: 2, kcal: 100 },
  { id: "milk_whole", name: "Leche Entera", category: "Lácteos", prot: 9, carbs: 12, fat: 8, kcal: 150 },
  { id: "vegetables", name: "Vegetales / Verduras", category: "Verduras", prot: 2, carbs: 4, fat: 0, kcal: 25 },
  { id: "fruits", name: "Frutas", category: "Frutas", prot: 0, carbs: 15, fat: 0, kcal: 60 },
  { id: "starches", name: "Harinas y Cereales", category: "Carbohidratos", prot: 2, carbs: 15, fat: 1, kcal: 80 },
  { id: "meats_lean", name: "Carnes Magras / Huevo", category: "Proteínas", prot: 7, carbs: 0, fat: 3, kcal: 55 },
  { id: "meats_fat", name: "Carnes Semigrasas / Quesos", category: "Proteínas", prot: 7, carbs: 0, fat: 5, kcal: 75 },
  { id: "fats", name: "Grasas y Aceites", category: "Grasas", prot: 0, carbs: 0, fat: 5, kcal: 45 },
  { id: "sugars", name: "Azúcares Simples", category: "Azúcares", prot: 0, carbs: 10, fat: 0, kcal: 40 },
];

export default function CalculadoraPage() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showFormulaBreakdown, setShowFormulaBreakdown] = useState(false);
  
  // Estado para el historial
  const [history, setHistory] = useState<any[]>([]);

  // Estados del formulario
  const [gender, setGender] = useState<Gender>("MALE");
  const [ageInput, setAgeInput] = useState<string>("28");
  const [weightInput, setWeightInput] = useState<string>("80");
  const [heightInput, setHeightInput] = useState<string>("180");

  // Selector de peso para cálculo energético
  const [weightSource, setWeightSource] = useState<WeightSource>("current");

  // Valores numéricos derivados (con fallback seguro para cálculos)
  const age = parseFloat(ageInput) || 0;
  const weight = parseFloat(weightInput) || 0;
  const height = parseFloat(heightInput) || 0;

  // Límites de los inputs según edad y copy pediátrico del selector de actividad
  const isInfantInput = age > 0 && age < 10;
  const minWeightKg = isInfantInput ? 2 : 30;
  const minHeightCm = isInfantInput ? 40 : 100;
  const isPediatricAge = age > 0 && age < 18;
  const pediatricGrowthPercent = isPediatricAge ? getGrowthCostPercent(age) : 0;

  const activityOptions: Array<{ id: ActivityLevel; name: string; desc: string }> = isPediatricAge
    ? [
        { id: "SEDENTARY", name: "Sedentario", desc: "FA 1.25 — banda FAO 1.2-1.3" },
        { id: "LIGHT", name: "Poco activo", desc: "FA 1.45 — banda FAO 1.4-1.5" },
        { id: "MODERATE", name: "Activo", desc: "FA 1.65 — banda FAO 1.6-1.7" },
        { id: "ACTIVE", name: "Muy activo", desc: "FA 1.90 — banda FAO 1.8-2.0" },
        { id: "VERY_ACTIVE", name: "Atleta", desc: "FA 2.00 — banda FAO 1.8-2.0" },
      ]
    : [
        { id: "SEDENTARY", name: "Sedentario", desc: "Poco o nada de ejercicio diario" },
        { id: "LIGHT", name: "Actividad Ligera", desc: "Ejercicio ligero 1-3 días/sem" },
        { id: "MODERATE", name: "Actividad Moderada", desc: "Deporte moderado 3-5 días/sem" },
        { id: "ACTIVE", name: "Actividad Intensa", desc: "Entrenamiento fuerte 6-7 días/sem" },
        { id: "VERY_ACTIVE", name: "Atleta o Físico", desc: "Trabajo muy pesado o doble turno" },
      ];

  // Peso ideal (Hamwi) y peso ajustado — cálculo clínico estándar
  const idealWeight = useMemo(() => {
    if (height <= 0) return 0;
    const hw = gender === "MALE"
      ? (height - 152) * 1.08 + 48.5
      : (height - 152) * 0.88 + 45.5;
    return Math.max(0, Number(hw.toFixed(2)));
  }, [gender, height]);

  const adjustedWeight = useMemo(() => {
    if (weight <= 0 || idealWeight <= 0) return 0;
    const aw = (weight - idealWeight) * 0.25 + idealWeight;
    return Number(aw.toFixed(2));
  }, [weight, idealWeight]);

  // Peso efectivo que se usa en las fórmulas de TMB/GET
  const effectiveWeight = weightSource === "ideal" ? idealWeight
    : weightSource === "adjusted" ? adjustedWeight
    : weight;
  const [activity, setActivity] = useState<ActivityLevel>("MODERATE");
  const [goal, setGoal] = useState<Goal>("LOSE_WEIGHT");
  const [deficitPct, setDeficitPct] = useState<number>(0.1);
  
  // Estados de distribución
  const [dietType, setDietType] = useState<DietType>("BALANCED");
  const [customProtein, setCustomProtein] = useState<number>(30);
  const [customCarbs, setCustomCarbs] = useState<number>(40);
  const [customFat, setCustomFat] = useState<number>(30);

  // Proteína manual en g/kg — cuando se llena, sobreescribe el cálculo por porcentaje
  const [proteinGPerKgInput, setProteinGPerKgInput] = useState<string>("");
  const proteinGPerKg = parseFloat(proteinGPerKgInput) || 0;

  // Estado de Distribución por Tiempos de Comida (% por Menú)
  const [mealSplits, setMealSplits] = useState<Record<MealKey, number>>(defaultSplits());

  // Estado para Cuadro de Raciones de Intercambio
  const [exchangeRations, setExchangeRations] = useState<Record<string, number>>({
    milk_skim: 1,
    milk_whole: 0,
    vegetables: 3,
    fruits: 2,
    starches: 5,
    meats_lean: 4,
    meats_fat: 2,
    fats: 3,
    sugars: 0,
  });

  // Resultados calculados
  const [bmr, setBmr] = useState<number>(0);
  const [tdee, setTdee] = useState<number>(0);
  const [targetKcal, setTargetKcal] = useState<number>(0);
  const [macros, setMacros] = useState<{ protein: number; carbs: number; fat: number }>({ protein: 0, carbs: 0, fat: 0 });
  const [raciones, setRaciones] = useState<{ protein: number; carbs: number; fat: number }>({ protein: 0, carbs: 0, fat: 0 });
  const [waterIntake, setWaterIntake] = useState<number>(0);
  const [formIncomplete, setFormIncomplete] = useState(false);
  // Porcentajes mostrados — reflejan g/kg cuando está activo, si no usan el preset
  const [displayProteinPct, setDisplayProteinPct] = useState<number>(30);
  const [displayCarbsPct, setDisplayCarbsPct] = useState<number>(40);
  const [displayFatPct, setDisplayFatPct] = useState<number>(30);

  // Ajustar custom sliders para asegurar que sumen 100%
  const handleCustomMacroChange = (type: "protein" | "carbs" | "fat", value: number) => {
    if (type === "protein") {
      const remaining = 100 - value;
      const sumOther = customCarbs + customFat;
      if (sumOther <= 0) {
        setCustomProtein(value);
        setCustomCarbs(Math.round(remaining / 2));
        setCustomFat(Math.round(remaining / 2));
      } else {
        const factorCarbs = customCarbs / sumOther;
        const factorFat = customFat / sumOther;
        setCustomProtein(value);
        setCustomCarbs(Math.round(remaining * factorCarbs));
        setCustomFat(Math.round(remaining * factorFat));
      }
    } else if (type === "carbs") {
      const remaining = 100 - value;
      const sumOther = customProtein + customFat;
      if (sumOther <= 0) {
        setCustomCarbs(value);
        setCustomProtein(Math.round(remaining / 2));
        setCustomFat(Math.round(remaining / 2));
      } else {
        const factorProtein = customProtein / sumOther;
        const factorFat = customFat / sumOther;
        setCustomCarbs(value);
        setCustomProtein(Math.round(remaining * factorProtein));
        setCustomFat(Math.round(remaining * factorFat));
      }
    } else {
      const remaining = 100 - value;
      const sumOther = customProtein + customCarbs;
      if (sumOther <= 0) {
        setCustomFat(value);
        setCustomProtein(Math.round(remaining / 2));
        setCustomCarbs(Math.round(remaining / 2));
      } else {
        const factorProtein = customProtein / sumOther;
        const factorCarbs = customCarbs / sumOther;
        setCustomFat(value);
        setCustomProtein(Math.round(remaining * factorProtein));
        setCustomCarbs(Math.round(remaining * factorCarbs));
      }
    }
  };

  // Efecto de cálculo en tiempo real
  useEffect(() => {
    // Validar que los datos biométricos estén completos antes de calcular
    const ageNum = parseFloat(ageInput);
    const weightNum = parseFloat(weightInput);
    const heightNum = parseFloat(heightInput);
    const valid = [ageNum, weightNum, heightNum].every((v) => Number.isFinite(v) && v > 0);
    setFormIncomplete(!valid);
    if (!valid) return; // no calcular con valores incompletos

    // 1. Calcular BMR: Schofield en pediatría (< 18 años), Mifflin-St Jeor en adultos
    const effW = effectiveWeight > 0 ? effectiveWeight : weightNum;
    const isPediatric = ageNum < 18;
    const pediatricTmb = isPediatric
      ? calculateSchofieldTmb({ gender, ageYears: ageNum, weightKg: effW })
      : null;
    let calculatedBmr = 0;
    if (pediatricTmb !== null) {
      calculatedBmr = pediatricTmb;
    } else if (gender === "MALE") {
      calculatedBmr = (10 * effW) + (6.25 * heightNum) - (5 * ageNum) + 5;
    } else {
      calculatedBmr = (10 * effW) + (6.25 * heightNum) - (5 * ageNum) - 161;
    }
    setBmr(Math.round(calculatedBmr));

    // 2. Calcular TDEE (en pediatría se suma el costo de crecimiento como % del gasto)
    const factor = isPediatric ? PEDIATRIC_ACTIVITY_FACTORS[activity] : ACTIVITY_FACTORS[activity];
    const growthCostPercent = pediatricTmb !== null ? getGrowthCostPercent(ageNum) : 0;
    const calculatedTdee = calculatedBmr * factor * (1 + growthCostPercent);
    setTdee(Math.round(calculatedTdee));

    // 3. Ajustar calorías según objetivo
    let calculatedTargetKcal = calculatedTdee;
    if (goal === "LOSE_WEIGHT") {
      // Déficit seleccionable por el usuario: 5%, 10% o 15% (con límite de seguridad del 90% del BMR)
      calculatedTargetKcal = Math.max(calculatedBmr * 0.9, calculatedTdee * (1 - deficitPct));
    } else if (goal === "GAIN_MUSCLE") {
      // Superávit de 300 kcal
      calculatedTargetKcal = calculatedTdee + 300;
    }
    setTargetKcal(Math.round(calculatedTargetKcal));

    // 3b. Calcular Hidratación Recomendada
    // Adultos: 35 ml/kg de peso corporal + bonus de entrenamiento (+500 ml).
    // Pediatría (<18): mantenimiento de Holliday-Segar por tramos
    //   hasta 10 kg → 100 ml/kg · de 10 a 20 kg → 50 ml/kg · >20 kg → 20 ml/kg.
    // Se redondea a múltiplo de 50 ml para un número limpio.
    const baseWater = isPediatric
      ? Math.min(effW, 10) * 100 + Math.min(Math.max(effW - 10, 0), 10) * 50 + Math.max(effW - 20, 0) * 20
      : effW * 35;
    const trainingBonus =
      !isPediatric && (activity === "ACTIVE" || activity === "VERY_ACTIVE") ? 500 : 0;
    const roundedWater = Math.round((baseWater + trainingBonus) / 50) * 50;
    setWaterIntake(roundedWater);

    // 4. Calcular gramos de Macronutrientes
    let split: MacroSplit;
    if (dietType === "CUSTOM") {
      // Evitar división por cero si la suma de macros personalizados es 0
      const totalCustom = customProtein + customCarbs + customFat;
      if (totalCustom <= 0) return; // no hay distribución que calcular
      // Ajustar suma para asegurar 100
      const total = customProtein + customCarbs + customFat;
      const pRatio = customProtein / total;
      const cRatio = customCarbs / total;
      const fRatio = customFat / total;
      split = { protein: pRatio * 100, carbs: cRatio * 100, fat: fRatio * 100 };
    } else {
      split = DIET_PRESETS[dietType];
    }

    let proteinGrams: number, carbsGrams: number, fatGrams: number;
    let displaySplit: MacroSplit = split;

    if (proteinGPerKg > 0 && weightNum > 0) {
      // Proteína fijada en g/kg — sobreescribe el porcentaje
      proteinGrams = proteinGPerKg * weightNum;
      const proteinKcal = proteinGrams * 4;
      const remainingKcal = Math.max(0, calculatedTargetKcal - proteinKcal);
      const carbsFatTotal = split.carbs + split.fat;
      carbsGrams = carbsFatTotal > 0 ? (remainingKcal * (split.carbs / carbsFatTotal)) / 4 : 0;
      fatGrams = carbsFatTotal > 0 ? (remainingKcal * (split.fat / carbsFatTotal)) / 9 : 0;
      // Porcentajes reales para la visualización
      if (calculatedTargetKcal > 0) {
        displaySplit = {
          protein: (proteinKcal / calculatedTargetKcal) * 100,
          carbs: (carbsGrams * 4 / calculatedTargetKcal) * 100,
          fat: (fatGrams * 9 / calculatedTargetKcal) * 100,
        };
      }
    } else {
      proteinGrams = (calculatedTargetKcal * (split.protein / 100)) / 4;
      carbsGrams = (calculatedTargetKcal * (split.carbs / 100)) / 4;
      fatGrams = (calculatedTargetKcal * (split.fat / 100)) / 9;
    }

    setMacros({
      protein: Math.round(proteinGrams),
      carbs: Math.round(carbsGrams),
      fat: Math.round(fatGrams)
    });
    // Usar displaySplit para los porcentajes mostrados (refleja g/kg si está activo)
    if (proteinGPerKg > 0 && weightNum > 0) {
      setDisplayProteinPct(Math.round(displaySplit.protein));
      setDisplayCarbsPct(Math.round(displaySplit.carbs));
      setDisplayFatPct(Math.round(displaySplit.fat));
    }

    // 5. Calcular Raciones (Exchanges)
    // Constantes: Proteínas ÷ 7, Grasas ÷ 5, Carbohidratos ÷ 15
    setRaciones({
      protein: Math.round(proteinGrams / 7),
      carbs: Math.round(carbsGrams / 15),
      fat: Math.round(fatGrams / 5)
    });

    trackCalculatorUse(
      'pacientes',
      { gender, age, weightKg: weight, effectiveWeightKg: effW, weightSource, heightCm: height, activity, goal, deficitPct, dietType },
      { bmr: Math.round(calculatedBmr), tdee: Math.round(calculatedTdee), targetKcal: Math.round(calculatedTargetKcal), waterIntake: roundedWater, proteinG: Math.round(proteinGrams), carbsG: Math.round(carbsGrams), fatsG: Math.round(fatGrams) },
      'public',
    );
  }, [gender, age, weight, height, activity, goal, deficitPct, dietType, customProtein, customCarbs, customFat, effectiveWeight, weightSource, proteinGPerKg]);

  // Totales aportados por la tabla de raciones (Lista de Intercambio)
  const totalExchangeProt = FOOD_GROUPS_CATALOG.reduce((acc, item) => acc + (exchangeRations[item.id] || 0) * item.prot, 0);
  const totalExchangeCarbs = FOOD_GROUPS_CATALOG.reduce((acc, item) => acc + (exchangeRations[item.id] || 0) * item.carbs, 0);
  const totalExchangeFat = FOOD_GROUPS_CATALOG.reduce((acc, item) => acc + (exchangeRations[item.id] || 0) * item.fat, 0);
  const totalExchangeKcal = FOOD_GROUPS_CATALOG.reduce((acc, item) => acc + (exchangeRations[item.id] || 0) * item.kcal, 0);

  // % de Adecuación Nutricional (Aportado vs Meta)
  const adequacyKcal = Number.isFinite(targetKcal) && targetKcal > 0 ? Math.round((totalExchangeKcal / targetKcal) * 100) : 0;
  const adequacyProt = Number.isFinite(macros.protein) && macros.protein > 0 ? Math.round((totalExchangeProt / macros.protein) * 100) : 0;
  const adequacyCarbs = Number.isFinite(macros.carbs) && macros.carbs > 0 ? Math.round((totalExchangeCarbs / macros.carbs) * 100) : 0;
  const adequacyFat = Number.isFinite(macros.fat) && macros.fat > 0 ? Math.round((totalExchangeFat / macros.fat) * 100) : 0;

  // Suma de porcentajes de tiempos de comida
  const totalMealPercent = sumMealSplits(mealSplits);

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("No se pudo copiar usando fallback: ", err);
    }
    document.body.removeChild(textArea);
  };

  const copyToClipboard = () => {
    const dietLabel = 
      dietType === "BALANCED" ? "Equilibrada" :
      dietType === "LOW_CARB" ? "Baja en Carbohidratos" :
      dietType === "HIGH_PROTEIN" ? "Alta en Proteínas" :
      dietType === "KETO" ? "Cetogénica (Keto)" : "Personalizada";

    const split = dietType === "CUSTOM" 
      ? { protein: customProtein, carbs: customCarbs, fat: customFat }
      : DIET_PRESETS[dietType];

    const text = `RESUMEN DE MACRONUTRIENTES - NUTRINGEST
-----------------------------------------
Datos ingresados:
  - Sexo: ${gender === "MALE" ? "Masculino" : "Femenino"}
  - Edad: ${age} años
  - Peso actual: ${weight} kg${weightSource !== "current" ? ` (cálculo con peso ${weightSource === "ideal" ? "ideal" : "ajustado"}: ${(weightSource === "ideal" ? idealWeight : adjustedWeight).toFixed(1)} kg)` : ""}
  - Altura: ${height} cm
  - Actividad: ${activity === "SEDENTARY" ? "Sedentario" : activity === "LIGHT" ? "Ligero" : activity === "MODERATE" ? "Moderado" : activity === "ACTIVE" ? "Activo" : "Muy Activo"}

Meta Calórica: ${targetKcal.toLocaleString()} kcal / día
Gasto Estimado (TDEE): ${tdee.toLocaleString()} kcal
Tasa Basal (BMR): ${bmr.toLocaleString()} kcal

Distribución de Macros (${dietLabel}):
  - Proteínas: ${macros.protein}g (${Math.round(split.protein)}%${weight > 0 ? ` · ${(macros.protein / weight).toFixed(1)} g/kg` : ""}) | ${raciones.protein} raciones
  - Carbohidratos: ${macros.carbs}g (${Math.round(split.carbs)}%${weight > 0 ? ` · ${(macros.carbs / weight).toFixed(1)} g/kg` : ""}) | ${raciones.carbs} raciones
  - Grasas: ${macros.fat}g (${Math.round(split.fat)}%${weight > 0 ? ` · ${(macros.fat / weight).toFixed(1)} g/kg` : ""}) | ${raciones.fat} raciones

Hidratación: ${(waterIntake / 1000).toFixed(1)} L/día

Calculado en Nutringest.com`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch((err) => {
          console.error("Error copiando con API clipboard, usando fallback...", err);
          fallbackCopyTextToClipboard(text);
        });
    } else {
      fallbackCopyTextToClipboard(text);
    }
  };

  // Cargar historial desde localStorage al iniciar
  useEffect(() => {
    const saved = localStorage.getItem("nutringest_macro_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error al cargar historial local:", e);
      }
    }
  }, []);

  const saveCalculation = () => {
    const split = dietType === "CUSTOM" 
      ? { protein: customProtein, carbs: customCarbs, fat: customFat }
      : DIET_PRESETS[dietType];

    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      gender,
      age,
      weight,
      height,
      activity,
      goal,
      dietType,
      customProtein,
      customCarbs,
      customFat,
      targetKcal,
      bmr,
      tdee,
      macros,
      split
    };

    const updated = [newEntry, ...history];
    setHistory(updated);
    localStorage.setItem("nutringest_macro_history", JSON.stringify(updated));
  };

  const loadCalculation = (entry: any) => {
    setGender(entry.gender);
    setAgeInput(String(entry.age));
    setWeightInput(String(entry.weight));
    setHeightInput(String(entry.height));
    setActivity(entry.activity);
    setGoal(entry.goal);
    setDietType(entry.dietType);
    if (entry.dietType === "CUSTOM") {
      setCustomProtein(entry.customProtein || 30);
      setCustomCarbs(entry.customCarbs || 40);
      setCustomFat(entry.customFat || 30);
    }
    // Desplazar suavemente el scroll hacia arriba para ver los resultados cargados
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCalculation = (id: string) => {
    const updated = history.filter((entry) => entry.id !== id);
    setHistory(updated);
    localStorage.setItem("nutringest_macro_history", JSON.stringify(updated));
  };

  const currentSplit = dietType === "CUSTOM" 
    ? { protein: customProtein, carbs: customCarbs, fat: customFat }
    : DIET_PRESETS[dietType];

  // Cuando proteína g/kg está activo, mostrar los porcentajes reales calculados
  const gPerKgActive = proteinGPerKg > 0 && weight > 0 && !formIncomplete;
  const showSplit = gPerKgActive
    ? { protein: displayProteinPct, carbs: displayCarbsPct, fat: displayFatPct }
    : currentSplit;

  return (
    <div className="min-h-screen bg-base-200 text-base-content font-sans overflow-x-hidden relative selection:bg-primary selection:text-white">
      
      {/* Background blobs for premium depth */}
      <div className="absolute top-0 right-0 -z-10 opacity-30 translate-x-1/4 -translate-y-1/4 pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-[#2b0c4f]/15 blur-[150px]" />
      </div>
      <div className="absolute top-[20%] left-0 -z-10 opacity-25 -translate-x-1/3 pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-primary/10 blur-[130px]" />
      </div>
      <div className="absolute bottom-[20%] right-0 -z-10 opacity-20 translate-x-1/3 pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-[#2b0c4f]/10 blur-[150px]" />
      </div>

      {/* Mini Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 lg:px-20 py-4 bg-base-100/95 backdrop-blur-md border-b border-base-300 flex justify-between items-center shadow-sm">
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/png/IsologoAzul.png"
            alt="Nutringest Logo"
            className="w-10 h-auto group-hover:scale-105 transition-transform"
          />
          <span className="font-display text-xl font-extrabold tracking-tight text-primary uppercase">
            Nutringest
          </span>
        </Link>

        <div className="flex gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-base-content/60 hover:text-primary transition-colors bg-base-200 hover:bg-base-300 border border-base-300 px-4 py-2 rounded-2xl"
          >
            <Home size={15} />
            <span className="hidden sm:inline">Volver al Inicio</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-20 pt-28 pb-20 max-w-7xl relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/10 px-4 py-1.5 rounded-full">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Herramientas Gratuitas
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black leading-tight text-base-content">
            Calculadora de <span className="text-primary relative">Macros & Calorías<span className="absolute bottom-1 left-0 w-full h-[6px] bg-primary/10 -z-10 rounded-full" /></span>
          </h1>
          <p className="text-base-content/60 text-base sm:text-lg max-w-xl mx-auto font-medium">
            Definí tus objetivos nutricionales utilizando fórmulas de precisión clínica. Ajustá tu dieta y macros al instante.
          </p>
        </div>

        {/* Layout de 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Columna Izquierda: Formulario (7 cols) */}
          <div className="lg:col-span-7 bg-base-100 border border-base-300 rounded-[2.5rem] p-6 sm:p-8 space-y-8 shadow-xl shadow-base-300/50">
            
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-base-content mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                1. Introducí tus Datos Biométricos
              </h2>
              <div className="w-full h-px bg-base-200" />
            </div>

            {/* Input de Género */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-base-content/80 block">Género Biológico</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setGender("MALE")}
                  className={`py-4 px-6 rounded-2xl border font-bold flex items-center justify-center gap-3 transition-all ${
                    gender === "MALE"
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/20 scale-102"
                      : "bg-base-200 border-base-300 text-base-content/60 hover:bg-base-200 hover:text-base-content"
                  }`}
                >
                  Hombre
                </button>
                <button
                  type="button"
                  onClick={() => setGender("FEMALE")}
                  className={`py-4 px-6 rounded-2xl border font-bold flex items-center justify-center gap-3 transition-all ${
                    gender === "FEMALE"
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/20 scale-102"
                      : "bg-base-200 border-base-300 text-base-content/60 hover:bg-base-200 hover:text-base-content"
                  }`}
                >
                  Mujer
                </button>
              </div>
            </div>

            {/* Inputs de Edad, Peso y Altura */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Edad */}
              <div className="space-y-2">
                <label htmlFor="age" className="text-sm font-semibold text-base-content/80 block">Edad (años)</label>
                <div className="relative">
                  <input
                    id="age"
                    type="number"
                    min="0.1"
                  step="0.1"
                    max="100"
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
                    onBlur={() => {
                      const v = parseFloat(ageInput);
                      if (!v || v < 0.1) setAgeInput("0.1");
                      else if (v > 100) setAgeInput("100");
                    }}
                    className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3.5 px-4 text-base-content font-bold transition-all text-center text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-base-content/60 font-bold pointer-events-none">años</span>
                </div>
              </div>

              {/* Peso */}
              <div className="space-y-2">
                <label htmlFor="weight" className="text-sm font-semibold text-base-content/80 block">Peso actual (kg)</label>
                <div className="relative">
                  <input
                    id="weight"
                    type="number"
                    min={String(minWeightKg)}
                    max="250"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    onBlur={() => {
                      const v = parseFloat(weightInput);
                      if (!v || v < minWeightKg) setWeightInput(String(minWeightKg));
                      else if (v > 250) setWeightInput("250");
                    }}
                    className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3.5 px-4 text-base-content font-bold transition-all text-center text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-base-content/60 font-bold pointer-events-none">kg</span>
                </div>
              </div>

              {/* Altura */}
              <div className="space-y-2">
                <label htmlFor="height" className="text-sm font-semibold text-base-content/80 block">Altura (cm)</label>
                <div className="relative">
                  <input
                    id="height"
                    type="number"
                    min={String(minHeightCm)}
                    max="250"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    onBlur={() => {
                      const v = parseInt(heightInput);
                      if (!v || v < minHeightCm) setHeightInput(String(minHeightCm));
                      else if (v > 250) setHeightInput("250");
                    }}
                    className="w-full bg-base-200 border border-base-300 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-base-100 outline-none rounded-2xl py-3.5 px-4 text-base-content font-bold transition-all text-center text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-base-content/60 font-bold pointer-events-none">cm</span>
                </div>
              </div>

            </div>

            {/* Selector de peso para cálculo energético */}
            {weight > 0 && height > 0 && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-base-content/80 block">Peso para el cálculo energético</label>
                  <p className="text-xs text-base-content/60 mt-1">
                    Desnutrición: usar peso ideal. Obesidad: usar peso ajustado.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "current" as WeightSource, name: "Actual", value: weight },
                    { id: "ideal" as WeightSource, name: "Ideal (Hamwi)", value: idealWeight },
                    { id: "adjusted" as WeightSource, name: "Ajustado", value: adjustedWeight },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setWeightSource(opt.id)}
                      className={`py-3 px-3 rounded-2xl border transition-all flex flex-col items-center gap-0.5 ${
                        weightSource === opt.id
                          ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                          : "bg-base-200 border-base-300 text-base-content/60 hover:bg-base-200"
                      }`}
                    >
                      <span className="text-xs font-semibold">{opt.name}</span>
                      <span className="text-lg font-black">{opt.value.toFixed(1)} kg</span>
                    </button>
                  ))}
                </div>
                {weightSource !== "current" && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 font-medium">
                    Las fórmulas de TMB, GET e hidratación usan {weightSource === "ideal" ? "el peso ideal" : "el peso ajustado"} ({(weightSource === "ideal" ? idealWeight : adjustedWeight).toFixed(1)} kg) en lugar del peso actual. Los macronutrientes en g/kg se calculan sobre el peso actual.
                  </p>
                )}
              </div>
            )}

            {/* Nivel de Actividad */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-base-content/80 block">Nivel de Actividad Física</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activityOptions.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setActivity(act.id as ActivityLevel)}
                    className={`p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                      activity === act.id
                        ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                        : "bg-base-200 border-base-300 text-base-content hover:bg-base-200"
                    }`}
                  >
                    <span className="font-bold text-sm">{act.name}</span>
                    <span className={`text-[11px] ${activity === act.id ? "text-white/85" : "text-base-content/60"}`}>{act.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Objetivo */}
            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-base-content mb-2">
                  <Activity className="w-5 h-5 text-primary" />
                  2. Definí tu Objetivo
                </h2>
                <div className="w-full h-px bg-base-200" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: "LOSE_WEIGHT", name: "Perder Peso", icon: <TrendingDown size={18} />, color: "hover:border-primary" },
                  { id: "MAINTAIN", name: "Mantener Peso", icon: <RefreshCw size={16} />, color: "hover:border-primary" },
                  { id: "GAIN_MUSCLE", name: "Ganar Músculo", icon: <TrendingUp size={18} />, color: "hover:border-primary" }
                ].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setGoal(o.id as Goal)}
                    className={`py-4 px-4 rounded-2xl border font-bold flex items-center justify-center gap-2 transition-all ${
                      goal === o.id
                        ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                        : `bg-base-200 border-base-300 text-base-content/60 hover:bg-base-200 ${o.color}`
                    }`}
                  >
                    {o.icon}
                    <span className="text-sm">{o.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {goal === "LOSE_WEIGHT" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold flex items-center gap-2 text-base-content">
                    <TrendingDown className="w-5 h-5 text-primary" />
                    Déficit Calórico
                  </h3>
                  <p className="text-sm text-base-content/60 mt-1">Seleccioná el porcentaje de déficit sobre tu TDEE.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { value: 0.05, name: "5%" },
                    { value: 0.1, name: "10%" },
                    { value: 0.15, name: "15%" }
                  ].map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setDeficitPct(o.value)}
                      className={`py-4 px-4 rounded-2xl border font-bold flex items-center justify-center gap-2 transition-all ${
                        deficitPct === o.value
                          ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                          : "bg-base-200 border-base-300 text-base-content/60 hover:bg-base-200"
                      }`}
                    >
                      <span className="text-sm">{o.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Configuración de Dieta */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-base-content mb-2">
                  <Award className="w-5 h-5 text-primary" />
                  3. Distribución de Macronutrientes
                </h2>
                <div className="w-full h-px bg-base-200" />
              </div>

              {/* Selector de Presets */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "BALANCED", name: "Equilibrada" },
                  { id: "LOW_CARB", name: "Baja en Carbos" },
                  { id: "HIGH_PROTEIN", name: "Alta Proteína" },
                  { id: "KETO", name: "Keto" },
                  { id: "CUSTOM", name: "Personalizada" }
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setDietType(type.id as DietType)}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      dietType === type.id
                        ? "bg-primary text-white border-primary font-black shadow-sm"
                        : "bg-base-200 border-base-300 text-base-content/60 hover:bg-base-300"
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>

              {/* Sliders para dieta Personalizada */}
              <AnimatePresence mode="wait">
                {dietType === "CUSTOM" && (
                  <motion.div
                    key="calculadora-custom-diet-sliders"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 p-5 bg-base-200 rounded-2xl border border-base-300 overflow-hidden"
                  >
                    <div className="flex justify-between items-center text-xs font-semibold text-base-content/60 mb-2">
                      <span>Ajustá los porcentajes (deben sumar 100%)</span>
                      <span className={`font-bold ${customProtein + customCarbs + customFat === 100 ? "text-primary" : "text-amber-600"}`}>
                        Suma: {customProtein + customCarbs + customFat}%
                      </span>
                    </div>

                    {/* Proteína Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-base-content/80">Proteínas</span>
                        <div className="flex items-center gap-1 font-black text-primary">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={customProtein === 0 ? "" : String(customProtein)}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                              const val = clean === "" ? 0 : Math.min(100, parseInt(clean, 10));
                              handleCustomMacroChange("protein", val);
                            }}
                            className="w-12 text-center bg-base-100 border border-base-300 rounded-lg py-0.5 px-1 font-bold text-primary text-xs outline-none focus:border-primary"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="70"
                        value={customProtein}
                        onChange={(e) => handleCustomMacroChange("protein", parseInt(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>

                    {/* Carbos Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-base-content/80">Carbohidratos</span>
                        <div className="flex items-center gap-1 font-black text-sky-500">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={customCarbs === 0 ? "" : String(customCarbs)}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                              const val = clean === "" ? 0 : Math.min(100, parseInt(clean, 10));
                              handleCustomMacroChange("carbs", val);
                            }}
                            className="w-12 text-center bg-base-100 border border-base-300 rounded-lg py-0.5 px-1 font-bold text-sky-500 text-xs outline-none focus:border-sky-500"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="75"
                        value={customCarbs}
                        onChange={(e) => handleCustomMacroChange("carbs", parseInt(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>

                    {/* Grasas Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-base-content/80">Grasas</span>
                        <div className="flex items-center gap-1 font-black text-amber-500">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={customFat === 0 ? "" : String(customFat)}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                              const val = clean === "" ? 0 : Math.min(100, parseInt(clean, 10));
                              handleCustomMacroChange("fat", val);
                            }}
                            className="w-12 text-center bg-base-100 border border-base-300 rounded-lg py-0.5 px-1 font-bold text-amber-500 text-xs outline-none focus:border-amber-500"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="80"
                        value={customFat}
                        onChange={(e) => handleCustomMacroChange("fat", parseInt(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 4. Distribución por Tiempos de Comida (% por Menú) */}
            <div className="space-y-4 pt-4 border-t border-base-300">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-base-content">
                    <PieChart className="w-5 h-5 text-primary" />
                    4. Distribución por Menú (% por Comida)
                  </h2>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                    totalMealPercent === 100 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    Total: {totalMealPercent}%
                  </span>
                </div>
                <p className="text-xs text-base-content/60">
                  Asigná el porcentaje del requerimiento diario para cada tiempo de comida.
                </p>
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2 font-medium">
                  Distribución estimada de tus comidas. Los sliders ajustan la repartición mostrada abajo, sin modificar tus macros diarios.
                </p>
                <div className="w-full h-px bg-base-200 mt-2" />
              </div>

              {/* Controles de Porcentaje por Comida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MEAL_MOMENTS.map((meal) => {
                  const mKey = meal.key;
                  const currentPercent = mealSplits[mKey];
                  const mKcal = Math.round(targetKcal * (currentPercent / 100));
                  const mProt = Math.round(macros.protein * (currentPercent / 100));
                  const mCarbs = Math.round(macros.carbs * (currentPercent / 100));
                  const mFat = Math.round(macros.fat * (currentPercent / 100));

                  return (
                    <div key={meal.key} className="bg-base-200 border border-base-300/80 p-4 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className={`font-bold text-sm ${meal.color}`}>{meal.label}</span>
                        <div className="flex items-center gap-1 font-black text-base-content">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={currentPercent === 0 ? "" : String(currentPercent)}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                              const val = clean === "" ? 0 : Math.min(100, parseInt(clean, 10));
                              setMealSplits({ ...mealSplits, [mKey]: val });
                            }}
                            className="w-12 text-center bg-base-100 border border-base-300 rounded-lg py-0.5 px-1 font-bold text-base-content text-xs outline-none focus:border-primary"
                          />
                          <span>%</span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={currentPercent}
                        onChange={(e) => setMealSplits({ ...mealSplits, [mKey]: Number(e.target.value) })}
                        className={`w-full ${meal.accent}`}
                      />

                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-semibold text-base-content/60 border-t border-base-300/60">
                        <div><span className="text-base-content font-bold">{formIncomplete ? "—" : mKcal}</span> kcal</div>
                        <div>P: <span className="text-primary font-bold">{formIncomplete ? "—" : `${mProt}g`}</span></div>
                        <div>C: <span className="text-sky-600 font-bold">{formIncomplete ? "—" : `${mCarbs}g`}</span></div>
                        <div>G: <span className="text-amber-600 font-bold">{formIncomplete ? "—" : `${mFat}g`}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Verificación de suma de porcentajes */}
              {totalMealPercent !== 100 && (
                <p className="text-xs text-amber-700 font-medium">
                  Los porcentajes suman {totalMealPercent}% — ajustá para llegar a 100%.
                </p>
              )}
            </div>

          </div>

          {/* Columna Derecha: Resultados (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            
            {/* Tarjeta de Requerimientos Calóricos */}
            <div className="bg-gradient-to-br from-[#2b0c4f] via-[#1e0e5a] to-[#0d0ea0] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-white">
              {/* Decorative circle backdrop */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

              <div className="space-y-6">
                {formIncomplete && (
                  <div className="bg-amber-400/20 border border-amber-300/30 text-amber-100 text-xs font-semibold rounded-xl px-3 py-2">
                    Ingresá tu edad, peso y altura para calcular tus resultados.
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-white/90">Tu Meta Nutricional</h3>
                  <span className="text-xs bg-white/15 px-3 py-1 rounded-full font-bold">
                    {goal === "LOSE_WEIGHT" ? `Déficit Calórico ${Math.round(deficitPct * 100)}%` : goal === "MAINTAIN" ? "Mantenimiento" : "Superávit Calórico"}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-purple-200/80">Calorías Diarias Recomendadas</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black tracking-tight text-white">
                      {formIncomplete ? "—" : targetKcal.toLocaleString()}
                    </span>
                    <span className="text-xl font-bold text-sky-300">kcal/día</span>
                  </div>
                </div>

                <div className="w-full h-px bg-white/15" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] text-white/60 uppercase font-black tracking-wider">Tasa Basal (BMR)</p>
                    <p className="text-lg font-bold text-white mt-1">{formIncomplete ? "—" : bmr.toLocaleString()} kcal</p>
                    <p className="text-[9px] text-white/60 mt-0.5">Energía vital en reposo</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] text-white/60 uppercase font-black tracking-wider">Gasto Total (TDEE)</p>
                    <p className="text-lg font-bold text-white mt-1">{formIncomplete ? "—" : tdee.toLocaleString()} kcal</p>
                    <p className="text-[9px] text-white/60 mt-0.5">Calorías quemadas hoy</p>
                  </div>
                </div>

                {/* Tarjeta de Hidratación Recomendada */}
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-white/60 uppercase font-black tracking-wider">Hidratación Recomendada</p>
                  <p className="text-lg font-bold text-white mt-1">{formIncomplete ? "—" : `${(waterIntake / 1000).toFixed(1)} L/día`}</p>
                  <p className="text-[9px] text-white/60 mt-0.5">{isPediatricAge ? "≈Holliday: 100 / 50 / 20 ml/kg por tramos" : "≈35 ml/kg de peso corporal"}</p>
                </div>
              </div>
            </div>

            {/* Tarjeta de Distribución de Macros */}
            <div className="bg-base-100 border border-base-300 rounded-[2.5rem] p-8 shadow-xl shadow-base-300/50 space-y-6">
              
              <div>
                <h3 className="font-bold text-lg text-base-content">Distribución de Macronutrientes</h3>
                <p className="text-xs text-base-content/60 mt-0.5">Calculados para tus {formIncomplete ? "—" : targetKcal.toLocaleString()} kcal diarias</p>
              </div>

              {formIncomplete && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl px-3 py-2">
                  Ingresá tu edad, peso y altura para calcular tus resultados.
                </div>
              )}

              {/* Proteína manual en g/kg — opcional */}
              {!formIncomplete && weight > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 bg-base-200 rounded-xl border border-base-300">
                  <label htmlFor="protein-g-per-kg" className="text-xs font-semibold text-base-content/70 whitespace-nowrap shrink-0">
                    Fijar proteína (g/kg)
                  </label>
                  <input
                    id="protein-g-per-kg"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={proteinGPerKgInput}
                    onChange={(e) => setProteinGPerKgInput(e.target.value)}
                    placeholder="Auto"
                    className="w-20 shrink-0 bg-base-100 border border-base-300 rounded-lg py-1.5 px-2 text-center text-sm font-bold text-base-content outline-none focus:border-primary"
                  />
                  <span className="text-xs text-base-content/50 shrink-0">g/kg de {weight.toFixed(1)} kg</span>
                  {proteinGPerKg > 0 && (
                    <button
                      type="button"
                      onClick={() => setProteinGPerKgInput("")}
                      className="text-xs text-base-content/40 hover:text-amber-600 font-semibold ml-auto shrink-0"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-5">
                
                {/* Proteína */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-primary" />
                      <span className="text-sm font-bold text-base-content">Proteínas</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-baseline">
                        <span className="text-base font-black text-primary">{formIncomplete ? "—" : macros.protein}g</span>
                        <span className="text-xs text-base-content/60 ml-1.5">({Math.round(showSplit.protein)}%{!formIncomplete && weight > 0 ? ` · ${(macros.protein / weight).toFixed(1)} g/kg` : ""})</span>
                      </div>
                      <span className="text-[10px] text-base-content/60 font-semibold">{formIncomplete ? "—" : raciones.protein} raciones</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-base-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${showSplit.protein}%` }}
                      transition={{ type: "spring", stiffness: 60 }}
                    />
                  </div>
                  <p className="text-[10px] text-base-content/60">Soporte muscular y regeneración tisular ({formIncomplete ? "—" : Math.round(macros.protein * 4)} kcal)</p>
                </div>

                {/* Carbohidratos */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-sky-500" />
                      <span className="text-sm font-bold text-base-content">Carbohidratos</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-baseline">
                        <span className="text-base font-black text-sky-500">{formIncomplete ? "—" : macros.carbs}g</span>
                        <span className="text-xs text-base-content/60 ml-1.5">({Math.round(showSplit.carbs)}%{!formIncomplete && weight > 0 ? ` · ${(macros.carbs / weight).toFixed(1)} g/kg` : ""})</span>
                      </div>
                      <span className="text-[10px] text-base-content/60 font-semibold">{formIncomplete ? "—" : raciones.carbs} raciones</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-base-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-sky-500 rounded-full"
                      animate={{ width: `${showSplit.carbs}%` }}
                      transition={{ type: "spring", stiffness: 60 }}
                    />
                  </div>
                  <p className="text-[10px] text-base-content/60">Combustible y energía principal para el cerebro ({formIncomplete ? "—" : Math.round(macros.carbs * 4)} kcal)</p>
                </div>

                {/* Grasas */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-amber-500" />
                      <span className="text-sm font-bold text-base-content">Grasas</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-baseline">
                        <span className="text-base font-black text-amber-500">{formIncomplete ? "—" : macros.fat}g</span>
                        <span className="text-xs text-base-content/60 ml-1.5">({Math.round(showSplit.fat)}%{!formIncomplete && weight > 0 ? ` · ${(macros.fat / weight).toFixed(1)} g/kg` : ""})</span>
                      </div>
                      <span className="text-[10px] text-base-content/60 font-semibold">{formIncomplete ? "—" : raciones.fat} raciones</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-base-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-amber-500 rounded-full"
                      animate={{ width: `${showSplit.fat}%` }}
                      transition={{ type: "spring", stiffness: 60 }}
                    />
                  </div>
                  <p className="text-[10px] text-base-content/60">Soporte hormonal, salud celular e inmunidad ({formIncomplete ? "—" : Math.round(macros.fat * 9)} kcal)</p>
                </div>

              </div>

              <div className="w-full border-t border-base-200 pt-2" />

              {/* Acciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className={`py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-xs sm:text-sm cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-base-200 text-base-content/80 hover:bg-base-300 border border-base-300"
                  }`}
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  {copied ? "¡Copiado!" : "Copiar Resumen"}
                </button>
                
                <button
                  type="button"
                  onClick={saveCalculation}
                  className="bg-primary text-white hover:bg-primary/90 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-xs sm:text-sm shadow-md shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border-none"
                >
                  <Bookmark className="w-4 h-4" />
                  Guardar Historial
                </button>
              </div>

            </div>

            {/* Desglose Matemático Interactivo */}
            <div className="bg-base-100 border border-base-300 rounded-[2.5rem] p-6 shadow-xl shadow-base-300/50 space-y-4">
              <button
                type="button"
                onClick={() => setShowFormulaBreakdown(!showFormulaBreakdown)}
                className="w-full flex justify-between items-center text-left font-bold text-sm text-base-content hover:text-primary transition-colors outline-none cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  Fórmulas y Cálculos Paso a Paso
                </span>
                {showFormulaBreakdown ? (
                  <ChevronUp className="w-4 h-4 text-base-content/60" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-base-content/60" />
                )}
              </button>

              <AnimatePresence>
                {showFormulaBreakdown && (
                  <motion.div
                    key="calculadora-formula-breakdown-details"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden pt-2 border-t border-base-300 text-xs text-base-content/60"
                  >
                    {formIncomplete ? (
                      <p className="bg-base-200 p-3.5 rounded-2xl border border-base-300/80 text-base-content/60">
                        Ingresá tu edad, peso y altura para ver el desglose de los cálculos.
                      </p>
                    ) : (
                      <>
                    {/* Paso 1 */}
                    <div className="space-y-1 bg-base-200 p-3.5 rounded-2xl border border-base-300/80">
                      <p className="font-bold text-primary flex items-center gap-1.5">
                        <span className="w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px]">1</span>
                        Metabolismo Basal (BMR)
                      </p>
                      {isPediatricAge ? (
                        <>
                          <p className="text-base-content/60 text-[11px]">
                            Fórmula de Schofield pediátrica (FAO/OMS/UNU 2004, según edad y sexo):
                          </p>
                          <code className="block bg-base-300 p-2 rounded-xl text-base-content font-mono text-[10px] my-1 overflow-x-auto whitespace-pre">
                            TMB = f(edad, sexo) aplicada al peso (Schofield)
                          </code>
                          <p className="text-base-content/80 font-semibold pt-1">
                            TMB calculada con {gender === "MALE" ? "rama masculina" : "rama femenina"} ({age} años, {weight} kg) = <span className="text-base-content font-bold">{bmr} kcal</span>
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-base-content/60 text-[11px]">
                            Fórmula de Mifflin-St Jeor (energía mínima en reposo):
                          </p>
                          <code className="block bg-base-300 p-2 rounded-xl text-base-content font-mono text-[10px] my-1 overflow-x-auto whitespace-pre">
                            {gender === "MALE"
                              ? "BMR = (10 × peso) + (6.25 × altura) - (5 × edad) + 5"
                              : "BMR = (10 × peso) + (6.25 × altura) - (5 × edad) - 161"}
                          </code>
                          <p className="text-base-content/80 font-semibold pt-1">
                            Cálculo real: (10 × {weight}) + (6.25 × {height}) - (5 × {age}) {gender === "MALE" ? "+ 5" : "- 161"} = <span className="text-base-content font-bold">{bmr} kcal</span>
                          </p>
                        </>
                      )}
                    </div>

                    {/* Paso 2 */}
                    <div className="space-y-1 bg-base-200 p-3.5 rounded-2xl border border-base-300/80">
                      <p className="font-bold text-primary flex items-center gap-1.5">
                        <span className="w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px]">2</span>
                        Gasto Diario Total (TDEE)
                      </p>
                      <p className="text-base-content/60 text-[11px]">
                        {isPediatricAge
                          ? "TMB por tu nivel de actividad, más el costo de crecimiento:"
                          : "BMR multiplicado por tu nivel de actividad física:"}
                      </p>
                      <code className="block bg-base-300 p-2 rounded-xl text-base-content font-mono text-[10px] my-1 overflow-x-auto whitespace-pre">
                        {isPediatricAge
                          ? "TDEE = TMB × Factor de Actividad + Costo de crecimiento"
                          : "TDEE = BMR × Factor de Actividad"}
                      </code>
                      {isPediatricAge ? (
                        <p className="text-base-content/80 font-semibold pt-1">
                          Cálculo real: {bmr} × {PEDIATRIC_ACTIVITY_FACTORS[activity]} = {Math.round(bmr * PEDIATRIC_ACTIVITY_FACTORS[activity])} kcal · + {Math.round(pediatricGrowthPercent * 100)} % crecimiento ({Math.round(bmr * PEDIATRIC_ACTIVITY_FACTORS[activity] * pediatricGrowthPercent)} kcal) = <span className="text-base-content font-bold">{tdee} kcal</span>
                        </p>
                      ) : (
                        <p className="text-base-content/80 font-semibold pt-1">
                          Cálculo real: {bmr} × {ACTIVITY_FACTORS[activity]} ({
                            activity === "SEDENTARY" ? "Sedentario" :
                            activity === "LIGHT" ? "Actividad Ligera" :
                            activity === "MODERATE" ? "Actividad Moderada" :
                            activity === "ACTIVE" ? "Actividad Intensa" : "Muy Activa"
                          }) = <span className="text-base-content font-bold">{tdee} kcal</span>
                        </p>
                      )}
                    </div>

                    {/* Paso 3 */}
                    <div className="space-y-1 bg-base-200 p-3.5 rounded-2xl border border-base-300/80">
                      <p className="font-bold text-primary flex items-center gap-1.5">
                        <span className="w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px]">3</span>
                        Ajuste por Objetivo Calórico
                      </p>
                      <p className="text-base-content/60 text-[11px]">
                        Ajuste calórico según la meta seleccionada:
                      </p>
                      <code className="block bg-base-300 p-2 rounded-xl text-base-content font-mono text-[10px] my-1 overflow-x-auto whitespace-pre">
                        {goal === "LOSE_WEIGHT" ? `Meta = TDEE - ${Math.round(deficitPct * 100)}% (Déficit)` : goal === "GAIN_MUSCLE" ? "Meta = TDEE + 300 kcal (Superávit)" : "Meta = TDEE (Mantenimiento)"}
                      </code>
                      <p className="text-base-content/80 font-semibold pt-1">
                        Cálculo real: {goal === "LOSE_WEIGHT" ? `${tdee} - ${Math.round(tdee * deficitPct)}` : goal === "GAIN_MUSCLE" ? `${tdee} + 300` : `${tdee}`} = <span className="text-base-content font-bold">{targetKcal} kcal</span>
                      </p>
                    </div>

                    {/* Paso 4 */}
                    <div className="space-y-1 bg-base-200 p-3.5 rounded-2xl border border-base-300/80">
                      <p className="font-bold text-primary flex items-center gap-1.5">
                        <span className="w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px]">4</span>
                        Distribución de Macronutrientes
                      </p>
                      <p className="text-base-content/60 text-[11px]">
                        Gramos calculados según el valor calórico de cada macro:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-base-content/80 pt-1">
                        <li>
                          <span className="font-bold">Proteínas (4 kcal/g):</span> ({targetKcal} × {Math.round(currentSplit.protein)}%) / 4 = <span className="text-primary font-bold">{macros.protein}g</span>
                        </li>
                        <li>
                          <span className="font-bold">Carbohidratos (4 kcal/g):</span> ({targetKcal} × {Math.round(currentSplit.carbs)}%) / 4 = <span className="text-sky-500 font-bold">{macros.carbs}g</span>
                        </li>
                        <li>
                          <span className="font-bold">Grasas (9 kcal/g):</span> ({targetKcal} × {Math.round(currentSplit.fat)}%) / 9 = <span className="text-amber-500 font-bold">{macros.fat}g</span>
                        </li>
                      </ul>
                    </div>

                    {/* Paso 5 */}
                    <div className="space-y-1 bg-base-200 p-3.5 rounded-2xl border border-base-300/80">
                      <p className="font-bold text-primary flex items-center gap-1.5">
                        <span className="w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px]">5</span>
                        Raciones (Intercambios)
                      </p>
                      <p className="text-base-content/60 text-[11px]">
                        Los gramos de cada macronutriente se dividen por su constante de intercambio para obtener el número de raciones:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-base-content/80 pt-1">
                        <li>
                          <span className="font-bold">Proteínas:</span> {macros.protein}g ÷ 7 = <span className="text-primary font-bold">{raciones.protein} raciones</span>
                        </li>
                        <li>
                          <span className="font-bold">Carbohidratos:</span> {macros.carbs}g ÷ 15 = <span className="text-sky-500 font-bold">{raciones.carbs} raciones</span>
                        </li>
                        <li>
                          <span className="font-bold">Grasas:</span> {macros.fat}g ÷ 5 = <span className="text-amber-500 font-bold">{raciones.fat} raciones</span>
                        </li>
                      </ul>
                    </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Banner Informativo */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/5 border border-primary/10 p-5 rounded-3xl flex gap-4 items-start">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-base-content">¿Querés armar un plan exacto?</h4>
                <p className="text-xs text-base-content/60 leading-relaxed">
                  Nutringest permite a nutricionistas profesionales automatizar planes de alimentación a la medida exacta de tus macros y gustos, con listas de compras automáticas.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Sección de Lista de Intercambio & Ficha de Adecuación (%) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 bg-base-100 border border-base-300 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-base-300/50 space-y-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-base-300 pb-5">
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-base-content flex items-center gap-2">
                <Layers className="text-primary w-6 h-6" />
                Lista de Intercambio y Raciones por Grupo
              </h3>
              <p className="text-xs text-base-content/60 mt-1">
                Ajustá el número de raciones por grupo de alimento. Nutringest calcula el aporte total y el porcentaje de adecuación en tiempo real vs la meta del paciente.
              </p>
            </div>

            {/* Ficha rápida de Adecuación General */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Kcal", val: `${totalExchangeKcal} / ${targetKcal}`, pct: adequacyKcal, color: "text-base-content" },
                { label: "Proteína", val: `${totalExchangeProt}g / ${macros.protein}g`, pct: adequacyProt, color: "text-primary" },
                { label: "Carbos", val: `${totalExchangeCarbs}g / ${macros.carbs}g`, pct: adequacyCarbs, color: "text-sky-600" },
                { label: "Grasas", val: `${totalExchangeFat}g / ${macros.fat}g`, pct: adequacyFat, color: "text-amber-600" },
              ].map((stat, idx) => {
                const isOptimal = stat.pct >= 95 && stat.pct <= 105;
                const isAcceptable = (stat.pct >= 90 && stat.pct < 95) || (stat.pct > 105 && stat.pct <= 110);
                
                return (
                  <div key={idx} className="bg-base-200 border border-base-300/80 px-3.5 py-2 rounded-2xl flex flex-col items-center min-w-[100px]">
                    <span className="text-[10px] text-base-content/60 font-bold uppercase">{stat.label}</span>
                    <span className={`text-sm font-black ${stat.color}`}>{stat.pct}%</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${
                      isOptimal 
                        ? "bg-emerald-100 text-emerald-800" 
                        : isAcceptable 
                        ? "bg-sky-100 text-sky-800" 
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {isOptimal ? "Óptimo" : isAcceptable ? "Aceptable" : "Ajustar"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabla de Raciones de Alimentos */}
          <div className="overflow-x-auto rounded-2xl border border-base-300/80">
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-base-200 text-base-content/60 font-bold border-b border-base-300">
                  <th className="p-3.5">Grupo de Alimento</th>
                  <th className="p-3.5 text-center">Raciones (Editar)</th>
                  <th className="p-3.5 text-center">Proteínas (g)</th>
                  <th className="p-3.5 text-center">Carbohidratos (g)</th>
                  <th className="p-3.5 text-center">Grasas (g)</th>
                  <th className="p-3.5 text-right">Calorías (kcal)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300 text-base-content/80">
                {FOOD_GROUPS_CATALOG.map((group) => {
                  const currentRation = exchangeRations[group.id] || 0;
                  const itemProt = currentRation * group.prot;
                  const itemCarbs = currentRation * group.carbs;
                  const itemFat = currentRation * group.fat;
                  const itemKcal = currentRation * group.kcal;

                  return (
                    <tr key={group.id} className="hover:bg-base-200/80 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-base-content block">{group.name}</span>
                        <span className="text-[10px] text-base-content/60 font-semibold">{group.category}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setExchangeRations({ ...exchangeRations, [group.id]: Math.max(0, currentRation - 0.5) })}
                            className="w-7 h-7 rounded-lg bg-base-200 hover:bg-base-300 text-base-content/80 font-bold flex items-center justify-center transition-all cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={currentRation === 0 ? "" : String(currentRation)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(",", ".").replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, "");
                              if (raw === "") {
                                setExchangeRations({ ...exchangeRations, [group.id]: 0 });
                                return;
                              }
                              const val = parseFloat(raw);
                              setExchangeRations({ ...exchangeRations, [group.id]: isNaN(val) ? 0 : Math.max(0, val) });
                            }}
                            className="w-14 text-center bg-base-200 border border-base-300 rounded-lg py-1 font-bold text-base-content text-xs focus:bg-base-100 focus:border-primary outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setExchangeRations({ ...exchangeRations, [group.id]: currentRation + 0.5 })}
                            className="w-7 h-7 rounded-lg bg-base-200 hover:bg-base-300 text-base-content/80 font-bold flex items-center justify-center transition-all cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-primary">{itemProt}g</td>
                      <td className="p-3.5 text-center font-bold text-sky-600">{itemCarbs}g</td>
                      <td className="p-3.5 text-center font-bold text-amber-600">{itemFat}g</td>
                      <td className="p-3.5 text-right font-bold text-base-content">{itemKcal} kcal</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-base-300 text-base-content font-bold text-xs sm:text-sm">
                  <td className="p-3.5">TOTAL APORTADO POR RACIONES</td>
                  <td className="p-3.5 text-center text-base-content/70">
                    {Object.values(exchangeRations).reduce((a, b) => a + b, 0)} raciones
                  </td>
                  <td className="p-3.5 text-center text-primary font-black">{totalExchangeProt}g</td>
                  <td className="p-3.5 text-center text-sky-600 font-black">{totalExchangeCarbs}g</td>
                  <td className="p-3.5 text-center text-amber-600 font-black">{totalExchangeFat}g</td>
                  <td className="p-3.5 text-right text-emerald-500 font-black text-base">{totalExchangeKcal} kcal</td>
                </tr>
                <tr className="bg-base-200 text-base-content/80 font-semibold text-xs border-t border-base-300">
                  <td className="p-3.5">META OBJETIVO DEL PACIENTE</td>
                  <td className="p-3.5 text-center text-base-content/60">-</td>
                  <td className="p-3.5 text-center text-primary font-bold">{macros.protein}g</td>
                  <td className="p-3.5 text-center text-sky-600 font-bold">{macros.carbs}g</td>
                  <td className="p-3.5 text-center text-amber-600 font-bold">{macros.fat}g</td>
                  <td className="p-3.5 text-right text-base-content font-bold">{targetKcal} kcal</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>

        {/* Sección de Historial de Cálculos */}
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 bg-base-100 border border-base-300 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-base-300/50 space-y-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-base-content flex items-center gap-2">
                  <Bookmark className="text-primary w-5 h-5" />
                  Tus Cálculos Guardados
                </h3>
                <p className="text-xs text-base-content/60">Historial de consultas guardadas en la memoria local de tu navegador.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  localStorage.removeItem("nutringest_macro_history");
                }}
                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold px-4 py-2 rounded-xl transition-all border border-red-200 cursor-pointer"
              >
                Limpiar Historial
              </button>
            </div>

            <div className="overflow-x-auto w-full rounded-2xl border border-base-300">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-base-200 text-base-content/60 font-bold border-b border-base-300">
                    <th className="p-4">Fecha / Hora</th>
                    <th className="p-4">Datos Fisiológicos</th>
                    <th className="p-4">Meta Calórica</th>
                    <th className="p-4">Distribución Macros</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-300 text-base-content/80">
                  {history.map((entry) => {
                    const dietLabel = 
                      entry.dietType === "BALANCED" ? "Equilibrada" :
                      entry.dietType === "LOW_CARB" ? "Baja en Carbos" :
                      entry.dietType === "HIGH_PROTEIN" ? "Alta Proteína" :
                      entry.dietType === "KETO" ? "Keto" : "Personalizada";

                    return (
                      <tr key={entry.id} className="hover:bg-base-200/80 transition-colors">
                        <td className="p-4 font-medium text-base-content/60">{entry.date}</td>
                        <td className="p-4">
                          <span className="capitalize font-semibold">{entry.gender === "MALE" ? "Hombre" : "Mujer"}</span>, {entry.age} años
                          <br />
                          <span className="text-[11px] text-base-content/60">{entry.weight} kg | {entry.height} cm</span>
                        </td>
                        <td className="p-4 font-bold text-base-content">
                          {entry.targetKcal.toLocaleString()} kcal
                          <br />
                          <span className="text-[10px] text-base-content/60 font-medium">
                            {entry.goal === "LOSE_WEIGHT" ? "Déficit Calórico" : entry.goal === "MAINTAIN" ? "Mantenimiento" : "Superávit Calórico"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className="text-[11px] text-base-content/60 font-medium">{dietLabel}:</span>
                            <div className="flex gap-2 text-[11px] font-bold">
                              <span className="text-primary">P: {entry.macros.protein}g</span>
                              <span className="text-sky-500">C: {entry.macros.carbs}g</span>
                              <span className="text-amber-500">G: {entry.macros.fat}g</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => loadCalculation(entry)}
                              className="text-xs bg-primary/10 hover:bg-primary/20 text-primary font-bold px-3 py-1.5 rounded-xl transition-all border border-primary/20 cursor-pointer"
                            >
                              Cargar
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCalculation(entry.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition-all border border-red-200 cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

      </main>
      
      {/* Footer minimalista */}
      <footer className="border-t border-base-300 py-8 bg-base-100 text-center text-xs text-base-content/60">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Nutringest. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <a href="mailto:nutringest@gmail.com" className="hover:text-primary transition-colors">Contacto</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
