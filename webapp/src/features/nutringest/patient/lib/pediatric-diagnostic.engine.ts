import { InnSisvanZone } from './inn-sisvan-zones';

export type TriaxialZone = 'BAJO' | 'NORMAL' | 'ALTO';

export type PediatricDiagnosticSeverity = 'NORMAL' | 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';

export interface CombinedPediatricDiagnosisInput {
  pesoTalla: TriaxialZone;
  pesoEdad: TriaxialZone;
  tallaEdad: TriaxialZone;
}

export interface CombinedPediatricDiagnosisResult {
  title: string;
  classification: string;
  severity: PediatricDiagnosticSeverity;
  clinicalDescription: string;
  badgeColor: string;
  badgeBorder: string;
  recommendations: string[];
}

export interface PediatricDiagnosticInput {
  ageYears?: number;
  weightKg?: number;
  heightCm?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  selectedZone?: InnSisvanZone;
  triaxialIndices?: {
    pesoTalla?: TriaxialZone;
    pesoEdad?: TriaxialZone;
    tallaEdad?: TriaxialZone;
  };
}

export interface PediatricDiagnosticResult {
  zone: InnSisvanZone;
  title: string;
  summary: string;
  badgeColor: string;
  badgeBorder: string;
  clinicalAlert: 'NORMAL' | 'WARNING' | 'CRITICAL';
  recommendations: string[];
  combinedDiagnosis?: CombinedPediatricDiagnosisResult;
}

/**
 * Mapea una zona INN-SISVAN, percentil o z-score a TriaxialZone ('BAJO' | 'NORMAL' | 'ALTO').
 */
export function mapZoneToTriaxialZone(
  value: InnSisvanZone | string | number | null | undefined,
  type?: 'zscore' | 'percentile'
): TriaxialZone {
  if (value === null || value === undefined) return 'NORMAL';

  if (typeof value === 'number') {
    if (type === 'zscore') {
      if (value < -2) return 'BAJO';
      if (value > 2) return 'ALTO';
      return 'NORMAL';
    }
    if (type === 'percentile') {
      if (value < 10) return 'BAJO';
      if (value > 90) return 'ALTO';
      return 'NORMAL';
    }
    // Inferencia automática:
    // Valores negativos siempre son z-score
    if (value < 0) {
      return value < -2 ? 'BAJO' : 'NORMAL';
    }
    // Valores > 5 corresponden a escala de percentiles (0 - 100)
    if (value > 5) {
      if (value < 10) return 'BAJO';
      if (value > 90) return 'ALTO';
      return 'NORMAL';
    }
    // Rango ambiguo 0 a 5: por defecto interpretado como z-score
    if (value > 2) return 'ALTO';
    return 'NORMAL';
  }

  const str = String(value).toUpperCase().trim();

  if (str === 'BAJO' || str === 'LOW') return 'BAJO';
  if (str === 'NORMAL' || str === 'EUTROFICO') return 'NORMAL';
  if (str === 'ALTO' || str === 'HIGH') return 'ALTO';

  // Zonas INN-SISVAN directas o códigos ZONA_1..5
  switch (str) {
    case 'ZONA_1':
    case 'ZONA_2':
    case InnSisvanZone.DEFICIT_GRAVE:
    case InnSisvanZone.DEFICIT_MODERADO:
    case InnSisvanZone.DEFICIT_LEVE:
    case InnSisvanZone.RIESGO_DEFICIT:
      return 'BAJO';

    case 'ZONA_4':
    case 'ZONA_5':
    case InnSisvanZone.EXCESO_LEVE:
    case InnSisvanZone.EXCESO:
    case InnSisvanZone.EXCESO_SEVERO:
      return 'ALTO';

    case 'ZONA_3':
    case InnSisvanZone.NORMAL:
    default:
      return 'NORMAL';
  }
}

/**
 * Matriz de diagnóstico pediátrico combinado cruzando los 3 índices principales:
 * - Peso para la Talla (P/T): evalúa estado nutricional agudo / emaciación o adiposidad.
 * - Peso para la Edad (P/E): indicador global o compuesto.
 * - Talla para la Edad (T/E): evalúa desmedro / cronicidad o talla alta.
 *
 * Basado en las 9 combinaciones clínicas clásicas (Waterlow / Ramos Galván / INN / OMS).
 */
export function evaluateCombinedPediatricDiagnosis(
  input: CombinedPediatricDiagnosisInput
): CombinedPediatricDiagnosisResult {
  const { pesoTalla, pesoEdad, tallaEdad } = input;
  const key = `${pesoTalla}_${pesoEdad}_${tallaEdad}`;

  switch (key) {
    // 1. P/T normal, P/E bajo, T/E bajo
    case 'NORMAL_BAJO_BAJO':
      return {
        title: 'Actualmente normal con desnutrición pasada',
        classification: 'Desnutrición crónica recuperada / armónica con talla baja',
        severity: 'WARNING',
        clinicalDescription:
          'Desnutrición crónica recuperada o armónica con talla baja. El peso es proporcional a la talla actual, pero existe un compromiso histórico del crecimiento lineal (desmedro previo).',
        badgeColor: 'bg-amber-100 text-amber-800',
        badgeBorder: 'border-amber-300',
        recommendations: [
          'Evaluar velocidad de crecimiento estatural y aporte de micronutrientes (Zinc, Vitamina A, Calcio, Hierro).',
          'Monitorear curva de talla/edad para descartar desaceleración activa.',
          'Evitar dietas hipercalóricas forzadas que generen sobrepeso relativo sobre la talla baja.',
        ],
      };

    // 2. P/T normal, P/E normal, T/E normal
    case 'NORMAL_NORMAL_NORMAL':
      return {
        title: 'Normal',
        classification: 'Eutrófico (Crecimiento y desarrollo armónico)',
        severity: 'NORMAL',
        clinicalDescription:
          'Eutrófico. Relación armónica de peso y talla acorde a la edad y sexo cronológico.',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        badgeBorder: 'border-emerald-300',
        recommendations: [
          'Mantener alimentación balanceada y hábitos de vida saludables.',
          'Controles pediátricos periódicos según calendario oficial.',
        ],
      };

    // 3. P/T normal, P/E alto, T/E alto
    case 'NORMAL_ALTO_ALTO':
      return {
        title: 'Alto, moderadamente nutrido',
        classification: 'Talla alta armónica',
        severity: 'NORMAL',
        clinicalDescription:
          'Talla alta armónica. Paciente con estatura elevada y desarrollo ponderal adecuadamente proporcionado a su altura.',
        badgeColor: 'bg-sky-100 text-sky-800',
        badgeBorder: 'border-sky-300',
        recommendations: [
          'Verificar antecedentes genéticos y talla diana familiar.',
          'Asegurar adecuado aporte proteico, calcio y vitamina D para consolidación ósea.',
          'Fomentar actividad física regular acorde a la edad.',
        ],
      };

    // 4. P/T bajo, P/E bajo, T/E alto
    case 'BAJO_BAJO_ALTO':
      return {
        title: 'Actualmente desnutrido ++',
        classification: 'Desnutrición aguda severa en paciente de talla alta',
        severity: 'CRITICAL',
        clinicalDescription:
          'Desnutrición aguda severa en paciente de talla alta. Emaciación crítica con desproporción marcada entre la estatura alcanzada y la masa corporal.',
        badgeColor: 'bg-rose-100 text-rose-800',
        badgeBorder: 'border-rose-300',
        recommendations: [
          'Intervención clínica y nutricional inmediata. Descartar patología consuntiva subyacente.',
          'Protocolo de realimentación progresivo con vigilancia hidroelectrolítica.',
          'Monitoreo antropométrico semanal.',
        ],
      };

    // 5. P/T bajo, P/E bajo, T/E normal
    case 'BAJO_BAJO_NORMAL':
      return {
        title: 'Actualmente desnutrido +',
        classification: 'Desnutrición aguda típica con talla preservada',
        severity: 'ALERT',
        clinicalDescription:
          'Desnutrición aguda típica con talla preservada. Pérdida ponderal aguda reciente sin afectación del crecimiento longitudinal histórico.',
        badgeColor: 'bg-orange-100 text-orange-800',
        badgeBorder: 'border-orange-300',
        recommendations: [
          'Investigar causas desencadenantes recientes (infecciones, cambio alimentario, entorno social).',
          'Incrementar la densidad calórico-proteica de las tomas y comidas principales.',
          'Seguimiento quincenal de peso para la talla.',
        ],
      };

    // 6. P/T bajo, P/E normal, T/E alto
    case 'BAJO_NORMAL_ALTO':
      return {
        title: 'Actualmente desnutrido',
        classification: 'Desnutrición aguda / emaciación relativa',
        severity: 'ALERT',
        clinicalDescription:
          'Desnutrición aguda / emaciación relativa. El peso total parece dentro de rango poblacional para la edad cronológica, pero resulta marcadamente deficiente para su alta estatura.',
        badgeColor: 'bg-orange-100 text-orange-800',
        badgeBorder: 'border-orange-300',
        recommendations: [
          'Ajustar la meta calórica tomando como referencia la talla real y no el peso por edad cronológica.',
          'Aumentar el soporte calórico y nutricional para sostener el ritmo de crecimiento estatural.',
          'Reevaluación antropométrica en 2 a 4 semanas.',
        ],
      };

    // 7. P/T alto, P/E alto, T/E bajo
    case 'ALTO_ALTO_BAJO':
      return {
        title: 'Obeso',
        classification: 'Obesidad con retraso estatural',
        severity: 'ALERT',
        clinicalDescription:
          'Obesidad con retraso estatural o talla baja. Exceso marcado de tejido adiposo sobreimpuesto a desmedro crónico o probable endocrinopatía.',
        badgeColor: 'bg-purple-100 text-purple-800',
        badgeBorder: 'border-purple-300',
        recommendations: [
          'Evaluación médica integral para descartar endocrinopatías (hipotiroidismo, hipercortisolismo, déficit de GH).',
          'Plan nutricional equilibrado sin restricción energética severa que comprometa la talla.',
          'Estimular actividad física diaria y restringir alimentos ultraprocesados y bebidas azucaradas.',
        ],
      };

    // 8. P/T alto, P/E normal, T/E bajo
    case 'ALTO_NORMAL_BAJO':
      return {
        title: 'Sobrepeso con pasado de desnutrición',
        classification: 'Exceso ponderal sobreimpuesto a desmedro crónico previo',
        severity: 'WARNING',
        clinicalDescription:
          'Exceso ponderal sobreimpuesto a desmedro crónico previo (baja talla nutricional). El peso es normal para la edad pero excesivo para la baja estatura.',
        badgeColor: 'bg-amber-100 text-amber-800',
        badgeBorder: 'border-amber-300',
        recommendations: [
          'Priorizar calidad nutricional y micronutrientes promotores del crecimiento óseo sin sobrecarga calórica.',
          'Estimular el juego activo diario y pautas familiares de alimentación consciente.',
          'Monitorear velocidad de crecimiento longitudinal.',
        ],
      };

    // 9. P/T alto, P/E alto, T/E normal
    case 'ALTO_ALTO_NORMAL':
      return {
        title: 'Sobrepeso, pero no obeso',
        classification: 'Sobrepeso simple con talla normal',
        severity: 'WARNING',
        clinicalDescription:
          'Sobrepeso simple con talla normal. Exceso moderado de peso para la estatura en un paciente con crecimiento lineal preservado.',
        badgeColor: 'bg-amber-100 text-amber-800',
        badgeBorder: 'border-amber-300',
        recommendations: [
          'Orientación nutricional familiar para regular tamaño de porciones y densidad calórica.',
          'Promover al menos 60 minutos diarios de actividad física activa y lúdica.',
          'Disminuir el tiempo de exposición a pantallas y dispositivos electrónicos.',
        ],
      };

    // --- FALLBACKS LÓGICOS PARA COMBINACIONES ADICIONALES ---
    // Fallback 1: P/T bajo, P/E bajo, T/E bajo -> Desnutrición crónica reagudizada
    case 'BAJO_BAJO_BAJO':
      return {
        title: 'Desnutrición crónica reagudizada',
        classification: 'Déficit global severo (emaciación y desmedro concomitante)',
        severity: 'CRITICAL',
        clinicalDescription:
          'Desnutrición crónica reagudizada. Compromiso simultáneo de la masa corporal actual (peso/talla) y del crecimiento lineal histórico (talla/edad).',
        badgeColor: 'bg-rose-100 text-rose-800',
        badgeBorder: 'border-rose-300',
        recommendations: [
          'Atención clínica y nutricional multidisciplinaria urgente.',
          'Protocolo estricto de recuperación nutricional y despistaje de comorbilidades.',
          'Seguimiento semanal de signos vitales y peso.',
        ],
      };

    // Fallback 2: P/T alto, P/E alto, T/E alto -> Sobrepeso / Obesidad generalizada
    case 'ALTO_ALTO_ALTO':
      return {
        title: 'Sobrepeso / Obesidad generalizada',
        classification: 'Exceso ponderoestatural armónico con adiposidad elevada',
        severity: 'ALERT',
        clinicalDescription:
          'Sobrepeso / Obesidad generalizada. Paciente de talla alta con incremento significativo de masa corporal total y adiposidad.',
        badgeColor: 'bg-purple-100 text-purple-800',
        badgeBorder: 'border-purple-300',
        recommendations: [
          'Evaluar hábitos de vida, antecedentes familiares y maduración biológica.',
          'Plan nutricional cualitativo para desacelerar la ganancia de masa grasa mientras se mantiene el crecimiento.',
          'Control antropométrico mensual.',
        ],
      };

    // Fallback 3: P/T bajo con otras variantes
    default: {
      if (pesoTalla === 'BAJO') {
        return {
          title: 'Actualmente desnutrido (Emaciación)',
          classification: 'Déficit ponderal agudo para la talla',
          severity: 'ALERT',
          clinicalDescription: `Déficit de peso para la talla (P/T bajo). Requiere apoyo nutricional agudo adaptado al perfil estatural (T/E ${tallaEdad}).`,
          badgeColor: 'bg-orange-100 text-orange-800',
          badgeBorder: 'border-orange-300',
          recommendations: [
            'Evaluar ingesta energética y proteica actual.',
            'Reforzar densidad calórica con alimentos de alto valor biológico.',
            'Control evolutivo en 15 a 30 días.',
          ],
        };
      }

      if (pesoTalla === 'ALTO') {
        return {
          title: 'Sobrepeso / Exceso ponderal',
          classification: 'Exceso ponderal relativo a la talla',
          severity: 'WARNING',
          clinicalDescription: `Exceso de peso para la talla (P/T alto). Requiere pautas alimentarias saludables y actividad física acorde a su talla (T/E ${tallaEdad}).`,
          badgeColor: 'bg-amber-100 text-amber-800',
          badgeBorder: 'border-amber-300',
          recommendations: [
            'Fomentar patrones alimentarios equilibrados ricos en frutas, verduras y fibra.',
            'Reducir bebidas azucaradas y ultraprocesados.',
            'Fomentar estilo de vida activo.',
          ],
        };
      }

      // P/T NORMAL con variantes
      const isDeviated = pesoEdad !== 'NORMAL' || tallaEdad !== 'NORMAL';
      return {
        title: isDeviated ? 'Desviación en canales de crecimiento' : 'Proporción peso/talla adecuada',
        classification: isDeviated
          ? `Disarmonía pondero-estatural (P/E ${pesoEdad}, T/E ${tallaEdad})`
          : `Crecimiento armónico (P/E ${pesoEdad}, T/E ${tallaEdad})`,
        severity: isDeviated ? 'WARNING' : 'NORMAL',
        clinicalDescription: `Relación peso para la talla adecuada en el momento actual. Variaciones en peso/edad (${pesoEdad}) o talla/edad (${tallaEdad}) orientan a evaluación longitudinal.`,
        badgeColor: isDeviated ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
        badgeBorder: isDeviated ? 'border-amber-300' : 'border-emerald-300',
        recommendations: [
          'Mantener alimentación balanceada.',
          'Seguimiento rutinario del crecimiento y desarrollo.',
        ],
      };
    }
  }
}

/**
 * Calcula la clasificación por IMC para la edad en pacientes mayores de 2 años.
 */
export function calculateImc(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(2));
}

/**
 * Motor de inferencia diagnóstica pediátrica cruzada.
 * Evalúa las mediciones y la zona INN-SISVAN para retornar el diagnóstico consolidado.
 */
export function evaluatePediatricDiagnosis(
  input: PediatricDiagnosticInput
): PediatricDiagnosticResult {
  const { ageYears, weightKg, heightCm, selectedZone = InnSisvanZone.NORMAL, triaxialIndices } = input;

  let combinedDiagnosis: CombinedPediatricDiagnosisResult | undefined;
  if (triaxialIndices?.pesoTalla && triaxialIndices?.pesoEdad && triaxialIndices?.tallaEdad) {
    combinedDiagnosis = evaluateCombinedPediatricDiagnosis({
      pesoTalla: triaxialIndices.pesoTalla,
      pesoEdad: triaxialIndices.pesoEdad,
      tallaEdad: triaxialIndices.tallaEdad,
    });
  }

  // Si no hay mediciones básicas, retornar estado indeterminado o normal básico
  if (!ageYears || !weightKg || !heightCm) {
    return {
      zone: selectedZone,
      title: 'Evaluación Pendiente',
      summary: 'Complete las mediciones antropométricas (edad, peso y talla) para generar el diagnóstico automático consolidado.',
      badgeColor: 'bg-slate-100 text-slate-700',
      badgeBorder: 'border-slate-300',
      clinicalAlert: 'NORMAL',
      recommendations: [
        'Ingrese peso en kg y talla en cm.',
        'Verifique la edad del paciente en años.',
      ],
      combinedDiagnosis,
    };
  }

  // Evaluaciones según la zona INN-SISVAN
  switch (selectedZone) {
    case InnSisvanZone.DEFICIT_GRAVE:
      return {
        zone: InnSisvanZone.DEFICIT_GRAVE,
        title: 'Desnutrición Grave / Déficit Severo',
        summary: 'El paciente se ubica en el percentil inferior a -3 DE en las curvas de referencia. Alerta nutricional severa.',
        badgeColor: 'bg-rose-100 text-rose-800',
        badgeBorder: 'border-rose-300',
        clinicalAlert: 'CRITICAL',
        recommendations: [
          'Intervención nutricional clínica inmediata.',
          'Evaluar presencia de signos clínicos de marasmo o kwashiorkor.',
          'Considerar indicación de fórmulas infantiles hipercalóricas o suplementación médica especializada.',
          'Seguimiento semanal de peso y talla.',
        ],
        combinedDiagnosis,
      };

    case InnSisvanZone.DEFICIT_MODERADO:
    case InnSisvanZone.DEFICIT_LEVE:
      return {
        zone: selectedZone,
        title: selectedZone === InnSisvanZone.DEFICIT_MODERADO ? 'Desnutrición Moderada' : 'Desnutrición Leve',
        summary: 'El crecimiento ponderal o estatural se ubica por debajo del rango de normalidad (-2 DE a -3 DE).',
        badgeColor: 'bg-amber-100 text-amber-800',
        badgeBorder: 'border-amber-300',
        clinicalAlert: 'WARNING',
        recommendations: [
          'Incrementar la densidad calórica y proteica de la alimentación habitual.',
          'Evaluar tolerancia alimentaria y consumo de fórmulas infantiles de inicio o continuación.',
          'Control antropométrico quincenal.',
        ],
        combinedDiagnosis,
      };

    case InnSisvanZone.RIESGO_DEFICIT:
      return {
        zone: InnSisvanZone.RIESGO_DEFICIT,
        title: 'Riesgo de Déficit Nutricional',
        summary: 'Ubicación en la zona límite inferior de las curvas normales (-1 DE a -2 DE). Sensible a desaceleración del crecimiento.',
        badgeColor: 'bg-yellow-100 text-yellow-800',
        badgeBorder: 'border-yellow-300',
        clinicalAlert: 'WARNING',
        recommendations: [
          'Reforzar la educación alimentaria familiar.',
          'Asegurar el aporte adecuado de micronutrientes (Hierro, Zinc, Vitamina A).',
          'Reevaluación antropométrica en 30 días.',
        ],
        combinedDiagnosis,
      };

    case InnSisvanZone.EXCESO_LEVE:
      return {
        zone: InnSisvanZone.EXCESO_LEVE,
        title: 'Sobrepeso / Exceso Ponderal Leve',
        summary: 'Ubicación en la zona límite superior (+1 DE a +2 DE). Tendencia a sobrepeso.',
        badgeColor: 'bg-amber-100 text-amber-800',
        badgeBorder: 'border-amber-300',
        clinicalAlert: 'WARNING',
        recommendations: [
          'Fomentar la actividad física diaria adecuada para la edad.',
          'Moderar el consumo de azúcares añadidos y alimentos ultraprocesados.',
          'Mantener la lactancia materna o fórmula según indicación.',
        ],
        combinedDiagnosis,
      };

    case InnSisvanZone.EXCESO:
    case InnSisvanZone.EXCESO_SEVERO:
      return {
        zone: selectedZone,
        title: selectedZone === InnSisvanZone.EXCESO_SEVERO ? 'Obesidad Severa' : 'Obesidad Pediátrica',
        summary: 'Ubicación por encima de +2 DE o +3 DE en las curvas de referencia peso/talla o IMC/edad.',
        badgeColor: 'bg-purple-100 text-purple-800',
        badgeBorder: 'border-purple-300',
        clinicalAlert: 'CRITICAL',
        recommendations: [
          'Evaluación metabólica integral.',
          'Establecer plan de alimentación estructurado con restricción de ultraprocesados.',
          'Promover estilo de vida activo y limitar tiempo de pantalla a < 1 hora/día.',
        ],
        combinedDiagnosis,
      };

    case InnSisvanZone.NORMAL:
    default:
      return {
        zone: InnSisvanZone.NORMAL,
        title: 'Normopeso / Eutrófico (Crecimiento Adecuado)',
        summary: 'El paciente presenta una relación armónica de peso y talla acorde a su edad y sexo (dentro de -1 DE a +1 DE).',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        badgeBorder: 'border-emerald-300',
        clinicalAlert: 'NORMAL',
        recommendations: [
          'Continuar con una alimentación variada y equilibrada.',
          'Mantener controles pediátricos de rutina según esquema de salud.',
        ],
        combinedDiagnosis,
      };
  }
}

/**
 * Calcula en tiempo real los 3 canales de crecimiento triaxial (P/T, P/E, T/E)
 * a partir de las variables antropométricas del paciente (referencias OMS / INN-SISVAN).
 */
export function computeTriaxialIndices(params: {
  weightKg?: number;
  heightCm?: number;
  ageYears?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | string;
}): {
  pesoTalla: TriaxialZone;
  pesoEdad: TriaxialZone;
  tallaEdad: TriaxialZone;
} {
  const { weightKg, heightCm, ageYears, gender = 'MALE' } = params;

  if (!weightKg || !heightCm || ageYears === undefined || ageYears === null || weightKg <= 0 || heightCm <= 0 || ageYears < 0) {
    return { pesoTalla: 'NORMAL', pesoEdad: 'NORMAL', tallaEdad: 'NORMAL' };
  }

  const isFemale = String(gender).toUpperCase() === 'FEMALE' || String(gender).toUpperCase() === 'FEMENINO';

  // 1. Talla para la Edad (T/E) - Indicador histórico / Cronicidad
  let medianHeight = 50;
  if (ageYears <= 1) {
    medianHeight = 50 + ageYears * 25;
  } else if (ageYears <= 2) {
    medianHeight = 75 + (ageYears - 1) * 11;
  } else if (ageYears <= 5) {
    medianHeight = 86 + (ageYears - 2) * 8;
  } else if (ageYears <= 12) {
    medianHeight = 110 + (ageYears - 5) * 5.8;
  } else {
    medianHeight = isFemale
      ? Math.min(163, 150 + (ageYears - 12) * 2.2)
      : Math.min(176, 150 + (ageYears - 12) * 4.3);
  }

  const sdHeight = 0.045 * medianHeight;
  const zHeight = (heightCm - medianHeight) / sdHeight;
  let tallaEdad: TriaxialZone = 'NORMAL';
  if (zHeight < -1.8) tallaEdad = 'BAJO';
  else if (zHeight > 1.8) tallaEdad = 'ALTO';

  // 2. Peso para la Edad (P/E) - Indicador global de masa
  let medianWeight = 3.3;
  if (ageYears <= 1) {
    medianWeight = 3.3 + ageYears * 6.3;
  } else if (ageYears <= 2) {
    medianWeight = 9.6 + (ageYears - 1) * 2.6;
  } else if (ageYears <= 5) {
    medianWeight = 12.2 + (ageYears - 2) * 2.0;
  } else if (ageYears <= 10) {
    medianWeight = 18.3 + (ageYears - 5) * 2.7;
  } else {
    medianWeight = isFemale
      ? Math.min(56, 32 + (ageYears - 10) * 3.0)
      : Math.min(68, 32 + (ageYears - 10) * 4.5);
  }

  const sdWeight = 0.14 * medianWeight;
  const zWeight = (weightKg - medianWeight) / sdWeight;
  let pesoEdad: TriaxialZone = 'NORMAL';
  if (zWeight < -1.8) pesoEdad = 'BAJO';
  else if (zWeight > 1.8) pesoEdad = 'ALTO';

  // 3. Peso para la Talla (P/T) - Estado nutricional agudo / Masa corporal
  let pesoTalla: TriaxialZone = 'NORMAL';
  if (ageYears < 5 || heightCm <= 120) {
    const deltaH = Math.max(0, heightCm - 50);
    const medianWtForHt = 3.0 + 0.00135 * (deltaH * deltaH) + 0.22 * deltaH;
    const sdWtForHt = 0.11 * medianWtForHt;
    const zWtForHt = (weightKg - medianWtForHt) / sdWtForHt;
    if (zWtForHt < -1.8) pesoTalla = 'BAJO';
    else if (zWtForHt > 1.8) pesoTalla = 'ALTO';
  } else {
    const hM = heightCm / 100;
    const imc = weightKg / (hM * hM);
    const medianImc = 15.0 + Math.min(6.6, Math.max(0, (ageYears - 5) * 0.5));
    const sdImc = 2.1;
    const zImc = (imc - medianImc) / sdImc;
    if (zImc < -1.8) pesoTalla = 'BAJO';
    else if (zImc > 1.8) pesoTalla = 'ALTO';
  }

  return { pesoTalla, pesoEdad, tallaEdad };
}
