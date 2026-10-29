/**
 * seed-lote1.ts — Script LIMPIO, standalone, SIN Antigravity
 *
 * Hace TODO en un solo comando:
 *   1. Crea/actualiza 54 alimentos + 387 condimentos
 *   2. Lee 728 menús desde JSON (con foods + condiments)
 *   3. Crea Menu + MenuItem + MenuCondiment
 *   4. Limpia y recrea menús previos (idempotente)
 *
 * Uso (desde serverapp/):
 *   npm run seed:lote1
 *
 * O via Docker:
 *   docker exec nutrigest_backend_prod sh -c 'DATA_PATH=/app/seed-data/all-menus-ready.json npm run seed:lote1'
 *
 * Limpia menús existentes y los recrea desde cero (idempotente).
 */

import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient, MenuCategory } from '@prisma/client';

const prisma = new PrismaClient();

// ─── TARGET ─────────────────────────────────────────────────────────────────
const TARGET_EMAIL = 'nutringest@gmail.com';

// ─── RUTA AL JSON (relativo a serverapp/) ───────────────────────────────────
// Si se corre desde serverapp/ → ../scripts/seed-data/all-menus-ready.json
// Si se corre via Docker, hay que pasar DATA_PATH como env var
const DATA_PATH =
  process.env.DATA_PATH ||
  path.join(__dirname, '..', '..', '..', '..', '..', 'scripts', 'seed-data', 'all-menus-ready.json');

// ─── RUTA AL JSON DE CONDIMENTOS ──────────────────────────────────────────
const CONDIMENTS_PATH =
  process.env.CONDIMENTS_PATH ||
  path.join(__dirname, '..', '..', '..', '..', '..', 'scripts', 'seed-data', 'condiments.json');

// ─── NUEVOS ALIMENTOS ──────────────────────────────────────────────────────
// 54 en total: 22 de Lote1 + 32 de Lotes 2-7 (consolidados)
const NEW_FOODS = [
  // ── LOTE 1 (originales) ──
  { name: 'Aceite',           calories: 900, proteins: 0,   carbohydrates: 0,   fats: 100 },
  { name: 'Acelga',           calories: 19,  proteins: 2,    carbohydrates: 5.8, fats: 0.2 },
  { name: 'Ajo',              calories: 129, proteins: 5.1,  carbohydrates: 27.8, fats: 0.2 },
  { name: 'Azúcar blanca',    calories: 398, proteins: 0,   carbohydrates: 99.5, fats: 0 },
  { name: 'Berenjena',        calories: 18,  proteins: 1,    carbohydrates: 5.5, fats: 0.3 },
  { name: 'Cebolla',          calories: 43,  proteins: 1.4,  carbohydrates: 11.1, fats: 0.2 },
  { name: 'Chayota',          calories: 25,  proteins: 0.7,  carbohydrates: 6.7, fats: 0.2 },
  { name: 'Chuleta de cerdo', calories: 250, proteins: 18.3, carbohydrates: 0,   fats: 19.6 },
  { name: 'Harina de trigo',  calories: 347, proteins: 13.5, carbohydrates: 73.3, fats: 1.2 },
  { name: 'Jugo de manzana',  calories: 55,  proteins: 0.1,  carbohydrates: 13.7, fats: 0 },
  { name: 'Lomo de cerdo',    calories: 192, proteins: 19.5, carbohydrates: 0,   fats: 12.7 },
  { name: 'Mayonesa',         calories: 748, proteins: 1.1,  carbohydrates: 6.2, fats: 80 },
  { name: 'Melón',            calories: 21,  proteins: 0.6,  carbohydrates: 4.6, fats: 0.2 },
  { name: 'Mostaza',          calories: 84,  proteins: 4.7,  carbohydrates: 6.4, fats: 4.4 },
  { name: 'Pan de centeno',   calories: 257, proteins: 9.6,  carbohydrates: 47.8, fats: 3.3 },
  { name: 'Pera',             calories: 63,  proteins: 0.7,  carbohydrates: 17.2, fats: 0.4 },
  { name: 'Perejil',          calories: 37,  proteins: 4,    carbohydrates: 9.4, fats: 0.8 },
  { name: 'Queso azul',       calories: 355, proteins: 20.4, carbohydrates: 0,   fats: 29.9 },
  { name: 'Queso cheddar',    calories: 403, proteins: 24.9, carbohydrates: 1.3, fats: 33.2 },
  { name: 'Queso de cabra',   calories: 364, proteins: 21.4, carbohydrates: 2,   fats: 30 },
  { name: 'Queso parmesano',  calories: 398, proteins: 35.8, carbohydrates: 3.4, fats: 27.1 },
  { name: 'Trucha',           calories: 103, proteins: 19.5, carbohydrates: 0,   fats: 2.7 },
  // ── LOTES 2-7 (nuevos de consolidación) ──
  { name: 'Aceituna verde',   calories: 174, proteins: 1.6,  carbohydrates: 1.7, fats: 18.5 },
  { name: 'Albaricoque',      calories: 50,  proteins: 1.0,  carbohydrates: 13.9, fats: 0.1 },
  { name: 'Anón',             calories: 100, proteins: 1.6,  carbohydrates: 24.6, fats: 0.2 },
  { name: 'Azúcar morena',    calories: 383, proteins: 0,    carbohydrates: 95.8, fats: 0 },
  { name: 'Berro',            calories: 18,  proteins: 2.2,  carbohydrates: 4.5, fats: 0.4 },
  { name: 'Ciruela pasa',     calories: 272, proteins: 2.3,  carbohydrates: 72.6, fats: 0.6 },
  { name: 'Escarola',         calories: 14,  proteins: 1.4,  carbohydrates: 4.5, fats: 0.2 },
  { name: 'Galletas de soda', calories: 415, proteins: 8.6,  carbohydrates: 72.4, fats: 10.2 },
  { name: 'Gelatina preparada', calories: 67, proteins: 1.6, carbohydrates: 15.2, fats: 0 },
  { name: 'Granada',          calories: 69,  proteins: 0.7,  carbohydrates: 17.9, fats: 0.5 },
  { name: 'Guayaba',          calories: 12,  proteins: 0.5,  carbohydrates: 3.3, fats: 0 },
  { name: 'Habas verdes',     calories: 111, proteins: 9.3,  carbohydrates: 24.7, fats: 0.5 },
  { name: 'Higo',             calories: 85,  proteins: 1.4,  carbohydrates: 21.3, fats: 0.4 },
  { name: 'Jamón de cerdo',   calories: 250, proteins: 18,   carbohydrates: 0,   fats: 19.6 },
  { name: 'Kiwi',             calories: 60,  proteins: 1.0,  carbohydrates: 14,   fats: 0.6 },
  { name: 'Leche descremada', calories: 36,  proteins: 3.5,  carbohydrates: 5.0, fats: 0.1 },
  { name: 'Mamey',            calories: 41,  proteins: 0.3,  carbohydrates: 9.9, fats: 0.6 },
  { name: 'Mandarina',        calories: 50,  proteins: 0.8,  carbohydrates: 11.9, fats: 0.3 },
  { name: 'Margarina',        calories: 733, proteins: 0.6,  carbohydrates: 0.4, fats: 81 },
  { name: 'Mermelada',        calories: 287, proteins: 0.5,  carbohydrates: 71.2, fats: 0.3 },
  { name: 'Nabo blanco',      calories: 25,  proteins: 1.1,  carbohydrates: 5.8, fats: 0.1 },
  { name: 'Patilla',          calories: 21,  proteins: 0.5,  carbohydrates: 5.1, fats: 0 },
  { name: 'Pistacho',         calories: 581, proteins: 17.6, carbohydrates: 22.2, fats: 51.6 },
  { name: 'Queso fresco',     calories: 313, proteins: 18.3, carbohydrates: 0.8, fats: 26.3 },
  { name: 'Rábano',           calories: 15,  proteins: 1.0,  carbohydrates: 4.1, fats: 0.1 },
  { name: 'Sardinas',         calories: 145, proteins: 20.6, carbohydrates: 0,   fats: 7.0 },
  { name: 'Tamarindo',        calories: 296, proteins: 2.4,  carbohydrates: 73.7, fats: 0.3 },
  { name: 'Ternera',          calories: 122, proteins: 19.3, carbohydrates: 0,   fats: 5.0 },
  { name: 'Tocino',           calories: 350, proteins: 12,   carbohydrates: 0,   fats: 34 },
  { name: 'Toronja',          calories: 38,  proteins: 0.6,  carbohydrates: 9.3, fats: 0.2 },
  { name: 'Tortilla de maíz', calories: 116, proteins: 2.7,  carbohydrates: 23.8, fats: 1.7 },
  { name: 'Uva',              calories: 68,  proteins: 0.7,  carbohydrates: 17.2, fats: 0.3 },
];

// ─── MAPEAR CATEGORÍA ───────────────────────────────────────────────────────
function mapCategory(cat: string): MenuCategory {
  switch (cat?.toLowerCase()) {
    case 'desayuno':   return MenuCategory.BREAKFAST;
    case 'almuerzo':   return MenuCategory.LUNCH;
    case 'cena':       return MenuCategory.DINNER;
    case 'snack':      return MenuCategory.SNACK;
    default:           return MenuCategory.OTHER;
  }
}

// ─── CALCULAR TOTALES NUTRICIONALES ────────────────────────────────────────
function calcTotals(foods: { name: string; quantity: number }[], foodMap: Map<string, any>) {
  let kcal = 0, protein = 0, carbs = 0, fats = 0;
  for (const f of foods) {
    const info = foodMap.get(f.name);
    if (info) {
      const ratio = (f.quantity || 100) / 100;
      kcal    += Number(info.calories) * ratio;
      protein += Number(info.proteins) * ratio;
      carbs   += Number(info.carbohydrates) * ratio;
      fats    += Number(info.fats) * ratio;
    }
  }
  return {
    kcal:    Math.round(kcal * 100) / 100,
    protein: Math.round(protein * 100) / 100,
    carbs:   Math.round(carbs * 100) / 100,
    fats:    Math.round(fats * 100) / 100,
  };
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  🌱 SEED LOTE 1 — NUEVO (standalone)');
  console.log('═══════════════════════════════════════════');

  // 1. Verificar que el JSON existe
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`No se encuentra ${DATA_PATH}. Ajustá DATA_PATH o corré convert-lote1-to-seed.js primero.`);
  }
  const menusData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  console.log(`  📄 JSON cargado: ${menusData.length} menús`);

  // 2. Buscar nutritionist
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) throw new Error(`Usuario ${TARGET_EMAIL} no encontrado`);

  const nutritionist = await prisma.nutritionist.findUnique({ where: { userId: user.id } });
  if (!nutritionist) throw new Error(`Nutricionista para ${user.id} no encontrado`);

  console.log(`  👤 Nutritionist: ${nutritionist.id} (${TARGET_EMAIL})`);

  // 3. Upsertear alimentos nuevos
  console.log(`\n  📦 Upserteando ${NEW_FOODS.length} alimentos nuevos...`);
  const foodMap = new Map<string, any>();

  // Primero cargar TODOS los alimentos existentes + los nuevos
  const allExisting = await prisma.foodItem.findMany({
    where: { isActive: true },
    select: { id: true, name: true, calories: true, proteins: true, carbohydrates: true, fats: true },
  });
  for (const f of allExisting) {
    foodMap.set(f.name, f);
  }

  // Upsertear los nuevos
  let upserted = 0;
  for (const food of NEW_FOODS) {
    const result = await prisma.foodItem.upsert({
      where: { name: food.name },
      update: {
        calories: food.calories,
        proteins: food.proteins,
        carbohydrates: food.carbohydrates,
        fats: food.fats,
        isActive: true,
      },
      create: {
        name: food.name,
        calories: food.calories,
        proteins: food.proteins,
        carbohydrates: food.carbohydrates,
        fats: food.fats,
        baseQuantity: 100,
        isActive: true,
      },
    });
    foodMap.set(result.name, result);
    upserted++;
  }
  console.log(`  ✅ ${upserted} alimentos upserteados (${NEW_FOODS.length} en NEW_FOODS + ${allExisting.length} existentes en mapa)`);

  // ─── 4. SEED CONDIMENTOS ──────────────────────────────────────────────
  console.log(`\n  🧂 Sembrando condimentos...`);
  if (!fs.existsSync(CONDIMENTS_PATH)) {
    console.warn(`  ⚠️  No se encuentra ${CONDIMENTS_PATH} — se saltea seed de condimentos`);
  } else {
    const condimentsData = JSON.parse(fs.readFileSync(CONDIMENTS_PATH, 'utf-8'));
    const condimentMap = new Map<string, any>();

    // Cargar existentes
    const existingCondiments = await prisma.condiment.findMany({ select: { id: true, name: true } });
    for (const c of existingCondiments) {
      condimentMap.set(c.name, c);
    }

    // Upsert
    let condUpserted = 0;
    for (const item of condimentsData) {
      const result = await prisma.condiment.upsert({
        where: { name: item.name },
        update: { isActive: true },
        create: { name: item.name },
      });
      condimentMap.set(result.name, result);
      condUpserted++;
    }
    console.log(`  ✅ ${condUpserted} condimentos upserteados (${condimentMap.size} en mapa)`);

    // ─── 5. LIMPIAR MENÚS ANTERIORES ────────────────────────────────────
    console.log(`\n  🧹 Limpiando menús anteriores...`);
    const deleted = await prisma.menu.deleteMany({
      where: { nutritionistId: nutritionist.id, isCommunity: true },
    });
    console.log(`     ${deleted.count} menús eliminados`);

    // ─── 6. CREAR MENÚS ─────────────────────────────────────────────────
    console.log(`\n  🍽️  Creando menús...`);
    let created = 0, errors = 0;

    for (const menuData of menusData) {
      try {
        // Armar foods con IDs reales
        const menuFoods: { name: string; quantity: number; unit?: string }[] = [];
        for (const f of menuData.foods || []) {
          const foodInfo = foodMap.get(f.name);
          if (!foodInfo) {
            console.warn(`  ⚠️  Alimento "${f.name}" no encontrado en DB — se saltea`);
            continue;
          }
          // Normalizar quantity
          let qty = f.quantity ?? 100;
          if (typeof qty === 'string') {
            const fracMap: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67 };
            for (const [sym, val] of Object.entries(fracMap)) qty = qty.replace(sym, String(val));
            const cleaned = qty.replace(/[^0-9.]/g, '').trim();
            qty = cleaned ? Number(cleaned) : 5;
          }
          menuFoods.push({ name: f.name, quantity: Number(qty), unit: f.unit || 'g' });
        }

        // Armar condimentos con IDs reales
        const menuCondiments: { condimentId: string }[] = [];
        for (const cName of menuData.condiments || []) {
          const condimentInfo = condimentMap.get(cName);
          if (condimentInfo) {
            // Evitar duplicados en el mismo menú
            if (!menuCondiments.find(mc => mc.condimentId === condimentInfo.id)) {
              menuCondiments.push({ condimentId: condimentInfo.id });
            }
          }
        }

        if (menuFoods.length === 0 && menuCondiments.length === 0) {
          console.warn(`  ⚠️  "${menuData.name}" no tiene foods ni condimentos — se saltea`);
          continue;
        }

        // Calcular totales (solo de foods)
        const totals = calcTotals(menuFoods, foodMap);

        // Crear Menu con MenuItems + MenuCondiments
        await prisma.menu.create({
          data: {
            nutritionistId: nutritionist.id,
            name: menuData.name,
            description: menuData.description || null,
            category: mapCategory(menuData.category),
            tags: (menuData.tags || []).join(','),
            imageUrl: menuData.imageFile || null,
            isCommunity: true,
            totalKcal: totals.kcal,
            totalProtein: totals.protein,
            totalCarbs: totals.carbs,
            totalFats: totals.fats,
            items: menuFoods.length > 0 ? {
              create: menuFoods.map(f => ({
                foodId: foodMap.get(f.name)!.id,
                quantity: f.quantity || 100,
                unit: f.unit || 'g',
              })),
            } : undefined,
            condiments: menuCondiments.length > 0 ? {
              create: menuCondiments.map(mc => ({
                condimentId: mc.condimentId,
                quantity: 5,
                unit: 'g',
              })),
            } : undefined,
          },
        });

        created++;
      } catch (e: any) {
        console.error(`  ❌ Error creando menú "${menuData.name}": ${e.message}`);
        errors++;
      }
    }

    // 7. Resumen final
    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ SEED LOTE 1 COMPLETADO');
    console.log('═══════════════════════════════════════════');
    console.log(`     Creados:   ${created}`);
    console.log(`     Errores:   ${errors}`);
    console.log(`     Total:     ${menusData.length}`);
    console.log('═══════════════════════════════════════════\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
