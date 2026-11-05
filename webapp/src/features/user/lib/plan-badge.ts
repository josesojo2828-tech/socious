/**
 * Header badge for the active plan: which plan the workspace is on and when it
 * expires. Pure so it can be unit-tested under vitest's node environment (this
 * repo has no jsdom).
 */

export type PlanBadgeTone = "danger" | "warning" | "neutral";

export interface PlanBadge {
  /** Short pill text, e.g. "Básico · vence 05/12/2026". */
  label: string;
  /** Full sentence for the `title` attribute. */
  title: string;
  tone: PlanBadgeTone;
  daysRemaining: number | null;
}

const DAY_MS = 86_400_000;

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function planBadge(input: {
  planName?: string | null;
  /** ISO string (API) or a Date (session subscription type). */
  endDate?: string | Date | null;
  now?: Date;
}): PlanBadge | null {
  const planName = input.planName?.trim();
  if (!planName) return null;

  if (!input.endDate) {
    return {
      label: `${planName} · sin vencimiento`,
      title: `Plan ${planName}: sin fecha de vencimiento.`,
      tone: "neutral",
      daysRemaining: null,
    };
  }

  const end = new Date(input.endDate);
  if (Number.isNaN(end.getTime())) return null;

  const now = input.now ?? new Date();
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / DAY_MS);
  const date = formatDate(end);

  if (daysRemaining < 0) {
    return {
      label: `${planName} · vencido`,
      title: `El plan ${planName} venció el ${date}.`,
      tone: "danger",
      daysRemaining,
    };
  }

  const tone: PlanBadgeTone =
    daysRemaining <= 1 ? "danger" : daysRemaining <= 5 ? "warning" : "neutral";

  return {
    label: `${planName} · vence ${date}`,
    title: `Plan ${planName}: vence el ${date} (${daysRemaining} ${
      daysRemaining === 1 ? "día" : "días"
    }).`,
    tone,
    daysRemaining,
  };
}
