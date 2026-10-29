import * as path from 'path';
import fs from 'fs';

const dotenvPathServer = path.join(__dirname, '../.env');
const dotenvPathRoot = path.join(__dirname, '../../.env');

if (fs.existsSync(dotenvPathServer)) {
  require('dotenv').config({ path: dotenvPathServer });
}
if (fs.existsSync(dotenvPathRoot)) {
  require('dotenv').config({ path: dotenvPathRoot });
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Recalcula el costo de crecimiento pediátrico y el RCT almacenados en
 * PediatricHistory con el modelo FAO/WHO/UNU 2004 corregido.
 *
 * Antes de este fix:
 *   - growthCost se guardaba como un valor de kcal/g (5.6/4.4/4.5/4.7) o como
 *     NULL desde los 2 años, y se interpretaba como kcal/día.
 *   - activityFactor se guardaba con los factores adultos
 *     (1.2/1.375/1.55/1.725/1.9), que ya no corresponden a la escala pediátrica.
 *   - rct salía sin costo de crecimiento para pacientes de 2 años en adelante.
 *
 * Después de este fix:
 *   - activityFactor se traduce a las bandas pediátricas (1.2-1.3 / 1.4-1.5 /
 *     1.6-1.7 / 1.8-2.0). Solo se tocan los factores que no caen dentro de
 *     ninguna banda; un factor ya válido en la escala nueva se conserva.
 *   - growthCost es el costo de crecimiento en kcal/día = TMB × FA × %.
 *   - rct = TMB × FA × (1 + % crecimiento).
 *
 * La edad se deriva de Patient.birthDate respecto del instante en que se
 * registró la historia, que es lo más cercano a la edad a la medición.
 *
 * Uso:
 *   npm run backfill:pediatric-energy                 # dry-run (no escribe)
 *   npm run backfill:pediatric-energy -- --apply      # aplica los cambios
 */

/** Bandas pediátricas FAO/OMS/UNU 2004 (1.2-1.3 / 1.4-1.5 / 1.6-1.7 / 1.8-2.0). */
const PEDIATRIC_BANDS: Array<[number, number]> = [
  [1.2, 1.3],
  [1.4, 1.5],
  [1.6, 1.7],
  [1.8, 2.0],
];

/**
 * Factores adultos que NO caen dentro de ninguna banda pediátrica: son los que
 * solo existen en la escala de adultos y hay que traducir.
 *   1.2 y 1.9 sí caen dentro de una banda (1.2-1.3 y 1.8-2.0), por lo que se
 *   conservan tal cual: traducirlos rompería la idempotencia y el criterio
 *   clínico del nutricionista sigue siendo válido en la escala nueva.
 */
const LEGACY_OUTSIDE_BANDS_TO_PEDIATRIC_FA = new Map<number, number>([
  [1.375, 1.45],
  [1.55, 1.65],
  [1.725, 1.9],
]);

const isInsidePediatricBand = (factor: number): boolean =>
  PEDIATRIC_BANDS.some(([lo, hi]) => factor >= lo - 1e-9 && factor <= hi + 1e-9);

/** Normaliza un factor guardado a la escala pediátrica; los que ya valen, se quedan. */
const normalizeActivityFactor = (factor: number | null): number => {
  if (factor === null || !Number.isFinite(factor)) return 1.65;
  if (isInsidePediatricBand(factor)) return factor;
  return LEGACY_OUTSIDE_BANDS_TO_PEDIATRIC_FA.get(factor) ?? factor;
};

/** Días julianos promedio por año (365.25 días). */
const MILLISECONDS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Costo de crecimiento como porcentaje del gasto (FAO/WHO/UNU 2004). */
const getGrowthCostPercent = (ageYears: number): number => {
  if (!Number.isFinite(ageYears) || ageYears < 0 || ageYears >= 18) return 0;
  const months = ageYears * 12;
  if (months < 3) return 0.35;
  if (months < 6) return 0.07;
  if (months < 12) return 0.03;
  if (months < 24) return 0.02;
  if (ageYears < 10) return 0.02;
  return 0.04;
};

/** TMB por Schofield (1985), misma fórmula que usa la web. */
const calculateSchofieldTmb = (p: {
  gender: string;
  ageYears: number;
  weightKg: number;
}): number | null => {
  const { gender, ageYears, weightKg } = p;
  if (gender !== 'MALE' && gender !== 'FEMALE') return null;
  if (!Number.isFinite(ageYears) || ageYears < 0 || ageYears >= 18) return null;

  if (ageYears < 3) {
    return round2(gender === 'MALE' ? 59.5 * weightKg - 30 : 58.3 * weightKg - 31);
  }
  if (ageYears < 10) {
    return round2(gender === 'MALE' ? 22.7 * weightKg + 495 : 22.5 * weightKg + 499);
  }
  return round2(gender === 'MALE' ? 17.5 * weightKg + 651 : 12.2 * weightKg + 746);
};

interface RecalcRow {
  id: string;
  ageYears: number;
  gender: string;
  weightKg: number;
  previousActivityFactor: number | null;
  activityFactor: number;
  tmb: number;
  previousGrowthCost: number | null;
  growthCost: number;
  previousRct: number | null;
  rct: number;
}

const isSameNumber = (a: number | null, b: number | null): boolean => {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 0.005;
};

async function main() {
  const apply = process.argv.includes('--apply');
  const mode = apply ? 'APLICAR CAMBIOS' : 'DRY-RUN (sin escritura)';
  console.log(`🧮 Backfill de energía pediátrica — modo: ${mode}`);
  console.log('   growthCost pasa a kcal/día (TMB × FA × %) y rct a TMB × FA × (1 + %).');

  const rows = await prisma.pediatricHistory.findMany({
    where: { deletedAt: null },
    include: {
      patient: { select: { birthDate: true, gender: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`   Historias pediátricas activas: ${rows.length}`);

  const skipped: Array<{ id: string; reason: string }> = [];
  const changes: RecalcRow[] = [];

  for (const row of rows) {
    const gender = row.patient.gender;
    const birthDate = row.patient.birthDate;
    const weightKg = row.weightKg !== null ? Number(row.weightKg) : null;

    if (!birthDate) {
      skipped.push({ id: row.id, reason: 'paciente sin fecha de nacimiento' });
      continue;
    }
    if (weightKg === null || weightKg <= 0) {
      skipped.push({ id: row.id, reason: 'sin peso registrado' });
      continue;
    }

    const ageYears = (row.createdAt.getTime() - birthDate.getTime()) / MILLISECONDS_PER_YEAR;
    const tmb = calculateSchofieldTmb({ gender, ageYears, weightKg });
    if (tmb === null) {
      skipped.push({
        id: row.id,
        reason: `sin TMB (sexo ${gender}, edad ${ageYears.toFixed(1)} años)`,
      });
      continue;
    }

    const previousActivityFactor = row.activityFactor;
    const activityFactor = normalizeActivityFactor(previousActivityFactor);
    const mapped = previousActivityFactor !== null && activityFactor !== previousActivityFactor;

    const growthCostPercent = getGrowthCostPercent(ageYears);
    const growthCost = round2(tmb * activityFactor * growthCostPercent);
    const rct = round2(tmb * activityFactor * (1 + growthCostPercent));

    const changed =
      mapped ||
      !isSameNumber(row.growthCost, growthCost) ||
      !isSameNumber(row.rct, rct) ||
      !isSameNumber(row.schofieldTmb, tmb);

    if (!changed) continue;

    changes.push({
      id: row.id,
      ageYears: round2(ageYears),
      gender,
      weightKg,
      previousActivityFactor,
      activityFactor,
      tmb,
      previousGrowthCost: row.growthCost,
      growthCost,
      previousRct: row.rct,
      rct,
    });
  }

  if (changes.length > 0) {
    console.log('\n  id                                     edad   sexo     kg    FA (antes->después)   growthCost   rct (antes -> después)');
    for (const c of changes) {
      console.log(
        `  ${c.id}   ${c.ageYears.toFixed(1).padStart(4)}  ${c.gender.padEnd(6)} ${c.weightKg.toFixed(1).padStart(6)}  ` +
          `${String(c.previousActivityFactor ?? 'null').padStart(5)} -> ${c.activityFactor.toFixed(2)}   ` +
          `${String(c.previousGrowthCost ?? 'null').padStart(7)} -> ${c.growthCost.toFixed(2)}   ` +
          `${String(c.previousRct ?? 'null').padStart(7)} -> ${c.rct.toFixed(2)}`,
      );
    }
  }

  if (skipped.length > 0) {
    console.log(`\n  ⚠️  Omitidas (${skipped.length}):`);
    for (const s of skipped) {
      console.log(`   - ${s.id}: ${s.reason}`);
    }
  }

  console.log(`\n  Resumen: ${changes.length} a corregir, ${skipped.length} omitidas, ${rows.length - changes.length - skipped.length} ya correctas.`);

  if (!apply) {
    console.log('\n  🔎 DRY-RUN: no se escribió nada. Ejecutá con --apply para aplicar.');
    return;
  }

  let applied = 0;
  for (const c of changes) {
    await prisma.pediatricHistory.update({
      where: { id: c.id },
      data: {
        activityFactor: c.activityFactor,
        growthCost: c.growthCost,
        schofieldTmb: c.tmb,
        rct: c.rct,
      },
    });
    applied += 1;
  }

  console.log(`\n  ✅ ${applied} historias pediátricas corregidas.`);
}

main()
  .catch((error) => {
    console.error('❌ Backfill falló:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
