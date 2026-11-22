import {
  CASHEA_CADENCE_DAYS,
  buildCasheaSchedule,
  casheaFinancedUSD,
  validateCasheaPlan,
} from "./cashea-plan";

describe("cashea plan", () => {
  it("finances whatever the initial does not cover", () => {
    expect(casheaFinancedUSD(100, 40)).toBe(60);
    expect(casheaFinancedUSD(100, 0)).toBe(100);
    expect(casheaFinancedUSD(100, 100)).toBe(0);
  });

  it("never finances a negative amount when the initial exceeds the total", () => {
    expect(casheaFinancedUSD(100, 120)).toBe(0);
  });

  it("builds one installment every 14 days from the first due date", () => {
    const first = new Date(2026, 0, 20, 12, 0, 0); // 20 ene 2026
    const schedule = buildCasheaSchedule(first, 3, 20);

    expect(CASHEA_CADENCE_DAYS).toBe(14);
    expect(schedule).toHaveLength(3);
    expect(schedule.map((entry) => entry.number)).toEqual([1, 2, 3]);
    expect(schedule.map((entry) => entry.dueDate)).toEqual([
      new Date(2026, 0, 20, 12, 0, 0),
      new Date(2026, 1, 3, 12, 0, 0), // 20 ene + 14 días
      new Date(2026, 1, 17, 12, 0, 0), // 3 feb + 14 días
    ]);
    expect(schedule.map((entry) => entry.amountUSD)).toEqual([20, 20, 20]);
  });

  it("rounds installment amounts to two decimals", () => {
    const schedule = buildCasheaSchedule(new Date(2026, 0, 20), 3, 33.333);
    expect(schedule[0].amountUSD).toBe(33.33);
  });

  it("returns an empty schedule when there is nothing to finance", () => {
    expect(buildCasheaSchedule(new Date(2026, 0, 20), 0, 20)).toEqual([]);
  });

  it("accepts a plan whose initial plus installments equals the total", () => {
    expect(
      validateCasheaPlan(100, {
        initialUSD: 40,
        installmentCount: 3,
        installmentUSD: 20,
      }),
    ).toBeNull();
  });

  it("tolerates a few cents of rounding when splitting the total", () => {
    expect(
      validateCasheaPlan(100, {
        initialUSD: 40,
        installmentCount: 3,
        installmentUSD: 20.01,
      }),
    ).toBeNull();
  });

  it("rejects an initial larger than the total", () => {
    expect(
      validateCasheaPlan(100, {
        initialUSD: 120,
        installmentCount: 1,
        installmentUSD: 1,
      }),
    ).toBe("El pago inicial de Cashea no puede superar el total de la venta.");
  });

  it("rejects a plan that does not add up to the total", () => {
    expect(
      validateCasheaPlan(100, {
        initialUSD: 40,
        installmentCount: 3,
        installmentUSD: 10,
      }),
    ).toBe(
      "Las cuotas de Cashea no cuadran: inicial + cuotas debe dar el total de la venta.",
    );
  });

  it("rejects a non-positive installment count or amount", () => {
    expect(
      validateCasheaPlan(100, {
        initialUSD: 100,
        installmentCount: 0,
        installmentUSD: 0,
      }),
    ).toBe("Cashea necesita al menos una cuota y un monto por cuota mayor que cero.");
  });

  it("rejects a fractional installment count", () => {
    expect(
      validateCasheaPlan(100, {
        initialUSD: 0,
        installmentCount: 2.5,
        installmentUSD: 50,
      }),
    ).toBe("Cashea necesita al menos una cuota y un monto por cuota mayor que cero.");
  });

  it("tolerates per-installment rounding for every count the POS offers", () => {
    for (let count = 1; count <= 36; count += 1) {
      const installment = Math.round((100 / count) * 100) / 100;
      expect(
        validateCasheaPlan(100, {
          initialUSD: 0,
          installmentCount: count,
          installmentUSD: installment,
        }),
      ).toBeNull();
    }
  });
});
