import { PrismaService } from "nestjs-prisma";

/** Platform setting the admin edits in Configuración. */
export const TRIAL_DAYS_SETTING_KEY = "DEFAULT_TRIAL_DAYS";

/** Last-resort length when neither the setting nor the env is configured. */
export const TRIAL_DAYS_FALLBACK = 14;

const MIN_TRIAL_DAYS = 1;
const MAX_TRIAL_DAYS = 365;

const asPositiveNumber = (raw: unknown): number | null => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Effective trial length a new workspace is born with.
 *
 * Source of truth is the platform setting the admin edits
 * (`DEFAULT_TRIAL_DAYS`); the env value and then 14 days are fallbacks for a
 * database that never saw the setting.
 *
 * Every consumer MUST go through this function — the first plan pick and the
 * public endpoint the register page reads. That is the whole point: the page
 * promises exactly the length the backend is going to grant, instead of a
 * number hardcoded in a component that drifts from the configuration.
 */
export async function resolveTrialDays(
  prisma: Pick<PrismaService, "systemSetting">,
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  let configured: string | null = null;

  try {
    const setting = await prisma.systemSetting?.findUnique({
      where: { key: TRIAL_DAYS_SETTING_KEY },
      select: { value: true },
    });
    configured = setting?.value ?? null;
  } catch {
    configured = null;
  }

  const days =
    asPositiveNumber(configured) ??
    asPositiveNumber(env[TRIAL_DAYS_SETTING_KEY]) ??
    TRIAL_DAYS_FALLBACK;

  return Math.min(Math.max(Math.floor(days), MIN_TRIAL_DAYS), MAX_TRIAL_DAYS);
}

/** Calendar-day addition in local time, matching how trials are granted. */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
