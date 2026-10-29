import { describe, it, expect } from "vitest";
import {
  deriveAgeMonthsFromPatient,
  monthsToYears,
  resolvePediatricGender,
  buildPediatricFormInit,
  DEFAULT_AGE_MONTHS,
} from "../pediatric-history-init";

describe("deriveAgeMonthsFromPatient", () => {
  const now = new Date("2026-10-22T12:00:00");

  it("derives age from birthDate instead of the historical 5-year default", () => {
    const months = deriveAgeMonthsFromPatient({ birthDate: "2004-02-14" }, now);
    expect(months).toBe((2026 - 2004) * 12 + (10 - 2)); // 272 months
    expect(monthsToYears(months)).toBe(22.67);
    expect(months).not.toBe(DEFAULT_AGE_MONTHS);
  });

  it("falls back to patient.age when birthDate is missing or unparseable", () => {
    expect(deriveAgeMonthsFromPatient({ birthDate: null, age: "3.5" }, now)).toBe(42);
    expect(deriveAgeMonthsFromPatient({ birthDate: "not-a-date", age: 10 }, now)).toBe(120);
  });

  it("keeps the legacy 60-month fallback only when the patient supplies no age source", () => {
    expect(deriveAgeMonthsFromPatient({}, now)).toBe(60);
    expect(deriveAgeMonthsFromPatient(null, now)).toBe(60);
  });
});

describe("resolvePediatricGender", () => {
  it("maps FEMALE/FEMENINO to FEMALE and everything else to MALE", () => {
    expect(resolvePediatricGender("FEMALE")).toBe("FEMALE");
    expect(resolvePediatricGender("femenino")).toBe("FEMALE");
    expect(resolvePediatricGender("MALE")).toBe("MALE");
    expect(resolvePediatricGender(undefined)).toBe("MALE");
  });
});

describe("buildPediatricFormInit", () => {
  const now = new Date("2026-10-22T12:00:00");
  const patient = {
    birthDate: "2020-10-22", // exactly 6 years old at `now`
    gender: "FEMALE",
    anthropometrics: [
      {
        weight: "21.4",
        height: "118.5",
        sittingHeight: "65.2",
        tricipital: 9.1,
        subscapular: 7.3,
      },
    ],
  };

  it("ignores the ageless pediatric record and derives age from the patient", () => {
    // The PediatricHistory table has no age columns: a real saved record always
    // arrives without ageMonths/ageYears — that must not force 5 years anymore.
    const init = buildPediatricFormInit(
      {
        weightKg: "20.9",
        heightCm: "117",
        sittingHeightCm: null,
        tricepsSkinfoldMm: null,
        subscapularSkinfoldMm: null,
      },
      patient,
      now,
    );
    expect(init.ageMonths).toBe(72); // 6 years
    expect(init.ageYears).toBe(6);
  });

  it("prefills measurements from the latest anthropometric record when the history has gaps", () => {
    const init = buildPediatricFormInit({ weightKg: null, heightCm: null }, patient, now);
    expect(init.weightKg).toBe(21.4);
    expect(init.heightCm).toBe(118.5);
    expect(init.sittingHeightCm).toBe(65.2);
    expect(init.tricepsSkinfoldMm).toBe(9.1);
    expect(init.subscapularSkinfoldMm).toBe(7.3);
  });

  it("keeps saved history measurements over anthropometric ones", () => {
    const init = buildPediatricFormInit(
      {
        weightKg: 22.1,
        heightCm: 119,
        sittingHeightCm: 66,
        tricepsSkinfoldMm: 8.0,
        subscapularSkinfoldMm: 6.5,
      },
      patient,
      now,
    );
    expect(init.weightKg).toBe(22.1);
    expect(init.heightCm).toBe(119);
    expect(init.sittingHeightCm).toBe(66);
    expect(init.tricepsSkinfoldMm).toBe(8);
    expect(init.subscapularSkinfoldMm).toBe(6.5);
  });

  it("falls back to the legacy defaults only when neither source has data", () => {
    const init = buildPediatricFormInit(null, null, now);
    expect(init.ageMonths).toBe(60);
    expect(init.ageYears).toBe(5);
    expect(init.weightKg).toBe(18);
    expect(init.heightCm).toBe(110);
    expect(init.sittingHeightCm).toBeNull();
    expect(init.tricepsSkinfoldMm).toBeNull();
    expect(init.subscapularSkinfoldMm).toBeNull();
  });
});
