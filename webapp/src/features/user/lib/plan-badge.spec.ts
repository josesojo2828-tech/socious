import { describe, expect, it } from "vitest";
import { planBadge } from "./plan-badge";

const NOW = new Date("2026-11-05T12:00:00.000Z");

describe("planBadge", () => {
  it("returns null without a plan name", () => {
    expect(planBadge({ endDate: "2026-12-05T00:00:00.000Z", now: NOW })).toBeNull();
    expect(planBadge({ planName: "   ", now: NOW })).toBeNull();
  });

  it("shows the plan and the expiry date", () => {
    const badge = planBadge({
      planName: "Básico",
      endDate: "2026-12-05T12:00:00.000Z",
      now: NOW,
    });

    expect(badge?.label).toBe("Básico · vence 05/12/2026");
    expect(badge?.tone).toBe("neutral");
    expect(badge?.daysRemaining).toBe(30);
  });

  it("warns inside the last five days and turns red on the last one", () => {
    expect(
      planBadge({
        planName: "Básico",
        endDate: "2026-11-08T12:00:00.000Z",
        now: NOW,
      })?.tone,
    ).toBe("warning");

    expect(
      planBadge({
        planName: "Básico",
        endDate: "2026-11-06T12:00:00.000Z",
        now: NOW,
      })?.tone,
    ).toBe("danger");
  });

  it("marks an expired plan", () => {
    const badge = planBadge({
      planName: "Básico",
      endDate: "2026-11-01T12:00:00.000Z",
      now: NOW,
    });

    expect(badge?.label).toBe("Básico · vencido");
    expect(badge?.tone).toBe("danger");
  });

  it("says so when the plan has no end date", () => {
    const badge = planBadge({ planName: "Negocio", endDate: null, now: NOW });

    expect(badge?.label).toBe("Negocio · sin vencimiento");
    expect(badge?.daysRemaining).toBeNull();
  });

  it("ignores an unparseable date", () => {
    expect(
      planBadge({ planName: "Básico", endDate: "no-es-fecha", now: NOW }),
    ).toBeNull();
  });
});
