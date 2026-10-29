#!/usr/bin/env node

/**
 * convert-all-to-seed.js — Convierte TODAS las recetas consolidadas a formato seed
 *
 * 1. Lee all-recipes-consolidated.json (729 recetas)
 * 2. Mapea nombres DB → nombres BASE_FOODS amigables
 * 3. Agrega nuevos alimentos a BASE_FOODS (con datos nutricionales reales)
 * 4. Genera JSON listo para seed-community.ts
 * 
 * Uso: node scripts/convert-all-to-seed.js
 */

import { readFileSync, writeFileSync } from "node:fs";

// ─── Cargar datos ───────────────────────────────────────────────────────────
const recipes = JSON.parse(readFileSync("scripts/seed-data/all-recipes-consolidated.json", "utf-8"));

// ─── BASE_FOODS actual (del seed-community.ts, 106 items) ──────────────────
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
  "Limón", "Apio", "Semillas de calabaza",
  // Agregados en Lote 1:
  "Aceite", "Acelga", "Ajo", "Azúcar blanca", "Berenjena", "Cebolla", "Chayota",
  "Chuleta de cerdo", "Harina de trigo", "Jugo de manzana", "Lomo de cerdo",
  "Mayonesa", "Melón", "Mostaza", "Pan de centeno", "Pera", "Perejil",
  "Queso azul", "Queso cheddar", "Queso de cabra", "Queso parmesano", "Trucha",
]);

// ─── MAPEO 1: DB names → BASE_FOODS names ─────────────────────────────────
// Nombres que el LLM/DB devuelve, mapeados a nombres amigables
const DB_TO_FRIENDLY = {
  "Aceituna verde": "Aceituna verde",
  "Albaricoque": "Albaricoque",
  "Anón": "Anón",
  "Apio cocido": "Apio",
  "Azúcar morena": "Azúcar morena",
  "Berro": "Berro",
  "Carne de cerdo, jamonizada enlatada": "Jamón de cerdo",
  "Ciruela pasa": "Ciruela pasa",
  "Codorníz, Gallina, huevo de": "Huevo entero",
  "Dulce (tipo María) galletas": "Galletas de soda",
  "Escarola": "Escarola",
  "Frijol": "Frijoles negros",
  "Frijol cocido": "Frijoles negros",
  "Galletas de soda": "Galletas de soda",
  "Gelatina preparada": "Gelatina preparada",
  "Granada": "Granada",
  "Guayaba brasilera": "Guayaba",
  "Habas verdes": "Habas verdes",
  "Harina de trigo, variedad (HAD)": "Harina de trigo",
  "Higo": "Higo",
  "Hojuelas de Avena": "Avena",
  "Jamón cocido de cerdo, estándar": "Jamón de cerdo",
  "Jamón de espalda": "Jamón de cerdo",
  "Kiwi": "Kiwi",
  "Leche líquida descremada": "Leche descremada",
  "Lenguado (pescado)": "Pescado blanco",
  "Mamey": "Mamey",
  "Mandarina": "Mandarina",
  "Manzana, jugo fresco": "Jugo de manzana",
  "Margarina": "Margarina",
  "Mayonesa comercial": "Mayonesa",
  "Maíz A. enlatado, grano entero": "Maíz dulce",
  "Mermelada": "Mermelada",
  "Nabo blanco": "Nabo blanco",
  "Paleta de cerdo": "Chuleta de cerdo",
  "Pan de trigo integral": "Pan integral",
  "Patilla": "Patilla",
  "Pernil de cerdo": "Chuleta de cerdo",
  "Pistacho": "Pistacho",
  "Pollo, pechuga de, cocida": "Pollo pechuga",
  "Pulpa Negra (res)": "Carne de res magra",
  "Queso Cheddar": "Queso cheddar",
  "Queso azúl danés": "Queso azul",
  "Queso fresco": "Queso fresco",
  "Rábano": "Rábano",
  "Sardinas": "Sardinas",
  "Tamarindo": "Tamarindo",
  "Ternera, carne de": "Ternera",
  "Tocineta frita": "Tocino",
  "Tomate enlatado": "Tomate",
  "Toronja": "Toronja",
  "Trucha de mar": "Trucha",
  "Uva": "Uva",
};

// ─── MAPEO 2: UNMATCHED aliases → BASE_FOODS names ────────────────────────
// Ingredientes que food-matcher.js NO pudo matchear (sin _matchSource)
// pero que SÍ tienen equivalente en BASE_FOODS.
// Se usa como último recurso en el convert.
const UNMATCHED_ALIASES = {
  // Frutas
  "Sandía": "Patilla",
  "sandía": "Patilla",
  "Zumo de limón natural": "Limón",
  "Jugo de naranja natural": "Naranja",
  "Ciruela": "Ciruela pasa",
  "Higos secos": "Higo",
  "Higo seco": "Higo",
  "Uvas": "Uva",
  "Uva verde": "Uva",

  // Verduras
  "Betabel": "Remolacha / Betarraga",
  "Betabel cocido": "Remolacha / Betarraga",
  "Judía verde congelada doble cocción": "Ejotes / Judías verdes",
  "Judías verdes congeladas": "Ejotes / Judías verdes",
  "Ejotes congelados": "Ejotes / Judías verdes",
  "Espagueti": "Fideos",
  "Espagueti integral": "Pasta cocida",
  "Zanahoria congelada": "Zanahoria",
  "Brócoli congelado": "Brócoli",
  "Coliflor congelada": "Coliflor",
  "Ejotes": "Ejotes / Judías verdes",
  "Chícharo": "Ejotes / Judías verdes",

  // Carnes
  "Bistec de res": "Carne de res magra",
  "Carne molida de res": "Carne de res magra",
  "Pollo entero": "Pollo pechuga",
  "Pierna de pollo": "Pollo pechuga",
  "Muslo de pollo": "Pollo pechuga",
  "Alas de pollo": "Pollo pechuga",
  "Pechuga de pollo cocida": "Pollo pechuga",
  "Pollo rostizado": "Pollo pechuga",

  // Lácteos
  "Leche semidesnatada de vaca": "Leche descremada",
  "Leche semidescremada": "Leche descremada",
  "Crema light": "Queso crema",
  "Crema para batir": "Leche entera",
  "Crema ácida": "Queso crema",
  "Requesón": "Queso cottage",

  // Panes/Tortillas
  "Pan blanco sin sal": "Pan integral",
  "Pan de caja": "Pan integral",
  "Pan de caja integral": "Pan integral",
  "Pan tostado": "Pan integral",
  "Bolillo": "Pan integral",
  "Bolillo integral": "Pan integral",
  "Tortillas de maíz": "Tortilla de maíz",
  "Tortilla de maíz": "Tortilla de maíz",
  "Tortillas": "Tortilla de maíz",
  "Tostadas": "Tortilla de maíz",
  "Tostadas horneadas": "Tortilla de maíz",

  // Otros
  "Galletas marías": "Galletas de soda",
  "Aceitunas": "Aceituna verde",
  "Aceitunas negras": "Aceituna verde",
  "Mayonesa light": "Mayonesa",
  "Salsa de tomate": "Tomate",
  "Puré de tomate": "Tomate",
  "Salsa cátsup": "Tomate",
  "Catsup": "Tomate",
  "Ketchup": "Tomate",
  "Ajonjolí": "Semillas de calabaza",
  "Ajonjolí tostado": "Semillas de calabaza",

  // Quesos
  "Queso panela": "Queso fresco",
  "Queso panela rallado": "Queso fresco",
  "Queso Oaxaca": "Queso fresco",
  "Queso Manchego": "Queso parmesano",
  "Queso amarillo": "Queso cheddar",
};

// ─── NUEVOS ALIMENTOS a agregar a BASE_FOODS ──────────────────────────────
// Solo los que NO están ya en BASE_FOODS (con datos de seed.food.ts)
const NEW_FOODS = [
  { name: "Aceituna verde",    cal: 174, pro: 1.6, car: 1.7, fat: 18.5 },
  { name: "Albaricoque",       cal: 50,  pro: 1.0, car: 13.9, fat: 0.1 },
  { name: "Anón",              cal: 100, pro: 1.6, car: 24.6, fat: 0.2 },
  { name: "Azúcar morena",     cal: 383, pro: 0,   car: 95.8, fat: 0 },
  { name: "Berro",             cal: 18,  pro: 2.2, car: 4.5, fat: 0.4 },
  { name: "Ciruela pasa",      cal: 272, pro: 2.3, car: 72.6, fat: 0.6 },
  { name: "Escarola",          cal: 14,  pro: 1.4, car: 4.5, fat: 0.2 },
  { name: "Galletas de soda",  cal: 415, pro: 8.6, car: 72.4, fat: 10.2 },
  { name: "Gelatina preparada", cal: 67, pro: 1.6, car: 15.2, fat: 0 },
  { name: "Granada",           cal: 69,  pro: 0.7, car: 17.9, fat: 0.5 },
  { name: "Guayaba",           cal: 12,  pro: 0.5, car: 3.3, fat: 0 },
  { name: "Habas verdes",      cal: 111, pro: 9.3, car: 24.7, fat: 0.5 },
  { name: "Higo",              cal: 85,  pro: 1.4, car: 21.3, fat: 0.4 },
  { name: "Jamón de cerdo",    cal: 250, pro: 18,  car: 0,    fat: 19.6 },
  { name: "Kiwi",              cal: 60,  pro: 1.0, car: 14,   fat: 0.6 },
  { name: "Leche descremada",  cal: 36,  pro: 3.5, car: 5.0, fat: 0.1 },
  { name: "Mamey",             cal: 41,  pro: 0.3, car: 9.9, fat: 0.6 },
  { name: "Mandarina",         cal: 50,  pro: 0.8, car: 11.9, fat: 0.3 },
  { name: "Margarina",         cal: 733, pro: 0.6, car: 0.4, fat: 81 },
  { name: "Mermelada",         cal: 287, pro: 0.5, car: 71.2, fat: 0.3 },
  { name: "Nabo blanco",       cal: 25,  pro: 1.1, car: 5.8, fat: 0.1 },
  { name: "Patilla",           cal: 21,  pro: 0.5, car: 5.1, fat: 0 },
  { name: "Pistacho",          cal: 581, pro: 17.6, car: 22.2, fat: 51.6 },
  { name: "Queso fresco",      cal: 313, pro: 18.3, car: 0.8, fat: 26.3 },
  { name: "Rábano",            cal: 15,  pro: 1.0, car: 4.1, fat: 0.1 },
  { name: "Sardinas",          cal: 145, pro: 20.6, car: 0,   fat: 7.0 },
  { name: "Tamarindo",         cal: 296, pro: 2.4, car: 73.7, fat: 0.3 },
  { name: "Ternera",           cal: 122, pro: 19.3, car: 0,   fat: 5.0 },
  { name: "Tocino",            cal: 350, pro: 12,   car: 0,   fat: 34 },
  { name: "Toronja",           cal: 38,  pro: 0.6, car: 9.3, fat: 0.2 },
  { name: "Tortilla de maíz",  cal: 116, pro: 2.7, car: 23.8, fat: 1.7 },
  { name: "Uva",               cal: 68,  pro: 0.7, car: 17.2, fat: 0.3 },
];

// Cache
const NEW_NAMES = new Set(NEW_FOODS.map(f => f.name));

// ─── MAPEAR CATEGORÍA ───────────────────────────────────────────────────────
function mapCategory(cat) {
  if (!cat) return "snack";
  const c = cat.toLowerCase().split("|")[0].trim();
  if (c.includes("desayuno") || c.includes("breakfast")) return "desayuno";
  if (c.includes("almuerzo") || c.includes("lunch")) return "almuerzo";
  if (c.includes("cena") || c.includes("dinner")) return "cena";
  if (c.includes("snack")) return "snack";
  return "snack";
}

// ─── BUILDER ────────────────────────────────────────────────────────────────
const converted = [];
let statsTotal = 0;
let statsKept = 0;
let statsMapped = 0;
let statsNew = 0;
let statsAlias = 0;
let statsSkipped = 0;
let statsDroppedRecipes = 0;

for (const recipe of recipes) {
  const newFoods = [];
  const condiments = [];

  for (const food of (recipe.foods || [])) {
    statsTotal++;
    let targetName = food.name;

    // ── 1. Mapeo DB_TO_FRIENDLY ──
    if (DB_TO_FRIENDLY[food.name]) {
      targetName = DB_TO_FRIENDLY[food.name];
    }
    // ── 2. Mapeo UNMATCHED_ALIASES (sin _matchSource) ──
    else if (!food._matchSource && UNMATCHED_ALIASES[food.name]) {
      targetName = UNMATCHED_ALIASES[food.name];
      statsAlias++;
    }
    // ── 3. Sin match → condimento ──
    else if (!food._matchSource) {
      condiments.push(food.name);
      statsSkipped++;
      continue;
    }

    // ── 4. Stat tracking ──
    if (BASE_FOODS_NAMES.has(targetName)) {
      statsKept++;
    } else if (NEW_NAMES.has(targetName)) {
      statsNew++;
    } else {
      statsMapped++;
    }

    newFoods.push({
      name: targetName,
      quantity: food.quantity || 100,
      unit: food.unit || "g",
    });
  }

  // Siempre incluir (incluso sin foods, si tiene condimentos)
  if (newFoods.length > 0 || condiments.length > 0) {
    const entry = {
      imageFile: `${recipe.source || "recipe"}/${recipe.name ? recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") : "recipe"}.jpg`,
      name: recipe.name,
      category: mapCategory(recipe.category),
      description: recipe.description || `Receta ${recipe.category || "de cocina"}.`,
      tags: recipe.tags || [],
      foods: newFoods,
    };
    if (condiments.length > 0) {
      entry.condiments = [...new Set(condiments)]; // deduplicar
    }
    converted.push(entry);
  } else {
    statsDroppedRecipes++;
  }
}

// ─── GUARDAR ────────────────────────────────────────────────────────────────
const outputPath = "scripts/seed-data/all-menus-ready.json";
writeFileSync(outputPath, JSON.stringify(converted, null, 2));

// ─── STATS ──────────────────────────────────────────────────────────────────
console.log("╔══════════════════════════════════════════════════════╗");
console.log("║     📊 CONVERSIÓN COMPLETA — TODAS LAS RECETAS      ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log("");
console.log(`  Recetas originales:     ${recipes.length}`);
console.log(`  Recetas convertidas:    ${converted.length}`);
console.log(`  Recetas descartadas:    ${statsDroppedRecipes} (sin ingredientes con match)`);
console.log(`  Ingredientes totales:   ${statsTotal}`);
console.log(`  ✅ BASE_FOODS existente: ${statsKept}`);
console.log(`  🔄 DB->friendly:         ${statsMapped}`);
console.log(`  🆕 Nuevos BASE_FOODS:    ${statsNew}`);
console.log(`  💡 Alias unmatched:      ${statsAlias}`);
console.log(`  ❌ Saltados (condimentos): ${statsSkipped}`);
console.log("");
console.log(`  💾 Guardado: ${outputPath}`);

// Tags & categories
const allTags = new Set();
for (const r of converted) {
  for (const t of (r.tags || [])) allTags.add(t);
}
console.log(`  🏷️  Tags únicos: ${allTags.size}`);

const cats = {};
for (const r of converted) {
  cats[r.category] = (cats[r.category] || 0) + 1;
}
console.log("  📂 Categorías:");
for (const [c, n] of Object.entries(cats)) {
  console.log(`     ${c}: ${n}`);
}

// ─── NUEVOS BASE_FOODS ────────────────────────────────────────────────────
const trulyNew = NEW_FOODS.filter(f => !BASE_FOODS_NAMES.has(f.name));

console.log("");
console.log("╔══════════════════════════════════════════════════════╗");
console.log("║  📝 NUEVOS BASE_FOODS (agregar a seed-lote1.ts)     ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log("");

for (const item of trulyNew) {
  const inUse = new Set();
  for (const r of converted) {
    for (const f of r.foods) {
      if (f.name === item.name) inUse.add(r.name);
    }
  }
  console.log(`  { name: '${item.name}', calories: ${item.cal}, proteins: ${item.pro}, carbohydrates: ${item.car}, fats: ${item.fat}, baseQuantity: 100 }, // usado en ${inUse.size} recetas`);
}
