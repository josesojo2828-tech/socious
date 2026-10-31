/**
 * Commercial plans seed (S9, S11).
 *
 * Seeds the three Socius plans, their module grants and the capacity each plan
 * buys, plus the two quantity add-ons. Idempotent: keyed by id, re-running
 * rewrites the repository's own values (the catalog always wins) and never
 * touches rows of plans it does not own.
 *
 * Capacity (the reading adopted in the plan, L8 of the feature doc):
 *   BASICO   → 1 sucursal (la oculta por defecto), 1 empleado (el dueño)
 *   AVANZADO → 1 sucursal, 1 empleado
 *   PREMIUM  → 3 sucursales (1 por defecto + 2), 2 empleados por sucursal
 * Empleados y sucursales adicionales se compran con los add-ons EXTRA_EMPLOYEE
 * (4.99) y EXTRA_BRANCH (9.99).
 *
 * Usage: runs from DataFixtureService on boot, or manually:
 *   npm run seed:plans
 */

import { PrismaClient } from "@prisma/client";

export interface PlanSeedContext {
  log?: (message: string) => void;
}

/** New module keys the plans unlock (added to the platform catalog). */
const NEW_MODULES = [
  {
    key: "ORDERS",
    name: "Pedidos",
    description:
      "Bandeja de pedidos, estados y conversión a venta.",
    icon: "shopping-bag",
    category: "SALES",
    sortOrder: 40,
  },
  {
    key: "CATALOG_ONLINE",
    name: "Catálogo online",
    description:
      "Tienda pública por slug con carrito y pedidos desde la web.",
    icon: "globe",
    category: "COMMERCIAL",
    sortOrder: 50,
  },
  {
    key: "SHIPPING",
    name: "Envíos y delivery",
    description:
      "Tipos de entrega, agencias de envío y cobro de delivery.",
    icon: "truck",
    category: "COMMERCIAL",
    sortOrder: 60,
  },
  {
    key: "ROUTES",
    name: "Rutas de entrega",
    description:
      "Agrupa los pedidos de un día en una ruta y marca cada entrega.",
    icon: "map",
    category: "OPERATIONS",
    sortOrder: 70,
  },
  {
    key: "OFFERS",
    name: "Ofertas",
    description:
      "Promos con banner y vencimiento sobre productos elegidos (Avanzado+).",
    icon: "megaphone",
    category: "COMMERCIAL",
    sortOrder: 85,
  },
  {
    key: "BRANCHES",
    name: "Sucursales",
    description:
      "Habilita la gestión de subciales; el admin la asigna como grant manual.",
    icon: "building",
    category: "OPERATIONS",
    sortOrder: 100,
  },
  {
    key: "NOTIFICATIONS",
    name: "Notificaciones",
    description:
      "Avisos de stock, cobros y pedidos (lógica de preferencias; el envío llega después).",
    icon: "bell",
    category: "OPERATIONS",
    sortOrder: 90,
  },
  {
    key: "PRESENTATIONS",
    name: "Presentaciones",
    description:
      "Variantes de un producto (color, medidas) con stock propio y descomposición.",
    icon: "package",
    category: "INVENTORY",
    sortOrder: 80,
  },
] as const;

const PLAN_MODULES = {
  BASICO: ["CLIENTS", "INVENTORY", "POS", "BILLING_SALES"],
  AVANZADO: [
    "CLIENTS",
    "INVENTORY",
    "POS",
    "BILLING_SALES",
    "ORDERS",
    "CATALOG_ONLINE",
    "SHIPPING",
    "ROUTES",
    "PRESENTATIONS",
    "NOTIFICATIONS",
    "OFFERS",
  ],
  PREMIUM: [
    "CLIENTS",
    "INVENTORY",
    "POS",
    "BILLING_SALES",
    "ORDERS",
    "CATALOG_ONLINE",
    "SHIPPING",
    "ROUTES",
    "PRESENTATIONS",
    "NOTIFICATIONS",
    "OFFERS",
  ],
} as const;

export const PLAN_SEEDS = [
  {
    id: "BASICO",
    name: "Básico",
    price: 9.99,
    badge: null as string | null,
    description:
      "Lo esencial para operar: cartera de clientes, catálogo, caja y ventas.",
    features: [
      "Clientes",
      "Proveedores",
      "Categorías",
      "Productos",
      "Caja",
      "Ventas",
      "Compras a crédito",
    ],
    modules: [...PLAN_MODULES.BASICO],
    capacity: { maxBranches: 1, includedSeats: 1 },
  },
  {
    id: "AVANZADO",
    name: "Avanzado",
    price: 19.99,
    badge: "Más elegido" as string | null,
    description:
      "Todo el Básico más la tienda, los pedidos y la logística.",
    features: [
      "Todo lo del plan Básico",
      "Envíos",
      "Pedidos",
      "Catálogo online",
      "Cálculos en múltiple moneda",
      "Delivery",
      "Ruta",
    ],
    modules: [...PLAN_MODULES.AVANZADO],
    capacity: { maxBranches: 1, includedSeats: 1 },
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: 34.99,
    badge: null as string | null,
    description:
      "Todo el Avanzado con sucursales y equipo incluidos.",
    features: [
      "Todo lo del plan Avanzado",
      "Extender subcursales (2)",
      "Agregar empleados (2 * subcursal)",
    ],
    modules: [...PLAN_MODULES.PREMIUM],
    capacity: { maxBranches: 3, includedSeats: 6 },
  },
] as const;

/** Quantity add-ons: priced per unit, billed monthly (S9). */
export const ADDON_SEEDS = [
  {
    key: "EXTRA_EMPLOYEE",
    name: "Empleado adicional",
    description: "+4.99 por empleado y mes, habilitable en cualquier plan.",
    price: 4.99,
  },
  {
    key: "EXTRA_BRANCH",
    name: "Sucursal adicional",
    description:
      "+9.99 por sucursal y mes; cada sucursal trae 2 empleados por defecto.",
    price: 9.99,
  },
] as const;

/** Nutrition-era plans kept for existing subscriptions but retired from the list. */
const RETIRED_PLAN_IDS = ["PRO", "Clinica", "Premium"];

export async function seedPlans(
  prisma: PrismaClient,
  context: PlanSeedContext = {},
): Promise<void> {
  const log = context.log ?? (() => undefined);

  for (const module of NEW_MODULES) {
    await prisma.module.upsert({
      where: { key: module.key },
      create: {
        key: module.key,
        name: module.name,
        description: module.description,
        icon: module.icon,
        category: module.category,
        scopes: ["TENANT", "ADMIN"],
        active: true,
        sortOrder: module.sortOrder,
      },
      update: {
        name: module.name,
        description: module.description,
        icon: module.icon,
        category: module.category,
        active: true,
      },
    });
  }
  log(`  → ${NEW_MODULES.length} module key(s) in the catalog`);

  for (const plan of PLAN_SEEDS) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: "USD",
        selected: true,
        badge: plan.badge,
        description: plan.description,
        content: {
          features: [...plan.features],
          grants: [],
          modules: [...plan.modules],
          capacity: plan.capacity,
        },
      },
      update: {
        name: plan.name,
        price: plan.price,
        currency: "USD",
        selected: true,
        badge: plan.badge,
        description: plan.description,
        content: {
          features: [...plan.features],
          grants: [],
          modules: [...plan.modules],
          capacity: plan.capacity,
        },
      },
    });
  }
  log(`  → ${PLAN_SEEDS.length} plan(s) seeded (${PLAN_SEEDS.map((p) => `${p.name} ${p.price}`).join(", ")})`);

  for (const addOn of ADDON_SEEDS) {
    await prisma.addOn.upsert({
      where: { key: addOn.key },
      create: {
        key: addOn.key,
        name: addOn.name,
        description: addOn.description,
        price: addOn.price,
        currency: "USD",
        billingPeriod: "MONTHLY",
        grants: [],
        modules: [],
        active: true,
      },
      update: {
        name: addOn.name,
        description: addOn.description,
        price: addOn.price,
        active: true,
      },
    });
  }
  log(`  → ${ADDON_SEEDS.length} add-on(s) seeded`);

  const retired = await prisma.subscriptionPlan.updateMany({
    where: { id: { in: [...RETIRED_PLAN_IDS] } },
    data: { selected: false },
  });
  if (retired.count > 0) {
    log(`  → ${retired.count} legacy plan(s) retired from the public list`);
  }
}

async function main(): Promise<void> {
  console.log("🌱 Seeding Socius plans...\n");
  const prisma = new PrismaClient();
  try {
    await seedPlans(prisma, { log: console.log });
    console.log("\n✅ Plans seeded!");
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
