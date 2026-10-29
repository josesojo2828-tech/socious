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

const prisma = new PrismaClient();

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
      "COMMUNITY_ACCESS",
      "COMMUNITY_BROWSE",
      "COMMUNITY_IMPORT",
      "COMMUNITY_PUBLISH",
      "PORTFOLIO_MANAGE",
      "INSTITUTIONAL_FOOD_ACCESS",
      "CALCULADORA_PREMIUM_ACCESS",
    ],
    modules: ["COMMUNITY", "PORTFOLIO", "INSTITUTIONAL_FOOD"],
  },
  CLINICA: {
    grants: [
      "PREMIUM_ACCESS",
      "COMMUNITY_ACCESS",
      "COMMUNITY_BROWSE",
      "COMMUNITY_IMPORT",
      "COMMUNITY_PUBLISH",
      "PORTFOLIO_MANAGE",
      "INSTITUTIONAL_FOOD_ACCESS",
      "CALCULADORA_PREMIUM_ACCESS",
    ],
    modules: ["COMMUNITY", "PORTFOLIO", "INSTITUTIONAL_FOOD"],
  },
  PRO: {
    grants: [
      "PRO_ACCESS",
      "COMMUNITY_ACCESS",
      "CALCULADORA_PREMIUM_ACCESS",
    ],
    modules: ["COMMUNITY"],
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

  const next: NormalizedSubscriptionPlanContent = {
    features: current.features,
    grants: current.grants.length === 0 && base ? base.grants : current.grants,
    modules:
      current.modules.length === 0 && base ? base.modules : current.modules,
  };

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

async function main(): Promise<void> {
  console.log("🌱 Seeding module entitlements...\n");

  await seedAddOn();
  await seedFieldPolicies();
  await normalizePlans();

  console.log("\n✅ Module entitlements seeded!");
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
