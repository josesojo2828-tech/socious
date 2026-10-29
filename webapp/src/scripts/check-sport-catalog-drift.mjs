#!/usr/bin/env node
/**
 * check-sport-catalog-drift.mjs
 *
 * Verifica que el catálogo embebido en el webapp
 * (features/calculadora/lib/sport-disciplines.ts) no difiera del seed
 * de serverapp (seed.sport-disciplines.ts) en name/code/metValue.
 *
 * Uso: npm run check:sports  (desde webapp/)
 * Exit code: 0 sin drift, 1 con drift.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEED_PATH = path.resolve(
  __dirname,
  "../../../serverapp/src/shared/fixtures/nutrition/seed.sport-disciplines.ts",
);
const CATALOG_PATH = path.resolve(
  __dirname,
  "../features/calculadora/lib/sport-disciplines.ts",
);

const SEED_BLOCK_RE =
  /\{\s*name: "([^"]+)",\s*code: "([^"]+)",\s*metValue: ([\d.]+),\s*category: "([^"]+)",\s*description: "([^"]*)",?\s*\}/g;

const CATALOG_BLOCK_RE =
  /\{ name: "([^"]+)", code: "([^"]+)", metValue: ([\d.]+), category: "([^"]+)", description: "([^"]*)" \}/g;

function parseDisciplines(src, re) {
  const map = new Map();
  let m;
  while ((m = re.exec(src)) !== null) {
    const entry = {
      name: m[1],
      code: m[2],
      metValue: parseFloat(m[3]),
      category: m[4],
      description: m[5],
    };
    map.set(entry.code, entry);
  }
  return map;
}

const seed = parseDisciplines(readFileSync(SEED_PATH, "utf8"), SEED_BLOCK_RE);
const catalog = parseDisciplines(readFileSync(CATALOG_PATH, "utf8"), CATALOG_BLOCK_RE);

const issues = [];

for (const [code, s] of seed) {
  const c = catalog.get(code);
  if (!c) {
    issues.push(`FALTA en catálogo embebido: ${code} ("${s.name}")`);
    continue;
  }
  if (c.name !== s.name) {
    issues.push(`name difiere para ${code}: seed="${s.name}" vs catálogo="${c.name}"`);
  }
  if (c.metValue !== s.metValue) {
    issues.push(`metValue difiere para ${code}: seed=${s.metValue} vs catálogo=${c.metValue}`);
  }
}

for (const [code, c] of catalog) {
  if (!seed.has(code)) {
    issues.push(`EXTRA en catálogo embebido (no está en seed): ${code} ("${c.name}")`);
  }
}

if (issues.length > 0) {
  console.error(`❌ Drift detectado en catálogo deportivo (${issues.length} problema/s):`);
  for (const issue of issues) {
    console.error(`   - ${issue}`);
  }
  console.error(
    `\nCatálogo embebido: ${catalog.size} disciplinas | Seed: ${seed.size} disciplinas.`,
  );
  process.exit(1);
}

console.log(`✅ Sin drift en catálogo deportivo: ${catalog.size} disciplinas === seed (${seed.size}).`);
const categories = new Set([...seed.values()].map((d) => d.category));
console.log(`Categorías: ${categories.size} (${[...categories].sort().join(", ")}).`);
process.exit(0);