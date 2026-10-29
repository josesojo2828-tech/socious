#!/usr/bin/env node

/**
 * convert-lote1-to-seed.js
 * 
 * Convierte lote1-recipes.json al formato que espera seed-community.ts
 * Mapea nombres de DB a nombres amigables BASE_FOODS y agrega los faltantes.
 * 
 * Uso: node scripts/convert-lote1-to-seed.js
 * 
 * Output:
 *   - scripts/seed-data/lote1-menus-ready.json (menús en formato seed)
 *   - Muestra en consola los nuevos BASE_FOODS a agregar
 */

import { readFileSync, writeFileSync } from "node:fs";

// ─── Cargar datos ───────────────────────────────────────────────────────────
const recipes = JSON.parse(readFileSync("scripts/seed-data/lote1-recipes.json", "utf-8"));

// ─── BASE_FOODS actual (del seed-community.ts) ──────────────────────────────
const BASE_FOODS_NAMES = new Set([
  "Pollo pechuga", "Arroz blanco", "Arroz integral", "Brócoli", "Huevo entero",
  "Papa", "Papas baby", "Atún en agua", "Salmón", "Salmón ahumado", "Camarones",
  "Carne de res magra", "Pechuga de pavo", "Pavo molido", "Pescado blanco",
  "Pan integral", "Bagel", "Avena", "Quinoa cocida", "Trigo sarraceno",
  "Pasta cocida", "Fideos", "Camote / Batata", "Lentejas cocidas", "Garbanzos",
  "Frijoles negros", "Maíz dulce", "Yogur griego", "Yogur natural", "Queso Feta",
  "Queso Mozzarella", "Queso cottage", "Queso crema", "Aguacate",
  "Mantequilla de maní", "Hummus", "Pesto", "Aceite de oliva", "Semillas de chía",
  "Nueces", "Almendras", "Frutos secos", "Granola", "Harina de almendras",
  "Leche entera", "Miel", "Cacao en polvo", "Cacao amargo", "Plátano", "Banano",
  "Durazno", "Fresa", "Fresas", "Frutos rojos", "Frutas variadas", "Mango",
  "Piña", "Naranja", "Papaya", "Manzana", "Arándanos", "Lechuga", "Espinaca",
  "Tomate", "Tomate cherry", "Pepino", "Zanahoria", "Verduras mixtas",
  "Ensalada mixta", "Sopa de verduras", "Espárragos", "Zucchini / Calabacín",
  "Pimiento rojo", "Semillas de linaza", "Canela", "Champiñones", "Tofu",
  "Coliflor", "Remolacha / Betarraga", "Coco rallado", "Ejotes / Judías verdes",
  "Limón", "Apio", "Semillas de calabaza"
]);

// ─── NUEVOS alimentos para BASE_FOODS ───────────────────────────────────────
const NEW_BASE_FOODS = [
  // DB name → Friendly name, calories, proteins, carbs, fats (per 100g)
  { name: "Aceite",         display: "Aceite",         cal: 900,  pro: 0,   car: 0,   fat: 100 },
  { name: "Acelga",         display: "Acelga",         cal: 19,   pro: 2.0, car: 5.8, fat: 0.2 },
  { name: "Ajo",            display: "Ajo",            cal: 129,  pro: 5.1, car: 27.8, fat: 0.2 },
  { name: "Apio cocido",    display: "Apio",           cal: 94,   pro: 1.0, car: 24.3, fat: 0.1 },
  { name: "Azúcar blanca",  display: "Azúcar blanca",  cal: 398,  pro: 0,   car: 99.5, fat: 0 },
  { name: "Berenjena",      display: "Berenjena",      cal: 18,   pro: 1.0, car: 5.5,  fat: 0.3 },
  { name: "Cebolla",        display: "Cebolla",        cal: 43,   pro: 1.4, car: 11.1, fat: 0.2 },
  { name: "Chayota",        display: "Chayota",        cal: 25,   pro: 0.7, car: 6.7,  fat: 0.2 },
  { name: "Chuleta de Cerdo", display: "Chuleta de cerdo", cal: 250, pro: 18.3, car: 0, fat: 19.6 },
  { name: "Harina de trigo, variedad (HAD)", display: "Harina de trigo", cal: 347, pro: 13.5, car: 73.3, fat: 1.2 },
  { name: "Hojuelas de Avena", display: "Avena", cal: 389, pro: 16.9, car: 66, fat: 6.9 }, // ya existe, mapear
  { name: "Lomo de cerdo",  display: "Lomo de cerdo",  cal: 192,  pro: 19.5, car: 0,   fat: 12.7 },
  { name: "Manzana, jugo fresco", display: "Jugo de manzana", cal: 55, pro: 0.1, car: 13.7, fat: 0 },
  { name: "Mayonesa comercial", display: "Mayonesa",   cal: 748,  pro: 1.1, car: 6.2, fat: 80 },
  { name: "Melón",           display: "Melón",           cal: 21,   pro: 0.6, car: 4.6,  fat: 0.2 },
  { name: "Mostaza",         display: "Mostaza",         cal: 84,   pro: 4.7, car: 6.4,  fat: 4.4 },
  { name: "Pan de centeno",  display: "Pan de centeno",  cal: 257,  pro: 9.6, car: 47.8, fat: 3.3 },
  { name: "Pera",            display: "Pera",            cal: 63,   pro: 0.7, car: 17.2, fat: 0.4 },
  { name: "Perejil",         display: "Perejil",         cal: 37,   pro: 4.0, car: 9.4,  fat: 0.8 },
  { name: "Queso Cheddar",   display: "Queso cheddar",   cal: 403,  pro: 24.9, car: 1.3, fat: 33.2 },
  { name: "Queso azúl danés", display: "Queso azul",     cal: 355,  pro: 20.4, car: 0,   fat: 29.9 },
  { name: "Queso de cabra",  display: "Queso de cabra",   cal: 364,  pro: 21.4, car: 2.0, fat: 30.0 },
  { name: "Queso parmesano", display: "Queso parmesano",  cal: 398,  pro: 35.8, car: 3.4, fat: 27.1 },
  { name: "Trucha de mar",   display: "Trucha",          cal: 103,  pro: 19.5, car: 0,   fat: 2.7 },
];

// Construir mapa: DB name → display name
const DB_TO_DISPLAY = {};
const DISPLAY_TO_NUTRITION = {};
for (const item of NEW_BASE_FOODS) {
  DB_TO_DISPLAY[item.name] = item.display;
  DISPLAY_TO_NUTRITION[item.display] = { calories: item.cal, proteins: item.pro, carbohydrates: item.car, fats: item.fat };
}

// También algunos mapeos directos DB→BASE_FOODS (cuando el nombre DB no es el que usamos)
const EXTRA_MAP = {
  "Aceite": "Aceite",
  "Apio cocido": "Apio",
  "Hojuelas de Avena": "Avena",
  "Manzana, jugo fresco": "Jugo de manzana",
  "Mayonesa comercial": "Mayonesa",
  "Queso Cheddar": "Queso cheddar",
  "Queso azúl danés": "Queso azul",
  "Queso de cabra": "Queso de cabra",
  "Queso parmesano": "Queso parmesano",
  "Trucha de mar": "Trucha",
  "Harina de trigo, variedad (HAD)": "Harina de trigo",
  "Chuleta de Cerdo": "Chuleta de cerdo",
  "Pan de centeno": "Pan de centeno",
  "Lomo de cerdo": "Lomo de cerdo",
};

// ─── Convertir recetas ─────────────────────────────────────────────────────
const converted = [];
let statsTotalFoods = 0;
let statsMapped = 0;
let statsKept = 0;
let statsSkipped = 0;
let statsSkippedUnmatched = 0;

for (const recipe of recipes) {
  const newFoods = [];

  for (const food of (recipe.foods || [])) {
    statsTotalFoods++;
    const originalName = food.name;

    // Saltar ingredientes sin match (especias, hielo, etc.)
    if (!food._matchSource) {
      statsSkippedUnmatched++;
      continue;
    }

    let targetName = originalName;

    // Si el nombre está en DB_TO_DISPLAY, mapearlo
    if (DB_TO_DISPLAY[originalName]) {
      targetName = DB_TO_DISPLAY[originalName];
    }

    // Si el nombre ya está en BASE_FOODS, mantenerlo
    if (BASE_FOODS_NAMES.has(targetName)) {
      statsKept++;
    } else {
      statsMapped++;
    }

    newFoods.push({
      name: targetName,
      quantity: food.quantity,
      unit: food.unit || "g"
    });
  }

  if (newFoods.length > 0) {
    converted.push({
      imageFile: `${recipe.name?.toLowerCase().replace(/\s+/g, "-") || "recipe"}.jpg`,
      name: recipe.name,
      category: recipe.category?.split("|")[0]?.trim() || "snack",
      description: recipe.description || `Receta de ${recipe.category || "cocina"}.`,
      tags: recipe.tags || [],
      foods: newFoods
    });
  }
}

// ─── Output ─────────────────────────────────────────────────────────────────
console.log("═════════════════════════════════════════════════");
console.log("  📊 CONVERSIÓN COMPLETADA");
console.log("═════════════════════════════════════════════════");
console.log(`  Recetas originales: ${recipes.length}`);
console.log(`  Recetas convertidas: ${converted.length}`);
console.log(`  Ingredientes totales: ${statsTotalFoods}`);
console.log(`  ✅ Mantenidos (en BASE_FOODS): ${statsKept}`);
console.log(`  🔄 Mapeados a nombre amigable: ${statsMapped}`);
console.log(`  ❌ Saltados (sin match): ${statsSkippedUnmatched}`);
console.log("");

// Guardar JSON preparado para seed
writeFileSync("scripts/seed-data/lote1-menus-ready.json", JSON.stringify(converted, null, 2));
console.log("  💾 Guardado: scripts/seed-data/lote1-menus-ready.json");
console.log(`\n  Contiene ${converted.length} menús listos para seed.`);

// Mostrar nuevos BASE_FOODS a agregar
console.log("\n═════════════════════════════════════════════════");
console.log("  📝 NUEVOS BASE_FOODS (agregar a seed-community.ts)");
console.log("═════════════════════════════════════════════════\n");

const newEntries = NEW_BASE_FOODS.filter(item => !BASE_FOODS_NAMES.has(item.display));
for (const item of newEntries) {
  const existing = BASE_FOODS_NAMES.has(item.display);
  console.log(`  { name: '${item.display}', calories: ${item.cal}, proteins: ${item.pro}, carbohydrates: ${item.car}, fats: ${item.fat}, baseQuantity: 100 },`);
}
