import { describe, expect, it } from "vitest";
import { offerExpiresLabel, offerPercentLabel } from "./offer-storefront";

describe("offerPercentLabel", () => {
  it("builds the storefront chip for a real discount", () => {
    expect(offerPercentLabel(10)).toBe("\u221210%");
    expect(offerPercentLabel(100)).toBe("\u2212100%");
  });

  it("rounds fractional percents like the backend does", () => {
    expect(offerPercentLabel(12.5)).toBe("\u221213%");
    expect(offerPercentLabel(7.4)).toBe("\u22127%");
  });

  it("hides the chip when there is no discount", () => {
    expect(offerPercentLabel(0)).toBeNull();
    expect(offerPercentLabel(-5)).toBeNull();
    expect(offerPercentLabel(Number.NaN)).toBeNull();
  });
});

describe("offerExpiresLabel", () => {
  it("formats the expiry day from the stored UTC instant, zero padded", () => {
    // The offer form stores the chosen day at UTC midnight (offer.type.ts),
    // so the label must read the UTC calendar day — not the viewer timezone.
    expect(offerExpiresLabel("2026-12-01T00:00:00.000Z")).toBe("Vence 01/12");
    expect(offerExpiresLabel(new Date(Date.UTC(2026, 11, 31)))).toBe(
      "Vence 31/12",
    );
    expect(offerExpiresLabel(new Date(Date.UTC(2026, 0, 5, 12)))).toBe(
      "Vence 05/01",
    );
  });

  it("returns null instead of an invalid date label", () => {
    expect(offerExpiresLabel("no-es-fecha")).toBeNull();
    expect(offerExpiresLabel(null)).toBeNull();
    expect(offerExpiresLabel(undefined)).toBeNull();
  });
});
