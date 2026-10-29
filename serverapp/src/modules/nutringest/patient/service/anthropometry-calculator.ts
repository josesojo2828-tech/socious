export class AnthropometryCalculator {
  /**
   * Realiza todos los cálculos cineantropométricos avanzados basándose en los datos crudos.
   * Valida entradas y evita divisiones por cero o resultados NaN.
   */
  public static calculate(data: {
    weight: number;
    height: number;
    age: number;
    gender: string;
    sittingHeight?: number;
    armSpan?: number;
    // Pliegues
    tricipital?: number;
    bicipital?: number;
    subscapular?: number;
    suprailiac?: number;
    skinfoldSupraspinale?: number;
    abdominal?: number;
    thigh?: number;
    calf?: number;
    // Perímetros
    c_arm_relaxed?: number;
    c_arm_flexed?: number;
    waist?: number;
    hip?: number;
    girthThighMid?: number;
    c_calf?: number;
    // Diámetros
    diameterHumeral?: number;
    diameterBiestiloid?: number;
    diameterFemoral?: number;
  }) {
    const {
      weight,
      height,
      age,
      gender,
      sittingHeight = 0,
      armSpan = 0,
      tricipital = 0,
      bicipital = 0,
      subscapular = 0,
      suprailiac = 0,
      skinfoldSupraspinale = 0,
      abdominal = 0,
      thigh = 0,
      calf = 0,
      c_arm_relaxed = 0,
      c_arm_flexed = 0,
      waist = 0,
      hip = 0,
      girthThighMid = 0,
      c_calf = 0,
      diameterHumeral = 0,
      diameterBiestiloid = 0,
      diameterFemoral = 0,
    } = data;

    // Validación básica para evitar división por cero
    if (!height || height <= 0 || !weight || weight <= 0) {
      return {};
    }

    const results: any = {};

    // 1. IMC
    const heightM = height / 100;
    results.bmi = Number((weight / (heightM * heightM)).toFixed(2));

    // 2. Masa Adiposa (Kerr, 1991)
    // Se requieren los 6 pliegues: Tríceps, Subescapular, Supraespinal, Abdominal, Muslo, Pierna
    if (tricipital > 0 && subscapular > 0 && skinfoldSupraspinale > 0 && abdominal > 0 && thigh > 0 && calf > 0) {
      const sum6 = tricipital + subscapular + skinfoldSupraspinale + abdominal + thigh + calf;
      const zAdip = (sum6 * (170.18 / height) - 116.41) / 34.79;
      const adipMass = (zAdip * 5.85 + 25.6) / Math.pow(170.18 / height, 3);
      results.adiposeMass = Number(Math.max(0, adipMass).toFixed(2));
      results.fatPercentage = Number(((results.adiposeMass / weight) * 100).toFixed(2));
    }

    // 3. Masa Ósea (Rocha, 1974)
    // Requiere estatura, diámetro biestiloideo y diámetro femoral
    if (diameterBiestiloid > 0 && diameterFemoral > 0) {
      const dBieM = diameterBiestiloid / 100;
      const dFemM = diameterFemoral / 100;
      const boneMass = 3.02 * Math.pow(Math.pow(heightM, 2) * dBieM * dFemM * 400, 0.712);
      results.boneMass = Number(Math.max(0, boneMass).toFixed(2));
    }

    // 4. Masa Muscular (Lee, 2000)
    // Requiere estatura, edad, género y perímetros corregidos de brazo, muslo y pierna
    if (c_arm_relaxed > 0 && girthThighMid > 0 && c_calf > 0 && tricipital > 0 && thigh > 0 && calf > 0) {
      const sexVal = (gender === "MALE" || gender === "MASCULINO") ? 1 : 0;
      const cag = c_arm_relaxed - Math.PI * (tricipital / 10);
      const ctg = girthThighMid - Math.PI * (thigh / 10);
      const ccg = c_calf - Math.PI * (calf / 10);

      const muscleMass = heightM * (0.00744 * cag * cag + 0.00088 * ctg * ctg + 0.00441 * ccg * ccg) - 0.048 * age + 2.4 * sexVal + 7.8;
      results.muscleMass = Number(Math.max(0, muscleMass).toFixed(2));
    }

    // 5. Masa Residual
    // Kerr (1991), Rocha (1974) y Lee (2000) fueron calibrados en población adulta.
    // En menores de 18 años sus estimaciones independientes pueden saturar el
    // peso corporal y producir residuales negativos o cercanos a cero, así que
    // se omite el residual para pacientes pediátricos.
    if (age >= 18 && results.adiposeMass !== undefined && results.boneMass !== undefined && results.muscleMass !== undefined) {
      // The three empirical estimates are independent, so their sum can exceed
      // the body weight; residual mass can never be negative (parity with the
      // mobile ISAK calculator, which clamps to [0, weight]).
      const residual = weight - (results.adiposeMass + results.boneMass + results.muscleMass);
      results.residualMass = Number(Math.max(0, residual).toFixed(2));
    }

    // 6. Somatotipo (Heath-Carter)
    // A. Endomorfia
    if (tricipital > 0 && subscapular > 0 && skinfoldSupraspinale > 0) {
      const sum3 = tricipital + subscapular + skinfoldSupraspinale;
      const s3c = sum3 * (170.18 / height);
      const endo = -0.7182 + 0.1451 * s3c - 0.00068 * s3c * s3c + 0.0000014 * s3c * s3c * s3c;
      results.endomorphy = Number(endo.toFixed(2));
    }

    // B. Mesomorfia
    if (diameterHumeral > 0 && diameterFemoral > 0 && c_arm_flexed > 0 && c_calf > 0) {
      const cagFlex = c_arm_flexed - (tricipital / 10);
      const ccgMeso = c_calf - (calf / 10);
      const meso = 0.858 * diameterHumeral + 0.601 * diameterFemoral + 0.188 * cagFlex + 0.161 * ccgMeso - 0.131 * height + 4.5;
      results.mesomorphy = Number(meso.toFixed(2));
    }

    // C. Ectomorfia
    const hwr = height / Math.cbrt(weight);
    let ecto = 0.1;
    if (hwr >= 40.75) {
      ecto = 0.732 * hwr - 28.58;
    } else if (hwr > 38.25) {
      ecto = 0.463 * hwr - 17.63;
    }
    results.ectomorphy = Number(ecto.toFixed(2));

    // 7. Índices de salud y rendimiento
    if (results.adiposeMass > 0 && results.muscleMass > 0) {
      results.adiposeMuscleIndex = Number((results.adiposeMass / results.muscleMass).toFixed(2));
    }
    if (results.muscleMass > 0 && results.boneMass > 0) {
      results.muscleBoneIndex = Number((results.muscleMass / results.boneMass).toFixed(2));
    }
    if (waist > 0) {
      results.conicityIndex = Number(((waist / 100) / (0.109 * Math.sqrt(weight / heightM))).toFixed(2));
    }

    // Área superficie corporal (Du Bois)
    const bsa = 0.007184 * Math.pow(weight, 0.425) * Math.pow(height, 0.725);
    // Heat Loss Index (IPC)
    results.heatLossIndex = Number(((bsa * 10000) / weight).toFixed(0));

    if (sittingHeight > 0) {
      results.cormicIndex = Number((sittingHeight / height).toFixed(2));
      results.manouvrierIndex = Number((((height - sittingHeight) / sittingHeight) * 100).toFixed(0));
    }

    if (armSpan > 0) {
      results.relativeArmSpan = Number((armSpan / height).toFixed(2));
    }

    return results;
  }
}
