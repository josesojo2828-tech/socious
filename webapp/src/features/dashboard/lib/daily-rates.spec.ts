import { describe, expect, it } from "vitest";
import type { CurrencyVisibilityKey } from "@/features/settings/types/tenant-settings.type";
import { buildDailyRateLines } from "./daily-rates";

const ALL_OFF: Record<CurrencyVisibilityKey, boolean> = {
  showUSD: false,
  showVES: false,
  showUSDT: false,
  showBCV: false,
  showEUR: false,
};

const RATES = {
  rateBcv: 36.5,
  rateUsdt: 37.2,
  rateEur: 41.1,
};

describe("buildDailyRateLines", () => {
  it("returns no lines when every currency is disabled", () => {
    expect(buildDailyRateLines(ALL_OFF, RATES)).toEqual([]);
  });

  it("maps each enabled currency to its rate in Bs", () => {
    const lines = buildDailyRateLines(
      { ...ALL_OFF, showUSD: true, showUSDT: true, showEUR: true },
      RATES,
    );

    expect(lines.map((line) => line.key)).toEqual([
      "showUSD",
      "showUSDT",
      "showEUR",
    ]);
    expect(lines[0].value).toContain("36,50");
    expect(lines[0].value).toContain("Bs");
    expect(lines[1].value).toContain("37,20");
    expect(lines[2].value).toContain("41,10");
  });

  it("shows VES as the one-to-one base when enabled", () => {
    const lines = buildDailyRateLines({ ...ALL_OFF, showVES: true }, RATES);

    expect(lines).toHaveLength(1);
    expect(lines[0].key).toBe("showVES");
    expect(lines[0].value).toBe("1,00 Bs");
  });

  it("shows the BCV rate as a bare number when enabled", () => {
    const lines = buildDailyRateLines({ ...ALL_OFF, showBCV: true }, RATES);

    expect(lines).toHaveLength(1);
    expect(lines[0].key).toBe("showBCV");
    expect(lines[0].value).toBe("36,50");
    expect(lines[0].value).not.toContain("Bs");
  });

  it("keeps enabled order USD, VES, USDT, BCV, EUR", () => {
    const lines = buildDailyRateLines(
      {
        showUSD: true,
        showVES: true,
        showUSDT: true,
        showBCV: true,
        showEUR: true,
      },
      RATES,
    );

    expect(lines.map((line) => line.key)).toEqual([
      "showUSD",
      "showVES",
      "showUSDT",
      "showBCV",
      "showEUR",
    ]);
  });

  it("renders a dash when rates are missing or EUR is absent", () => {
    const withoutRates = buildDailyRateLines(
      { ...ALL_OFF, showUSD: true },
      null,
    );
    expect(withoutRates[0].value).toBe("—");

    const withoutEur = buildDailyRateLines(
      { ...ALL_OFF, showEUR: true },
      { rateBcv: 36.5, rateUsdt: 37.2, rateEur: null },
    );
    expect(withoutEur[0].value).toBe("—");
  });

  it("ignores non-positive rate values", () => {
    const lines = buildDailyRateLines(
      { ...ALL_OFF, showUSD: true, showUSDT: true },
      { rateBcv: 0, rateUsdt: -1 },
    );

    expect(lines[0].value).toBe("—");
    expect(lines[1].value).toBe("—");
  });
});
