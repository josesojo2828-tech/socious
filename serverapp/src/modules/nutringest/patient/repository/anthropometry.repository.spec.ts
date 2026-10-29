import AnthropometryRepository from "./anthropometry.repository";

describe("AnthropometryRepository.format — residualMass", () => {
  const repository = new AnthropometryRepository(
    {} as any,
    {} as any,
    {} as any,
  );

  const base = {
    id: "anthro-1",
    patientId: "patient-1",
    date: new Date("2026-10-01"),
    weight: 70,
    height: 170,
  };

  it("devuelve null cuando residualMass es null (omisión pediátrica)", () => {
    const formatted = repository.format({ ...base, residualMass: null });

    expect(formatted?.residualMass).toBeNull();
  });

  it("conserva un 0 real (residual saturado por las fórmulas)", () => {
    const formatted = repository.format({ ...base, residualMass: 0 });

    expect(formatted?.residualMass).toBe(0);
  });

  it("convierte valores almacenados a number", () => {
    const formatted = repository.format({ ...base, residualMass: "14.25" });

    expect(formatted?.residualMass).toBe(14.25);
  });
});
