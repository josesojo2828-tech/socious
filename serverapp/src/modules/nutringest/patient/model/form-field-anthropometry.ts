import { FormElement } from "src/shared/types/form/form";
import { Anthropometry } from "src/shared/types/nutringest/anthropometry.interface";

const getVal = (val: any): string => {
  return val !== undefined && val !== null && String(val) !== "undefined" ? String(val) : "";
};

export const ANTHRO_BASE_FIELDS = (anthro?: Anthropometry): FormElement[] => {
  return [
    // ==========================================
    // 1. MEDICIONES BÁSICAS Y PESOS
    // ==========================================
    {
      title: "Datos Básicos y Peso",
      gridCols: 4,
      elements: [
        {
          controlType: "input",
          type: "date",
          name: "date",
          label: "Fecha",
          required: true,
          value: anthro?.date
            ? new Date(anthro.date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          gridSpan: 2, // Ocupa 2 columnas en desktop
        },
        {
          controlType: "input",
          type: "number",
          name: "weight",
          label: "Peso Actual (kg)",
          placeholder: "0.0",
          required: true,
          step: 0.1,
          value: getVal(anthro?.weight),
          className: "font-bold",
          min: 20,
          max: 500,
        },
        {
          controlType: "input",
          type: "number",
          name: "height",
          label: "Talla (cm)",
          placeholder: "0",
          required: false,
          step: 0.1,
          value: getVal(anthro?.height),
          min: 50,
          max: 250,
        },
        // --- NUEVOS CAMPOS DE PESO/TALLA ---
        {
          controlType: "input",
          type: "number",
          name: "sittingHeight",
          label: "Talla Sentado (cm)",
          placeholder: "0",
          step: 0.1,
          value: getVal(anthro?.sittingHeight),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "usualWeight",
          label: "Peso Habitual (kg)",
          placeholder: "0.0",
          step: 0.1,
          value: getVal(anthro?.usualWeight),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "idealWeight",
          label: "Peso Ideal (kg)",
          placeholder: "Calculado o Ref",
          step: 0.1,
          value: getVal(anthro?.idealWeight),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "adjustedWeight",
          label: "Peso Ajustado (kg)",
          placeholder: "Para obesidad",
          step: 0.1,
          value: getVal(anthro?.adjustedWeight),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "bmi",
          label: "IMC (kg/m²)",
          placeholder: "Auto",
          readonly: true, // Se calcula en backend o frontend
          value: getVal(anthro?.bmi),
          className: "bg-gray-50",
        },
      ],
    },

    // ==========================================
    // 2. CIRCUNFERENCIAS (Perímetros)
    // ==========================================
    {
      title: "Circunferencias (cm)",
      gridCols: 4,
      elements: [
        {
          controlType: "input",
          type: "number",
          name: "c_arm_relaxed", // Brazo Extendido/Relajado
          label: "Brazo Relajado",
          placeholder: "0",
          value: getVal(anthro?.c_arm_relaxed) || getVal(anthro?.arm), // Fallback a 'arm' antiguo si existe
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "c_arm_flexed",
          label: "Brazo Flexionado",
          placeholder: "0",
          value: getVal(anthro?.c_arm_flexed),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "c_wrist",
          label: "Perímetro de Muñeca (Circunferencia)",
          placeholder: "0",
          value: getVal(anthro?.c_wrist),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "c_chest",
          label: "Pecho / Tórax",
          placeholder: "0",
          value: getVal(anthro?.c_chest),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "waist",
          label: "Cintura (Mínima)",
          placeholder: "0",
          value: getVal(anthro?.waist),
          className: "border-blue-200",
        },
        {
          controlType: "input",
          type: "number",
          name: "c_abdomen",
          label: "Abdomen (Umbilical)",
          placeholder: "0",
          value: getVal(anthro?.c_abdomen),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "hip",
          label: "Cadera (Máxima)",
          placeholder: "0",
          value: getVal(anthro?.hip),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "c_calf",
          label: "Perímetro de Pierna (Pantorrilla)",
          placeholder: "0",
          value: getVal(anthro?.c_calf),
          className: "",
        },
      ],
    },

    // ==========================================
    // 3. PLIEGUES CUTÁNEOS
    // ==========================================
    {
      title: "Pliegues Cutáneos (mm)",
      gridCols: 4,
      elements: [
        {
          controlType: "input",
          type: "number",
          name: "tricipital",
          label: "Tricipital",
          placeholder: "0",
          value: getVal(anthro?.tricipital),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "bicipital",
          label: "Bicipital",
          placeholder: "0",
          value: getVal(anthro?.bicipital),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "subscapular",
          label: "Subescapular",
          placeholder: "0",
          value: getVal(anthro?.subscapular),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "suprailiac",
          label: "Suprailiaco",
          placeholder: "0",
          value: getVal(anthro?.suprailiac),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "abdominal", // Pliegue abdominal
          label: "Abdominal",
          placeholder: "0",
          value: getVal(anthro?.abdominal),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "thigh",
          label: "Muslo Frontal",
          placeholder: "0",
          value: getVal(anthro?.thigh),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "calf", // Pliegue pierna
          label: "Pliegue Cutáneo Pierna Medial (Pantorrilla)",
          placeholder: "0",
          value: getVal(anthro?.calf),
          className: "",
        },
      ],
    },

    // ==========================================
    // 4. COMPOSICIÓN CORPORAL (BIOIMPEDANCIA)
    // ==========================================
    {
      title: "Bioimpedancia / Análisis",
      gridCols: 3,
      elements: [
        {
          controlType: "input",
          type: "number",
          name: "fatPercentage",
          label: "% Grasa",
          placeholder: "0.0",
          step: 0.1,
          value: getVal(anthro?.fatPercentage),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "muscleMass",
          label: "Masa Muscular (kg)",
          placeholder: "0.0",
          step: 0.1,
          value: getVal(anthro?.muscleMass),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "visceralFat",
          label: "Grasa Visceral",
          placeholder: "Nivel",
          value: getVal(anthro?.visceralFat),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "waterPercentage",
          label: "% Agua",
          placeholder: "0.0",
          step: 0.1,
          value: getVal(anthro?.waterPercentage),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "boneMass",
          label: "Masa Ósea (kg)",
          placeholder: "0.0",
          step: 0.1,
          value: getVal(anthro?.boneMass),
          className: "",
        },
        {
          controlType: "input",
          type: "number",
          name: "metabolicAge",
          label: "Edad Metabólica",
          placeholder: "0",
          value: getVal(anthro?.metabolicAge),
          className: "",
        },
      ],
    },
  ];
};
