/**
 * Module Catalog Seed
 *
 * Phase 1 (schema & migration) seed for the module framework:
 *  - Upserts the initial `Module` catalog (idempotent, keyed by `key`).
 *  - Re-runs the `AddOn.modules` → `AddOnModule` backfill. The migration's
 *    backfill executes BEFORE the catalog exists (fresh DB), so this pass links
 *    existing add-ons to the now-seeded catalog. `ON CONFLICT DO NOTHING` keeps
 *    it idempotent.
 *
 * Idempotent: re-running never duplicates data and never clobbers catalog rows
 * (safe to run against the shared DB).
 *
 * Usage:
 *   npm run seed:modules
 *   # or: npx ts-node -r tsconfig-paths/register src/database/seeds/module-catalog.seed.ts
 */

import { ModuleScope, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Initial catalog. Only the machine keys already present in the system are
 * seeded (`AddOn.modules` / `SubscriptionPlan.content.modules`) so the backfill
 * is meaningful. The 12 business modules remain OUT OF SCOPE.
 */
const MODULE_CATALOG = [
  {
    key: "ATTENDANCE_CONTROL",
    name: "Control de Asistencia",
    description:
      "Módulo de control de asistencia con políticas de campos por rol.",
    icon: "calendar-check",
    category: "OPERATIONS",
    scopes: [ModuleScope.TENANT, ModuleScope.ADMIN],
    operatorPermit: null,
    dashboardKind: "CONFIG",
    sortOrder: 10,
  },
  {
    key: "INSTITUTIONAL_FOOD",
    name: "Alimentación Institucional",
    description:
      "Cálculo de menús y raciones para servicios de alimentación institucional.",
    icon: "calculator",
    category: "NUTRITION",
    scopes: [ModuleScope.TENANT],
    operatorPermit: null,
    dashboardKind: "ANALYTICS",
    sortOrder: 20,
  },
  {
    key: "COMMUNITY",
    name: "Comunidad",
    description:
      "Red social, publicaciones y seguimiento entre profesionales.",
    icon: "people",
    category: "COMMUNITY",
    scopes: [ModuleScope.TENANT, ModuleScope.USER],
    operatorPermit: null,
    dashboardKind: "ANALYTICS",
    sortOrder: 30,
  },
  {
    key: "PORTFOLIO",
    name: "Portafolio",
    description: "Portafolio profesional público con casos y experiencia.",
    icon: "briefcase",
    category: "COMMUNITY",
    scopes: [ModuleScope.TENANT, ModuleScope.USER],
    operatorPermit: null,
    dashboardKind: "CONFIG",
    sortOrder: 40,
  },
] as const;

async function seedCatalog(): Promise<void> {
  console.log(`Seeding ${MODULE_CATALOG.length} modules...`);

  for (const module of MODULE_CATALOG) {
    await prisma.module.upsert({
      where: { key: module.key },
      update: {
        name: module.name,
        description: module.description,
        icon: module.icon,
        category: module.category,
        scopes: [...module.scopes],
        operatorPermit: module.operatorPermit,
        dashboardKind: module.dashboardKind,
        active: true,
        sortOrder: module.sortOrder,
      },
      create: {
        key: module.key,
        name: module.name,
        description: module.description,
        icon: module.icon,
        category: module.category,
        scopes: [...module.scopes],
        operatorPermit: module.operatorPermit,
        dashboardKind: module.dashboardKind,
        active: true,
        sortOrder: module.sortOrder,
      },
    });
    console.log(`  → ${module.key} ready`);
  }
}

/**
 * Idempotent link of `AddOn.modules` (TEXT[]) to the seeded catalog. Unknown
 * keys are skipped; already-linked pairs are ignored.
 */
async function backfillAddOnModules(): Promise<void> {
  console.log("Backfilling AddOn.modules → AddOnModule...");

  const linked = await prisma.$executeRawUnsafe(`
    INSERT INTO "AddOnModule" ("addOnId", "moduleId")
    SELECT a.id, m.id
    FROM "AddOn" a
    JOIN LATERAL unnest(a.modules) AS k ON true
    JOIN "Module" m ON m.key = k
    ON CONFLICT DO NOTHING;
  `);

  console.log(`  → ${linked} link(s) inserted`);
}

async function main(): Promise<void> {
  console.log("🌱 Seeding module catalog...\n");

  await seedCatalog();
  await backfillAddOnModules();

  console.log("\n✅ Module catalog seeded!");
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
