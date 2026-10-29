/**
 * inn-sisvan-zones.ts
 *
 * Clasificación por zonas INN-SISVAN (Venezuela, referencia OMS).
 * Convención de gráficas oficiales:
 * - Filtro por Sexo: HEMBRAS (Rosado) vs VARONES (Azul)
 * - Filtro por Edad: 0-5 años (Lactantes/Preescolares) vs 2-18 años (Escolares/Adolescentes) / 10-19 años (IMC)
 * - Las imágenes se sirven desde `/inn-sisvan/` (webapp/public/inn-sisvan/).
 */

/** Zonas de clasificación nutricional INN-SISVAN (déficit grave → exceso severo). */
export enum InnSisvanZone {
  DEFICIT_GRAVE = "DEFICIT_GRAVE",
  DEFICIT_MODERADO = "DEFICIT_MODERADO",
  DEFICIT_LEVE = "DEFICIT_LEVE",
  RIESGO_DEFICIT = "RIESGO_DEFICIT",
  NORMAL = "NORMAL",
  EXCESO_LEVE = "EXCESO_LEVE",
  EXCESO = "EXCESO",
  EXCESO_SEVERO = "EXCESO_SEVERO",
}

/** Tipo de gráfica según la edad del paciente (Legacy compatibility). */
export type ChartType = "ACOSTADO" | "DE_PIE";

/** Regla de convención: <2 años → ACOSTADO; ≥2 años → DE PIE. */
export const chartTypeForAge = (ageYears: number): ChartType =>
  ageYears < 2 ? "ACOSTADO" : "DE_PIE";

/** Gráficas INN-SISVAN disponibles (clave pública). */
export const InnSisvanCharts = {
  PESO_EDAD: "peso-edad",
  TALLA_EDAD: "talla-edad",
  PESO_TALLA: "peso-talla",
  IMC_EDAD: "imc-edad",
} as const;

export type InnSisvanChartKey = keyof typeof InnSisvanCharts;

export type PediatricSex = "FEMALE" | "MALE";
export type PediatricAgeGroup = "0-5" | "2-18" | "10-19";

/**
 * Mapa de imágenes oficiales INN-SISVAN (Venezuela).
 */
export const INN_SISVAN_IMAGES: Record<
  InnSisvanChartKey,
  { ACOSTADO: string | null; DE_PIE: string }
> = {
  PESO_TALLA: {
    ACOSTADO: "/inn-sisvan/peso-talla-hembras.png",
    DE_PIE: "/inn-sisvan/peso-talla-varones.png",
  },
  PESO_EDAD: {
    ACOSTADO: "/inn-sisvan/peso-edad-hembras-0-5.png",
    DE_PIE: "/inn-sisvan/peso-edad-varones-2-18.png",
  },
  TALLA_EDAD: {
    ACOSTADO: "/inn-sisvan/talla-edad-hembras-0-5.png",
    DE_PIE: "/inn-sisvan/talla-edad-varones-2-18.png",
  },
  IMC_EDAD: {
    ACOSTADO: "/inn-sisvan/imc-edad-hembras-10-19.png",
    DE_PIE: "/inn-sisvan/imc-edad-varones-10-19.png",
  },
} as const;

/** Path de la imagen para una gráfica + tipo (Legacy fallback). */
export const innSisvanChartPath = (
  chart: InnSisvanChartKey,
  type: ChartType,
): string | null => INN_SISVAN_IMAGES[chart]?.[type] || null;

/** Helper para normalizar el género del paciente */
export const normalizeGender = (gender?: string): PediatricSex => {
  if (!gender) return "MALE";
  const g = gender.toUpperCase();
  if (g === "FEMALE" || g === "FEMENINO" || g === "HEMBRA" || g === "F") return "FEMALE";
  return "MALE";
};

/**
 * Resuelve el path exacto de la gráfica INN-SISVAN oficial en base a género y edad.
 */
export const getSpecificInnSisvanChartPath = (params: {
  chartKey: InnSisvanChartKey;
  gender?: string;
  ageYears?: number;
  ageGroupOverride?: PediatricAgeGroup;
}): { path: string; resolvedAgeGroup: PediatricAgeGroup; isFemale: boolean } => {
  const isFemale = normalizeGender(params.gender) === "FEMALE";
  const age = params.ageYears ?? 3;

  let resolvedAgeGroup: PediatricAgeGroup = params.ageGroupOverride ?? (age < 5 ? "0-5" : "2-18");

  if (params.chartKey === "IMC_EDAD") {
    // Si se especificó ageGroupOverride se respeta; de lo contrario, < 10 años deriva a 0-5 (P/T OMS) y >= 10 a 10-19
    resolvedAgeGroup = params.ageGroupOverride ?? (age < 10 ? "0-5" : "10-19");
    if (resolvedAgeGroup === "0-5") {
      const path = isFemale
        ? "/inn-sisvan/peso-talla-hembras.png"
        : "/inn-sisvan/peso-talla-varones.png";
      return { path, resolvedAgeGroup: "0-5", isFemale };
    } else {
      const path = isFemale
        ? "/inn-sisvan/imc-edad-hembras-10-19.png"
        : "/inn-sisvan/imc-edad-varones-10-19.png";
      return { path, resolvedAgeGroup: "10-19", isFemale };
    }
  }

  if (params.chartKey === "PESO_TALLA") {
    const path = isFemale
      ? "/inn-sisvan/peso-talla-hembras.png"
      : "/inn-sisvan/peso-talla-varones.png";
    return { path, resolvedAgeGroup, isFemale };
  }

  if (params.chartKey === "PESO_EDAD") {
    if (resolvedAgeGroup === "0-5" || age < 5) {
      const path = isFemale
        ? "/inn-sisvan/peso-edad-hembras-0-5.png"
        : "/inn-sisvan/peso-edad-varones-0-5.png";
      return { path, resolvedAgeGroup: "0-5", isFemale };
    } else {
      const path = isFemale
        ? "/inn-sisvan/peso-edad-hembras-2-18.png"
        : "/inn-sisvan/peso-edad-varones-2-18.png";
      return { path, resolvedAgeGroup: "2-18", isFemale };
    }
  }

  // TALLA_EDAD
  if (resolvedAgeGroup === "0-5" || age < 5) {
    const path = isFemale
      ? "/inn-sisvan/talla-edad-hembras-0-5.png"
      : "/inn-sisvan/talla-edad-varones-0-5.png";
    return { path, resolvedAgeGroup: "0-5", isFemale };
  } else {
    const path = isFemale
      ? "/inn-sisvan/talla-edad-hembras-2-18.png"
      : "/inn-sisvan/talla-edad-varones-2-18.png";
    return { path, resolvedAgeGroup: "2-18", isFemale };
  }
};

/** Lista ordenada de zonas para renders de selects/UI. */
export const INN_SISVAN_ZONE_ORDER: InnSisvanZone[] = [
  InnSisvanZone.DEFICIT_GRAVE,
  InnSisvanZone.DEFICIT_MODERADO,
  InnSisvanZone.DEFICIT_LEVE,
  InnSisvanZone.RIESGO_DEFICIT,
  InnSisvanZone.NORMAL,
  InnSisvanZone.EXCESO_LEVE,
  InnSisvanZone.EXCESO,
  InnSisvanZone.EXCESO_SEVERO,
];

/**
 * Etiquetas legibles oficiales INN-SISVAN para cada zona.
 */
export const INN_SISVAN_ZONE_LABELS: Record<string, string> = {
  [InnSisvanZone.DEFICIT_GRAVE]: "Déficit Grave (<-3 DE)",
  [InnSisvanZone.DEFICIT_MODERADO]: "Déficit Moderado (-3 a -2 DE)",
  [InnSisvanZone.DEFICIT_LEVE]: "Déficit Leve (-2 a -1 DE)",
  [InnSisvanZone.RIESGO_DEFICIT]: "Riesgo de Déficit (-1 a 0 DE)",
  [InnSisvanZone.NORMAL]: "Normal / Adecuado (Eutrófico, -1 a +1 DE)",
  [InnSisvanZone.EXCESO_LEVE]: "Exceso Leve / Alerta Sobrepeso (+1 a +2 DE)",
  [InnSisvanZone.EXCESO]: "Sobrepeso / Exceso (+2 a +3 DE)",
  [InnSisvanZone.EXCESO_SEVERO]: "Obesidad / Exceso Severo (>+3 DE)",
  // Retrocompatibilidad con valores legacy guardados previamente:
  ZONA_1: "Zona 1 — Déficit Grave (<-3 DE)",
  ZONA_2: "Zona 2 — Déficit Moderado (-3 a -2 DE)",
  ZONA_3: "Zona 3 — Normal / Adecuado (-2 a +2 DE)",
  ZONA_4: "Zona 4 — Sobrepeso / Exceso (+2 a +3 DE)",
  ZONA_5: "Zona 5 — Obesidad (>+3 DE)",
};

/**
 * Normaliza valores legacy o cadenas de zona a un InnSisvanZone válido.
 */
export const normalizeInnSisvanZone = (rawZone?: string | null): InnSisvanZone => {
  if (!rawZone) return InnSisvanZone.NORMAL;
  const upper = rawZone.toUpperCase().trim();
  switch (upper) {
    case "ZONA_1":
      return InnSisvanZone.DEFICIT_GRAVE;
    case "ZONA_2":
      return InnSisvanZone.DEFICIT_MODERADO;
    case "ZONA_3":
      return InnSisvanZone.NORMAL;
    case "ZONA_4":
      return InnSisvanZone.EXCESO;
    case "ZONA_5":
      return InnSisvanZone.EXCESO_SEVERO;
    default:
      if (Object.values(InnSisvanZone).includes(upper as InnSisvanZone)) {
        return upper as InnSisvanZone;
      }
      return InnSisvanZone.NORMAL;
  }
};