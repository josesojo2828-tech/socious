/**
 * seed.food.runner.ts
 *
 * Punto de entrada CLI para ejecutar el seed de alimentos.
 *
 * Uso desde terminal:
 *   npx ts-node src/shared/fixtures/nutrition/seed.food.runner.ts
 *
 * O desde otro script/seeder central:
 *   import { SeedFood } from './seed.food';
 *   await SeedFood();
 */

import { SeedFood } from "./seed.food";

async function main() {
  try {
    await SeedFood();
  } catch (e) {
    console.error("Error en el seeder:", e);
    process.exit(1);
  }
}

main();
