/**
 * seed.waste-factors.ts
 *
 * Seed que asigna wasteFactor (factor de mermas) a filas FoodItem existentes.
 *
 * SEMÁNTICA: wasteFactor = 1 → sin merma; > 1 → comprar ese múltiplo de la cantidad neta
 * (ej. 1.29 = comprar 29% extra por mermas de limpieza/desperdicio).
 *
 * FUENTES (atribución):
 *   - Fuente PRIMARIA: Tabla de Factores de Desecho oficial del INN (Instituto Nacional
 *     de Nutrición, Venezuela). Los valores 1.29, 1.58, 1.20, 1.80, 1.34, 2.49 y 1.30
 *     (Repollo morado, Tomate manzano, Tomate perita, Topocho maduro, Yuca, Arvejas
 *     frescas, Garbanzos) son EXACTOS capturados del cuadro oficial. El resto de valores
 *     marcados source='INN' y verified=false son ESTIMACIONES ilustrativas dentro del
 *     rango de la misma familia de la tabla INN (1.14–1.45).
 *   - Fuente SECUNDARIA (base): tabla orientativa de % merma / % rendimiento de
 *     ingenieriademenu.com (verduras, frutas, carnes, pescados). Documento local:
 *     /home/jsojo/Documentos/ECOSYSTEM/Nutringest/factores-desecho-inn/tabla_mermas_orientativa.pdf
 *     Conversión aplicada: wasteFactor = 100 / rendimiento, redondeado a 2 decimales.
 *
 * DISCLAIMER:
 *   Valores ORIENTATIVOS a validar contra la Tabla de Factores de Desecho oficial del
 *   INN (2001). verified = true solo para los 7 valores EXACTOS del INN; el resto son
 *   estimaciones/rangos y deben validarse antes de usar en costeo institucional.
 *
 * REGLA DE MEZCLA: los valores orientativos son la base; cuando un alimento coincide con
 * un ítem INN, el valor INN prevalece (el listado ya está fusionado y no duplica
 * alimentos cubiertos por INN).
 *
 * MATCHING: por nombre normalizado (minúsculas, sin acentos), priorizando:
 *   1. coincidencia exacta del FoodItem, 2. contains (nombre DB contiene el del seed),
 *   3. hint explícito (matchName) para sinónimos (ej. "Col blanca" → "Repollo blanco",
 *   "Sandía" → "Patilla", "Puerro" → "Ajoporro"). Los ítems sin match se reportan al final.
 *
 * Uso desde terminal:
 *   npm run seed:waste-factors
 *   (o) npx ts-node -r tsconfig-paths/register src/shared/fixtures/nutrition/seed.waste-factors.ts
 *
 * Uso como función reutilizable (seed automático en bootstrap):
 *   import { SeedWasteFactors } from "./seed.waste-factors";
 *   await SeedWasteFactors(prisma);  // prisma: PrismaClient | PrismaService
 *
 * IDEMPOTENCIA: solo actualiza el FoodItem cuando el wasteFactor difiere del valor
 * actual en DB. En ejecuciones repetidas, los items ya con el valor correcto se
 * cuentan como "skipped" y no se tocan.
 */

import { Prisma, PrismaClient } from "@prisma/client";

import type { SeedLogger } from "./seed.sport-disciplines";

type FactorSource = "INN" | "ORIENTATIVA";

export interface WasteFactorSeed {
  /** Nombre tal como figura en la fuente (INN o tabla orientativa). */
  name: string;
  wasteFactor: number;
  source: FactorSource;
  /** Solo los 7 valores EXACTOS del INN tienen verified=true. */
  verified: boolean;
  /** Nombre DB objetivo cuando el nombre de la fuente no matchea directamente. */
  matchName?: string;
  /** Provenance de la tabla orientativa (opcional). */
  mermaPct?: number;
  rendimientoPct?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUENTE 1 — Tabla de Factores de Desecho (INN, Venezuela)
//   verified=true  → 7 valores EXACTOS del cuadro oficial
//   verified=false → estimaciones ilustrativas del rango INN (misma familia)
// ─────────────────────────────────────────────────────────────────────────────
const INN_FACTORS: WasteFactorSeed[] = [
  // ── 7 EXACTOS ───────────────────────────────────────────────────────────────
  { name: "Repollo morado", wasteFactor: 1.29, source: "INN", verified: true },
  { name: "Tomate manzano", wasteFactor: 1.58, source: "INN", verified: true },
  { name: "Tomate perita", wasteFactor: 1.2, source: "INN", verified: true },
  {
    name: "Topocho maduro",
    wasteFactor: 1.8,
    source: "INN",
    verified: true,
    matchName: "Cambur topocho",
  },
  { name: "Yuca", wasteFactor: 1.34, source: "INN", verified: true },
  {
    name: "Arvejas frescas",
    wasteFactor: 2.49,
    source: "INN",
    verified: true,
    matchName: "Arvejas tiernas",
  },
  { name: "Garbanzos", wasteFactor: 1.3, source: "INN", verified: true },
  // ── ESTIMADOS (rango INN, mismas familias) ─────────────────────────────────
  { name: "Acelga", wasteFactor: 1.15, source: "INN", verified: false },
  { name: "Aceituna", wasteFactor: 1.14, source: "INN", verified: false },
  { name: "Achicoria", wasteFactor: 1.19, source: "INN", verified: false },
  { name: "Aguacate", wasteFactor: 1.35, source: "INN", verified: false },
  { name: "Ají dulce", wasteFactor: 1.19, source: "INN", verified: false },
  {
    name: "Ají picante",
    wasteFactor: 1.24,
    source: "INN",
    verified: false,
    matchName: "Ají chile picante",
  },
  { name: "Ajo", wasteFactor: 1.23, source: "INN", verified: false },
  { name: "Ajoporro", wasteFactor: 1.43, source: "INN", verified: false },
  { name: "Alcachofa", wasteFactor: 1.45, source: "INN", verified: false },
  {
    name: "Apio criollo",
    wasteFactor: 1.21,
    source: "INN",
    verified: false,
    matchName: "Apio",
  },
  { name: "Vainita", wasteFactor: 1.19, source: "INN", verified: false },
  { name: "Zanahoria", wasteFactor: 1.18, source: "INN", verified: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// FUENTE 2 — Tabla de Mermas orientativa (ingenieriademenu.com)
//   wasteFactor = 100 / rendimiento, redondeado a 2 decimales.
//   Se incluyen solo alimentos con FoodItem existente en DB. Los cubiertos por INN
//   (Acelga, Aguacate, Alcachofa, Apio, Zanahoria, Judía verde→Vainita, Puerro→Ajoporro)
//   usan el valor INN y no se duplican aquí.
// ─────────────────────────────────────────────────────────────────────────────
const ORIENTATIVA_FACTORS: WasteFactorSeed[] = [
  // ── VERDURAS Y HORTALIZAS ───────────────────────────────────────────────────
  { name: "Berenjena", wasteFactor: 1.15, source: "ORIENTATIVA", verified: false, mermaPct: 13, rendimientoPct: 87 },
  { name: "Brócoli", wasteFactor: 1.43, source: "ORIENTATIVA", verified: false, mermaPct: 30, rendimientoPct: 70 },
  { name: "Calabacín", wasteFactor: 1.12, source: "ORIENTATIVA", verified: false, mermaPct: 11, rendimientoPct: 89 },
  { name: "Cebolla", wasteFactor: 1.18, source: "ORIENTATIVA", verified: false, mermaPct: 15, rendimientoPct: 85 },
  { name: "Champiñones", wasteFactor: 1.11, source: "ORIENTATIVA", verified: false, mermaPct: 10, rendimientoPct: 90 },
  {
    name: "Col blanca",
    wasteFactor: 1.18,
    source: "ORIENTATIVA",
    verified: false,
    matchName: "Repollo blanco",
    mermaPct: 15,
    rendimientoPct: 85,
  },
  {
    name: "Col de Bruselas",
    wasteFactor: 1.18,
    source: "ORIENTATIVA",
    verified: false,
    matchName: "Repollito de bruselas",
    mermaPct: 15,
    rendimientoPct: 85,
  },
  { name: "Coliflor", wasteFactor: 1.43, source: "ORIENTATIVA", verified: false, mermaPct: 30, rendimientoPct: 70 },
  {
    name: "Espárrago blanco",
    wasteFactor: 1.43,
    source: "ORIENTATIVA",
    verified: false,
    matchName: "Espárrago",
    mermaPct: 30,
    rendimientoPct: 70,
  },
  { name: "Lechuga", wasteFactor: 1.18, source: "ORIENTATIVA", verified: false, mermaPct: 15, rendimientoPct: 85 },
  {
    name: "Papa pelada a mano",
    wasteFactor: 1.43,
    source: "ORIENTATIVA",
    verified: false,
    matchName: "Papa",
    mermaPct: 30,
    rendimientoPct: 70,
  },
  { name: "Papaya", wasteFactor: 1.18, source: "ORIENTATIVA", verified: false, mermaPct: 15, rendimientoPct: 85 },
  { name: "Pepino", wasteFactor: 1.05, source: "ORIENTATIVA", verified: false, mermaPct: 5, rendimientoPct: 95 },
  { name: "Pimiento rojo", wasteFactor: 1.25, source: "ORIENTATIVA", verified: false, mermaPct: 20, rendimientoPct: 80 },
  {
    name: "Pimiento verde",
    wasteFactor: 1.25,
    source: "ORIENTATIVA",
    verified: false,
    matchName: "Pimentón verde",
    mermaPct: 20,
    rendimientoPct: 80,
  },
  // ── FRUTAS ──────────────────────────────────────────────────────────────────
  {
    name: "Ciruela",
    wasteFactor: 1.18,
    source: "ORIENTATIVA",
    verified: false,
    matchName: "Ciruela de huesito",
    mermaPct: 15,
    rendimientoPct: 85,
  },
  { name: "Fresa", wasteFactor: 1.04, source: "ORIENTATIVA", verified: false, mermaPct: 4, rendimientoPct: 96 },
  { name: "Granada", wasteFactor: 1.82, source: "ORIENTATIVA", verified: false, mermaPct: 45, rendimientoPct: 55 },
  { name: "Higo", wasteFactor: 1.11, source: "ORIENTATIVA", verified: false, mermaPct: 10, rendimientoPct: 90 },
  { name: "Kiwi", wasteFactor: 1.11, source: "ORIENTATIVA", verified: false, mermaPct: 10, rendimientoPct: 90 },
  {
    name: "Lima",
    wasteFactor: 1.32,
    source: "ORIENTATIVA",
    verified: false,
    matchName: "Lima dulce",
    mermaPct: 24,
    rendimientoPct: 76,
  },
  { name: "Limón", wasteFactor: 1.56, source: "ORIENTATIVA", verified: false, mermaPct: 36, rendimientoPct: 64 },
  {
    name: "Manzana",
    wasteFactor: 1.14,
    source: "ORIENTATIVA",
    verified: false,
    matchName: "Manzana",
    mermaPct: 12.5,
    rendimientoPct: 87.5,
  },
  { name: "Melón", wasteFactor: 1.54, source: "ORIENTATIVA", verified: false, mermaPct: 35, rendimientoPct: 65 },
  { name: "Naranja", wasteFactor: 1.47, source: "ORIENTATIVA", verified: false, mermaPct: 32, rendimientoPct: 68 },
  { name: "Pera", wasteFactor: 1.22, source: "ORIENTATIVA", verified: false, mermaPct: 18, rendimientoPct: 82 },
  { name: "Piña", wasteFactor: 1.33, source: "ORIENTATIVA", verified: false, mermaPct: 25, rendimientoPct: 75 },
  { name: "Plátano", wasteFactor: 1.54, source: "ORIENTATIVA", verified: false, mermaPct: 35, rendimientoPct: 65 },
  {
    name: "Sandía",
    wasteFactor: 1.43,
    source: "ORIENTATIVA",
    verified: false,
    matchName: "Patilla",
    mermaPct: 30,
    rendimientoPct: 70,
  },
  { name: "Tomate", wasteFactor: 1.18, source: "ORIENTATIVA", verified: false, mermaPct: 15, rendimientoPct: 85 },
  { name: "Tomate cherry", wasteFactor: 1.05, source: "ORIENTATIVA", verified: false, mermaPct: 5, rendimientoPct: 95 },
  // ── CARNES Y AVES ───────────────────────────────────────────────────────────
  { name: "Carne de cordero", wasteFactor: 1.25, source: "ORIENTATIVA", verified: false, matchName: "Cordero", mermaPct: 20, rendimientoPct: 80 },
  { name: "Cerdo (costillas)", wasteFactor: 1.49, source: "ORIENTATIVA", verified: false, matchName: "Costilla de cerdo", mermaPct: 33, rendimientoPct: 67 },
  { name: "Conejo", wasteFactor: 1.25, source: "ORIENTATIVA", verified: false, matchName: "Conejo, carne de", mermaPct: 20, rendimientoPct: 80 },
  { name: "Lomo de cerdo", wasteFactor: 1.25, source: "ORIENTATIVA", verified: false, matchName: "Lomo de cerdo", mermaPct: 20, rendimientoPct: 80 },
  { name: "Pato (asado)", wasteFactor: 1.54, source: "ORIENTATIVA", verified: false, matchName: "Pato, carne de", mermaPct: 35, rendimientoPct: 65 },
  { name: "Pavo (asado)", wasteFactor: 1.54, source: "ORIENTATIVA", verified: false, matchName: "Pavo, carne de", mermaPct: 35, rendimientoPct: 65 },
  { name: "Pechuga de pavo", wasteFactor: 1.43, source: "ORIENTATIVA", verified: false, matchName: "Pechuga de pavo", mermaPct: 30, rendimientoPct: 70 },
  { name: "Pechuga de pollo", wasteFactor: 1.59, source: "ORIENTATIVA", verified: false, matchName: "Pollo pechuga", mermaPct: 37, rendimientoPct: 63 },
  { name: "Pollo", wasteFactor: 1.35, source: "ORIENTATIVA", verified: false, matchName: "Pollo, carne de", mermaPct: 26, rendimientoPct: 74 },
  { name: "Vacuno (guiso)", wasteFactor: 1.37, source: "ORIENTATIVA", verified: false, matchName: "Carne de res magra", mermaPct: 27, rendimientoPct: 73 },
  { name: "Vacuno (lomo)", wasteFactor: 1.69, source: "ORIENTATIVA", verified: false, matchName: "Solomo (res)", mermaPct: 41, rendimientoPct: 59 },
  // ── PESCADOS Y MARISCOS ─────────────────────────────────────────────────────
  { name: "Almeja", wasteFactor: 3.33, source: "ORIENTATIVA", verified: false, matchName: "Almejas", mermaPct: 70, rendimientoPct: 30 },
  { name: "Bacalao fresco", wasteFactor: 2.0, source: "ORIENTATIVA", verified: false, matchName: "Bacalao (pescado)", mermaPct: 50, rendimientoPct: 50 },
  { name: "Bonito", wasteFactor: 1.41, source: "ORIENTATIVA", verified: false, matchName: "Bonito (pescado)", mermaPct: 29, rendimientoPct: 71 },
  { name: "Calamar", wasteFactor: 1.25, source: "ORIENTATIVA", verified: false, matchName: "Calamares", mermaPct: 20, rendimientoPct: 80 },
  { name: "Camarón grande", wasteFactor: 1.18, source: "ORIENTATIVA", verified: false, matchName: "Camarones", mermaPct: 15, rendimientoPct: 85 },
  { name: "Langosta", wasteFactor: 4.0, source: "ORIENTATIVA", verified: false, matchName: "Langosta", mermaPct: 75, rendimientoPct: 25 },
  { name: "Lenguado", wasteFactor: 2.0, source: "ORIENTATIVA", verified: false, matchName: "Lenguado (pescado)", mermaPct: 50, rendimientoPct: 50 },
  { name: "Merluza", wasteFactor: 2.0, source: "ORIENTATIVA", verified: false, matchName: "Merluza (pescado)", mermaPct: 50, rendimientoPct: 50 },
  { name: "Pulpo", wasteFactor: 1.25, source: "ORIENTATIVA", verified: false, matchName: "Pulpo", mermaPct: 20, rendimientoPct: 80 },
  { name: "Raya", wasteFactor: 1.14, source: "ORIENTATIVA", verified: false, matchName: "Rayado (pescado)", mermaPct: 12, rendimientoPct: 88 },
  { name: "Salmón", wasteFactor: 1.54, source: "ORIENTATIVA", verified: false, matchName: "Salmón", mermaPct: 35, rendimientoPct: 65 },
  { name: "Sardina", wasteFactor: 1.22, source: "ORIENTATIVA", verified: false, matchName: "Sardinas", mermaPct: 18, rendimientoPct: 82 },
  { name: "Trucha", wasteFactor: 1.43, source: "ORIENTATIVA", verified: false, matchName: "Trucha", mermaPct: 30, rendimientoPct: 70 },
];

export const SEED_FACTORS: WasteFactorSeed[] = [...INN_FACTORS, ...ORIENTATIVA_FACTORS];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface FoodRow {
  id: string;
  name: string;
  wasteFactor: Prisma.Decimal | null;
}

export interface WasteFactorSeedResult {
  total: number;
  updated: number;
  skipped: number;
  unmatched: number;
  innUpdated: number;
  verifiedUpdated: number;
}

export async function SeedWasteFactors(
  prisma: PrismaClient,
  logger: SeedLogger = console,
): Promise<WasteFactorSeedResult> {
  logger.log("Sembrando wasteFactor (mermas) sobre FoodItems existentes...");
  logger.log(
    "  DISCLAIMER: valores orientativos a validar contra la Tabla de Factores de Desecho oficial del INN (2001).",
  );

  const foodItems = await prisma.foodItem.findMany({
    select: { id: true, name: true, wasteFactor: true },
  });

  const normFoodItems = foodItems.map((f) => ({ ...f, norm: normalize(f.name) }));

  const resolveFoodItem = (entry: WasteFactorSeed): FoodRow | undefined => {
    const target = entry.matchName ?? entry.name;
    const nt = normalize(target);

    const exact = normFoodItems.filter((f) => f.norm === nt);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) return undefined;

    const contains = normFoodItems.filter((f) => f.norm.includes(nt));
    if (contains.length === 1) return contains[0];
    if (contains.length > 1) return undefined;

    const reverse = normFoodItems.filter((f) => nt.includes(f.norm));
    if (reverse.length === 1) return reverse[0];
    return undefined;
  };

  const matched: Array<{ entry: WasteFactorSeed; food: FoodRow }> = [];
  const skipped: Array<{ entry: WasteFactorSeed; food: FoodRow }> = [];
  const unmatched: Array<{ entry: WasteFactorSeed; reason: string }> = [];

  for (const entry of SEED_FACTORS) {
    const food = resolveFoodItem(entry);
    if (!food) {
      unmatched.push({
        entry,
        reason: "sin FoodItem equivalente en DB",
      });
      continue;
    }

    // Idempotente: solo actualiza si el valor actual difiere del seed.
    const current = food.wasteFactor?.toNumber() ?? null;
    if (current === entry.wasteFactor) {
      skipped.push({ entry, food });
      continue;
    }

    await prisma.foodItem.update({
      where: { id: food.id },
      data: { wasteFactor: entry.wasteFactor },
    });
    matched.push({ entry, food });
  }

  // ── Tabla resumen ───────────────────────────────────────────────────────────
  logger.log("\n📊  RESUMEN DE MATCHES:");
  logger.log("   Fuente      |  Nombre seed                | FoodItem (DB)             | Factor | Verificado");
  logger.log("   ------------+----------------------------+---------------------------+--------+-----------");
  for (const { entry, food } of matched) {
    const source = entry.source === "INN" ? "INN" : "ORIENTATIVA";
    const verified = entry.verified ? "SÍ" : "no";
    const prev = food.name;
    logger.log(
      `   ${source.padEnd(11)} | ${entry.name.padEnd(28)} | ${prev.padEnd(27)} | ${String(entry.wasteFactor.toFixed(2)).padStart(6)} | ${verified}`,
    );
  }

  if (skipped.length > 0) {
    logger.log(
      `\n✅  YA TENÍAN EL FACTOR (skipped): ${skipped.length} (${skipped.map((s) => s.entry.name).join(", ")})`,
    );
  }

  logger.log("\n⚠️  ÍTEMS SIN MATCH (no actualizados):");
  if (unmatched.length === 0) {
    logger.log("   (ninguno)");
  } else {
    for (const u of unmatched) {
      logger.log(`   - ${u.entry.name} (${u.entry.source}): ${u.reason}`);
    }
  }

  const total = SEED_FACTORS.length;
  const innCount = matched.filter((m) => m.entry.source === "INN").length;
  const orientativaCount = matched.filter((m) => m.entry.source === "ORIENTATIVA").length;
  const verifiedCount = matched.filter((m) => m.entry.verified).length;

  logger.log(`\n✅  Resumen final:`);
  logger.log(`   Entradas en seed: ${total}`);
  logger.log(`   FoodItems actualizados: ${matched.length} (INN: ${innCount}, ORIENTATIVA: ${orientativaCount})`);
  logger.log(`   Con verified=true (exactos INN): ${verifiedCount}`);
  logger.log(`   Sin match: ${unmatched.length}`);
  logger.log(`   Ya correctos (skipped): ${skipped.length}`);
  logger.log("Seeding de wasteFactor completado exitosamente.");

  return {
    total,
    updated: matched.length,
    skipped: skipped.length,
    unmatched: unmatched.length,
    innUpdated: innCount,
    verifiedUpdated: verifiedCount,
  };
}

// ── CLI (solo cuando el archivo se ejecuta directamente) ─────────────────────
async function main() {
  const prisma = new PrismaClient();
  try {
    await SeedWasteFactors(prisma);
  } catch (e) {
    console.error("Error ejecutando el seed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}