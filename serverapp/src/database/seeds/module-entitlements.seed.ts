/**
 * Module Entitlements Seed
 *
 * Phase 1 (schema & migration) seed:
 *  - Normalizes `SubscriptionPlan.content` from `string[]` to the canonical
 *    `{ features, grants, modules }` object shape (backward-compatible).
 *  - Seeds the `ATTENDANCE_CONTROL` add-on catalog entry.
 *  - Seeds base-plan `grants`/`modules` machine keys for the known plans,
 *    derived from the legacy plan-name gating in `permission.service.ts`.
 *
 * Idempotent: re-running never duplicates data and never overwrites
 * already-populated grants/modules (safe to run against the shared DB).
 *
 * Usage:
 *   npm run seed:entitlements
 *   # or: npx ts-node -r tsconfig-paths/register src/database/seeds/module-entitlements.seed.ts
 */

import { Prisma, PrismaClient } from "@prisma/client";
import {
  NormalizedSubscriptionPlanContent,
  normalizeSubscriptionPlanContent,
} from "../../modules/subscription/util/subscription-plan-content.util";

// Assigned by the entry point below (CLI or the boot fixture).
let prisma: PrismaClient;

const ATTENDANCE_CONTROL_KEY = "ATTENDANCE_CONTROL";

const ATTENDANCE_CONTROL_ADDON: Prisma.AddOnCreateInput = {
  key: ATTENDANCE_CONTROL_KEY,
  name: "Control de Asistencia",
  description:
    "Módulo de control de asistencia con políticas de campos por rol.",
  price: new Prisma.Decimal(0),
  currency: "USD",
  billingPeriod: "MONTHLY",
  grants: [ATTENDANCE_CONTROL_KEY],
  modules: [ATTENDANCE_CONTROL_KEY],
  active: true,
};

/**
 * Role-based field policies (design D8). A `HIDDEN` policy OMITS the field from
 * the response for that role; anything not listed stays visible. Seeded for the
 * Attendance agenda pilot: a RECEPTIONIST must not see clinical `notes`/`reason`
 * on the agenda history records.
 */
const FIELD_POLICY_SEED: Prisma.FieldPolicyCreateManyInput[] = [
  {
    moduleKey: ATTENDANCE_CONTROL_KEY,
    role: "RECEPTIONIST",
    formKey: "attendance.agenda",
    fieldKey: "notes",
    access: "HIDDEN",
  },
  {
    moduleKey: ATTENDANCE_CONTROL_KEY,
    role: "RECEPTIONIST",
    formKey: "attendance.agenda",
    fieldKey: "reason",
    access: "HIDDEN",
  },
];

/**
 * Base-plan machine keys, mirroring the legacy hardcoded plan-name gating so
 * entitlement resolution preserves behavior. Keys are matched on the
 * accent-stripped, uppercased plan name (e.g. "Clínica" -> "CLINICA").
 */
const BASE_PLAN_GRANTS: Record<
  string,
  { grants: string[]; modules: string[] }
> = {
  PREMIUM: {
    grants: [
      "PREMIUM_ACCESS",
      "INVENTORY_ACCESS",
      "POS_ACCESS",
      "BILLING_ACCESS",
      "CLIENTS_ACCESS",
      "ATTENDANCE_ACCESS",
    ],
    modules: ["INVENTORY", "POS", "BILLING_SALES", "CLIENTS", "ATTENDANCE_CONTROL"],
  },
  BUSINESS: {
    grants: [
      "BUSINESS_ACCESS",
      "INVENTORY_ACCESS",
      "POS_ACCESS",
      "BILLING_ACCESS",
      "CLIENTS_ACCESS",
      "ATTENDANCE_ACCESS",
    ],
    modules: ["INVENTORY", "POS", "BILLING_SALES", "CLIENTS", "ATTENDANCE_CONTROL"],
  },
  PRO: {
    grants: [
      "PRO_ACCESS",
      "INVENTORY_ACCESS",
      "POS_ACCESS",
      "BILLING_ACCESS",
      "CLIENTS_ACCESS",
    ],
    modules: ["INVENTORY", "POS", "BILLING_SALES", "CLIENTS"],
  },
};

function planKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function sameArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Pure, side-effect-free decision for a single plan. Given the current raw
 * `content`, returns the canonical content to persist and whether a write is
 * needed. Applying it twice in a row is a no-op the second time (idempotent).
 */
export function computeNormalizedPlanContent(
  planName: string,
  rawContent: unknown,
): { next: NormalizedSubscriptionPlanContent; needsUpdate: boolean } {
  const current = normalizeSubscriptionPlanContent(rawContent, planName);
  const base = BASE_PLAN_GRANTS[planKey(planName)];

  // Extra keys the repository owns beyond the normalized triple — notably
  // `capacity` (plan seats/branches, S9) — are PRESERVED: dropping them here
  // would silently strip the pricing block the next time this seed runs.
  const extras = (
    rawContent && typeof rawContent === "object" && !Array.isArray(rawContent)
      ? (rawContent as Record<string, unknown>)
      : {}
  ) as Record<string, unknown>;

  const next = {
    ...extras,
    features: current.features,
    grants: current.grants.length === 0 && base ? base.grants : current.grants,
    modules:
      current.modules.length === 0 && base ? base.modules : current.modules,
  } as NormalizedSubscriptionPlanContent & Record<string, unknown>;

  const needsUpdate =
    Array.isArray(rawContent) ||
    !sameArray(current.features, next.features) ||
    !sameArray(current.grants, next.grants) ||
    !sameArray(current.modules, next.modules);

  return { next, needsUpdate };
}

async function seedAddOn(): Promise<void> {
  console.log(`Seeding AddOn: ${ATTENDANCE_CONTROL_KEY}...`);

  await prisma.addOn.upsert({
    where: { key: ATTENDANCE_CONTROL_KEY },
    update: {
      name: ATTENDANCE_CONTROL_ADDON.name,
      description: ATTENDANCE_CONTROL_ADDON.description,
      price: ATTENDANCE_CONTROL_ADDON.price,
      currency: ATTENDANCE_CONTROL_ADDON.currency,
      billingPeriod: ATTENDANCE_CONTROL_ADDON.billingPeriod,
      grants: ATTENDANCE_CONTROL_ADDON.grants,
      modules: ATTENDANCE_CONTROL_ADDON.modules,
      active: ATTENDANCE_CONTROL_ADDON.active,
    },
    create: ATTENDANCE_CONTROL_ADDON,
  });

  console.log(`  → ${ATTENDANCE_CONTROL_KEY} ready`);
}

async function seedFieldPolicies(): Promise<void> {
  console.log(`Seeding ${FIELD_POLICY_SEED.length} field policies...`);

  for (const policy of FIELD_POLICY_SEED) {
    await prisma.fieldPolicy.upsert({
      where: {
        moduleKey_role_formKey_fieldKey: {
          moduleKey: policy.moduleKey,
          role: policy.role,
          formKey: policy.formKey,
          fieldKey: policy.fieldKey,
        },
      },
      update: { access: policy.access },
      create: policy,
    });
    console.log(
      `  → ${policy.moduleKey}/${policy.role}/${policy.formKey}/${policy.fieldKey} = ${policy.access}`,
    );
  }
}

async function normalizePlans(): Promise<void> {
  console.log("Normalizing SubscriptionPlan.content...");

  const plans = await prisma.subscriptionPlan.findMany();

  for (const plan of plans) {
    const { next, needsUpdate } = computeNormalizedPlanContent(
      plan.name,
      plan.content,
    );

    if (!needsUpdate) {
      console.log(`  ⏭️  Already normalized: ${plan.name}`);
      continue;
    }

    await prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: { content: next as unknown as Prisma.InputJsonValue },
    });
    console.log(`  ✅ Normalized: ${plan.name}`);
  }
}

/** Boot/CLI entry: add-on, field policies and plan normalization. */
export async function seedModuleEntitlements(db: PrismaClient): Promise<void> {
  prisma = db;
  await seedAddOn();
  await seedFieldPolicies();
  await normalizePlans();
}

async function main(): Promise<void> {
  console.log("🌱 Seeding module entitlements...\n");

  const db = new PrismaClient();
  try {
    await seedModuleEntitlements(db);
    console.log("\n✅ Module entitlements seeded!");
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
