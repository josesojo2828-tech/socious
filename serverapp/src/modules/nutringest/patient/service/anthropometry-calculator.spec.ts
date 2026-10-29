import { AnthropometryCalculator } from "./anthropometry-calculator";

describe("AnthropometryCalculator", () => {
  it("debe calcular correctamente las fórmulas de composición corporal basándose en los datos de prueba de Excel", () => {
    const input = {
      age: 21,
      gender: "FEMALE",
      weight: 112.3,
      height: 164.5,
      sittingHeight: 88,
      armSpan: 160.5,
      // Pliegues (mm)
      tricipital: 35,
      bicipital: 20,
      subscapular: 43,
      suprailiac: 45,
      skinfoldSupraspinale: 36,
      abdominal: 32,
      thigh: 52,
      calf: 43,
      // Perímetros (cm)
      c_arm_relaxed: 45,
      c_arm_flexed: 45.2,
      waist: 102,
      hip: 129.3,
      girthThighMid: 78,
      c_calf: 47.5,
      // Diámetros (cm)
      diameterHumeral: 7.8,
      diameterBiestiloid: 5.2,
      diameterFemoral: 12.4,
    };

    const result = AnthropometryCalculator.calculate(input);

    expect(result.bmi).toBe(41.5); // 112.3 / (1.645)^2 = 41.5
    expect(result.adiposeMass).toBe(43.31);
    expect(result.fatPercentage).toBe(38.57);
    expect(result.boneMass).toBe(12.04);
    expect(result.muscleMass).toBe(34.83);
    expect(result.residualMass).toBe(22.12);
    
    // Somatotipo
    expect(result.endomorphy).toBe(9.23);
    expect(result.mesomorphy).toBe(11.89);
    expect(result.ectomorphy).toBe(0.1);

    // Índices
    expect(result.adiposeMuscleIndex).toBe(1.24);
    expect(result.muscleBoneIndex).toBe(2.89);
    expect(result.conicityIndex).toBe(1.13);
    expect(result.heatLossIndex).toBe(192);
    expect(result.cormicIndex).toBe(0.53);
    expect(result.manouvrierIndex).toBe(87);
    expect(result.relativeArmSpan).toBe(0.98);
  });

  it("debe recortar la masa residual a 0 cuando la suma de componentes supera el peso", () => {
    // Kerr, Rocha and Lee are independent empirical estimates: nothing
    // constrains their sum to the body weight, so the plain difference can
    // go negative for stocky subjects. Residual mass can never be negative.
    const input = {
      age: 30,
      gender: "MALE",
      weight: 70,
      height: 170,
      tricipital: 10,
      bicipital: 8,
      subscapular: 8,
      suprailiac: 8,
      skinfoldSupraspinale: 8,
      abdominal: 10,
      thigh: 12,
      calf: 10,
      c_arm_relaxed: 45,
      c_arm_flexed: 46,
      waist: 95,
      hip: 100,
      girthThighMid: 85,
      c_calf: 55,
      diameterHumeral: 8.5,
      diameterBiestiloid: 6.0,
      diameterFemoral: 13.0,
    };

    const result = AnthropometryCalculator.calculate(input);

    // The three independent empirical estimates add up past the body weight.
    expect(result.adiposeMass).toBeGreaterThan(0);
    expect(result.muscleMass).toBeGreaterThan(0);
    expect(result.boneMass).toBeGreaterThan(0);
    expect(
      result.adiposeMass! + result.muscleMass! + result.boneMass!,
    ).toBeGreaterThan(input.weight);
    expect(result.residualMass).toBe(0);
  });

  it("debe omitir la masa residual en pacientes pediátricos (menores de 18 años)", () => {
    // Kerr (1991), Rocha (1974) y Lee (2000) están calibrados en población adulta.
    // En un paciente pediátrico sus estimaciones independientes pueden saturar
    // el peso y producir un residual cercano a cero, así que se omite.
    const input = {
      age: 11,
      gender: "FEMALE",
      weight: 60.7,
      height: 157.5,
      tricipital: 22,
      bicipital: 15,
      subscapular: 19,
      suprailiac: 20,
      skinfoldSupraspinale: 19,
      abdominal: 26,
      thigh: 30,
      calf: 28,
      c_arm_relaxed: 29.5,
      c_arm_flexed: 30,
      waist: 75,
      hip: 95,
      girthThighMid: 55.6,
      c_calf: 37.7,
      diameterHumeral: 6.0,
      diameterBiestiloid: 6.2,
      diameterFemoral: 9.5,
    };

    const result = AnthropometryCalculator.calculate(input);

    // Los componentes individuales sí se calculan
    expect(result.adiposeMass).toBeGreaterThan(0);
    expect(result.boneMass).toBeGreaterThan(0);
    expect(result.muscleMass).toBeGreaterThan(0);
    // Pero el residual se omite para pediátricos
    expect(result.residualMass).toBeUndefined();
  });
});
