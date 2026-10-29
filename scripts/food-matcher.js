#!/usr/bin/env node

/**
 * food-matcher.js — Fuzzy matchea ingredientes de recetas contra FoodItem DB
 * 
 * Estrategia:
 *   1. Matchea contra nombres REALES de FoodItem (622 registros)
 *   2. Si no hay match bueno (score < 0.55), cae en KNOWN_FOODS con aliases manuales
 *   3. Los aliases manuales capturan casos que el fuzzy matching no puede resolver
 * 
 * Uso: cat recetas.json | node scripts/food-matcher.js
 * 
 * Variables de entorno:
 *   FOOD_NAMES_PATH  — Ruta al JSON con nombres de FoodItem (default: scripts/seed-data/food-items-names.json)
 */

import { createInterface } from "node:readline";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Cargar nombres reales de FoodItem ──────────────────────────────────────
const FOOD_NAMES_PATH = process.env.FOOD_NAMES_PATH || join(__dirname, "seed-data/food-items-names.json");

let FOOD_DB_NAMES = [];
try {
  if (existsSync(FOOD_NAMES_PATH)) {
    FOOD_DB_NAMES = JSON.parse(readFileSync(FOOD_NAMES_PATH, "utf-8"));
    console.error(`📦 Cargados ${FOOD_DB_NAMES.length} nombres de FoodItem desde ${FOOD_NAMES_PATH}`);
  } else {
    console.error(`⚠️  No se encontró ${FOOD_NAMES_PATH}, usando solo KNOWN_FOODS`);
  }
} catch (e) {
  console.error(`⚠️  Error cargando FoodItem names: ${e.message}`);
}

// ─── LISTA DE ALIMENTOS CONOCIDOS (fallback con aliases manuales) ─────────
const KNOWN_FOODS = [
  { name: "Aceite de oliva", aliases: ["aceite oliva", "aceite de oliva extra virgen", "oliva"] },
  { name: "Aguacate", aliases: ["palta", "avocado", "aguacate hass"] },
  { name: "Almendras", aliases: ["almendra", "almendras enteras", "almendras fileteadas", "alimento a base de almendra", "almendra carnation"] },
  { name: "Apio", aliases: ["apio nabo", "celery"] },
  { name: "Arroz blanco", aliases: ["arroz", "arroz blanco cocido", "arroz simple"] },
  { name: "Arroz integral", aliases: ["arroz integral cocido", "arroz salvaje", "arroz moreno"] },
  { name: "Arándanos", aliases: ["arandano", "blueberry", "arandanos azules"] },
  { name: "Atún en agua", aliases: ["atun", "atun en lata", "atun al natural", "atun en agua"] },
  { name: "Avena", aliases: ["avena en hojuelas", "oatmeal", "avena molida", "alimento a base de avena", "avena carnation"] },
  { name: "Bagel", aliases: ["bagel integral", "bagel de trigo"] },
  { name: "Plátano", aliases: ["platano", "banana", "banano", "cambur", "guineo", "platanos", "platanos congelados"] },
  { name: "Brócoli", aliases: ["brocoli", "brocolí", "brócoli arbolitos"] },
  { name: "Cacao en polvo", aliases: ["cacao", "cocoa", "chocolate en polvo", "cacao amargo", "chispas de chocolate", "chispas de chocolate amargo", "chocolate amargo"] },
  { name: "Camarones", aliases: ["camaron", "shrimp", "gambas", "langostinos"] },
  { name: "Camote / Batata", aliases: ["camote", "batata", "boniato", "sweet potato", "papa dulce"] },
  { name: "Canela", aliases: ["canela en polvo", "cinnamon", "cáscara de canela"] },
  { name: "Carne de res magra", aliases: ["carne de res", "res", "beef", "carne molida", "lomo", "solomo", "bistec de res", "carne molida de res"] },
  { name: "Champiñones", aliases: ["champinones", "hongos", "setas", "mushrooms", "portobello"] },
  { name: "Coco rallado", aliases: ["coco", "coconut", "coco tostado", "coco deshidratado", "alimento a base de coco", "coco carnation"] },
  { name: "Coliflor", aliases: ["cauliflower", "coliflor arbolitos"] },
  { name: "Durazno", aliases: ["durazno fresco", "melocoton", "peach"] },
  { name: "Ejotes / Judías verdes", aliases: ["ejotes", "judias verdes", "green beans", "habichuelas", "vainicas", "judía verde congelada doble cocción", "judías verdes congeladas", "chícharo", "ejotes congelados"] },
  { name: "Ensalada mixta", aliases: ["ensalada", "mixed greens", "lechuga mixta", "campo verde"] },
  { name: "Espinaca", aliases: ["espinaca fresca", "espinacas", "spinach", "baby spinach"] },
  { name: "Espárragos", aliases: ["esparragos", "asparagus", "esparragos verdes"] },
  { name: "Fideos", aliases: ["fideo", "noodles", "tallarines", "spaghetti", "pasta fina", "espagueti", "espagueti integral"] },
  { name: "Fresas", aliases: ["fresa", "strawberry", "fresas congeladas", "fresa congelada", "fresas frescas"] },
  { name: "Frijoles negros", aliases: ["frijol negro", "black beans", "frijoles", "porotos negros"] },
  { name: "Frutas variadas", aliases: ["fruta variada", "mixed fruit", "frutas mixtas", "frutas del bosque"] },
  { name: "Frutos rojos", aliases: ["frutos rojos congelados", "berries", "bayas", "frambuesas", "frambuesa", "frambuesas congeladas", "zarzamoras", "zarzamora", "zarzamoras congeladas", "moras"] },
  { name: "Garbanzos", aliases: ["garbanzo", "chickpeas", "garbanzos cocidos"] },
  { name: "Granola", aliases: ["granola clasica", "granola de avena"] },
  { name: "Harina de almendras", aliases: ["harina de almendra", "almond flour", "almendra molida"] },
  { name: "Huevo entero", aliases: ["huevo", "eggs", "huevos", "huevo fresco", "clara de huevo", "huevo entero fresco"] },
  { name: "Hummus", aliases: ["hummus clasico", "humus"] },
  { name: "Leche entera", aliases: ["leche", "whole milk", "leche de vaca", "leche fluida", "leche evaporada", "carnation", "leche semidesnatada de vaca", "leche semidescremada"] },
  { name: "Lechuga", aliases: ["lechuga romana", "lechuga crespa", "lettuce", "lechuga iceberg"] },
  { name: "Lentejas cocidas", aliases: ["lentejas", "lentils", "lentejas enlatadas"] },
  { name: "Limón", aliases: ["limon", "lemon", "jugo de limon", "jugo de limón", "limon amarillo", "lima", "zumo de limon natural"] },
  { name: "Mango", aliases: ["mango fresco", "mango congelado", "mango maduro"] },
  { name: "Mantequilla de maní", aliases: ["mantequilla de mani", "peanut butter", "maní", "cacahuate", "crema de cacahuate"] },
  { name: "Manzana", aliases: ["manzana roja", "manzana verde", "apple", "puré de manzana", "manzana asada"] },
  { name: "Maíz dulce", aliases: ["maiz dulce", "corn", "elote", "choclo", "maiz desgranado"] },
  { name: "Miel", aliases: ["miel de abeja", "honey", "miel de agave", "miel de maple"] },
  { name: "Naranja", aliases: ["naranja dulce", "orange", "jugo de naranja"] },
  { name: "Nueces", aliases: ["nuez", "walnuts", "pecanas", "pecan", "nuez de castilla"] },
  { name: "Pan integral", aliases: ["pan", "whole wheat bread", "pan de trigo", "pan tostado", "rebanada de pan", "pan de molde"] },
  { name: "Papa", aliases: ["patata", "potato", "papas", "papa cocida"] },
  { name: "Papas baby", aliases: ["papa baby", "papas pequeñas", "baby potatoes"] },
  { name: "Papaya", aliases: ["papaya fresca", "lechosa", "fruta bomba"] },
  { name: "Pasta cocida", aliases: ["pasta", "pasta integral cocida", "macarrones", "penne"] },
  { name: "Pavo molido", aliases: ["pavo", "ground turkey", "carne de pavo"] },
  { name: "Pechuga de pavo", aliases: ["pechuga pavo", "turkey breast", "pavo rebanado"] },
  { name: "Pepino", aliases: ["pepino fresco", "cucumber", "pepinillo"] },
  { name: "Pescado blanco", aliases: ["pescado", "white fish", "merluza", "tilapia", "bacalao", "corvina", "huachinango"] },
  { name: "Pesto", aliases: ["pesto clasico", "pesto genovés"] },
  { name: "Pimiento rojo", aliases: ["pimiento", "red pepper", "bell pepper", "chile dulce", "paprika", "pimenton"] },
  { name: "Piña", aliases: ["pina", "pineapple", "piña congelada"] },
  { name: "Pollo pechuga", aliases: ["pollo", "chicken breast", "pechuga de pollo", "pollo pechuga sin piel", "pollo a la plancha", "pollo desmenuzado"] },
  { name: "Queso Feta", aliases: ["feta", "queso feta clasico"] },
  { name: "Queso Mozzarella", aliases: ["mozzarella", "queso mozzarella fresco"] },
  { name: "Queso cottage", aliases: ["cottage", "queso cottage clasico", "requeson"] },
  { name: "Queso crema", aliases: ["cream cheese", "queso crema clasico"] },
  { name: "Queso fresco", aliases: ["queso fresco natural", "queso blanco", "cuajada"] },
  { name: "Quinoa cocida", aliases: ["quinoa", "quinua", "quinoa cocinada"] },
  { name: "Remolacha / Betarraga", aliases: ["remolacha", "betarraga", "beet", "beetroot", "remolacha cocida"] },
  { name: "Salmón", aliases: ["salmon", "salmon fresco", "filete de salmon", "salmón rosado"] },
  { name: "Salmón ahumado", aliases: ["salmon ahumado", "smoked salmon"] },
  { name: "Semillas de calabaza", aliases: ["pepitas", "pumpkin seeds", "semilla de calabaza"] },
  { name: "Semillas de chía", aliases: ["chia", "chia seeds", "semillas de chia"] },
  { name: "Semillas de linaza", aliases: ["linaza", "flaxseed", "flax seeds", "linaza molida"] },
  { name: "Sopa de verduras", aliases: ["sopa", "caldo de verduras", "crema de verduras", "sopa de vegetales"] },
  { name: "Tofu", aliases: ["tofu firme", "tofu suave", "tofu sedoso"] },
  { name: "Tomate", aliases: ["tomate fresco", "tomate saladet", "tomate entero"] },
  { name: "Tomate cherry", aliases: ["tomate cherry", "cherry tomato", "tomates uva", "tomate mini"] },
  { name: "Trigo sarraceno", aliases: ["trigo sarraceno cocido", "buckwheat", "alforfon"] },
  { name: "Verduras mixtas", aliases: ["verduras", "vegetales mixtos", "mixed vegetables", "verduras salteadas"] },
  { name: "Yogur griego", aliases: ["yogurt griego", "greek yogurt", "yogur griego natural"] },
  { name: "Yogur natural", aliases: ["yogurt natural", "plain yogurt", "yogur entero"] },
  { name: "Zanahoria", aliases: ["zanahoria fresca", "carrot", "zanahoria rallada", "zanahoria baby"] },
  { name: "Zucchini / Calabacín", aliases: ["zucchini", "calabacin", "zapallo italiano", "calabacita", "courgette"] },
  // Agregados en seed communities
  { name: "Patilla", aliases: ["sandia", "watermelon"] },
  { name: "Tortilla de maíz", aliases: ["tortillas de maiz", "tortillas", "tostadas", "tostadas horneadas"] },
  { name: "Galletas de soda", aliases: ["galletas marias", "galletas maria"] },
  { name: "Aceituna verde", aliases: ["aceitunas", "aceitunas negras", "oliva verde"] },
  { name: "Jamón de cerdo", aliases: ["jamon cocido de cerdo", "jamon de espalda", "jamon serrano", "jamon cocido"] },
  { name: "Leche descremada", aliases: ["leche semidesnatada de vaca", "leche semidescremada"] },
  { name: "Mayonesa", aliases: ["mayonesa clasica", "mayonesa comercial", "mayonesa light"] },
  { name: "Aceite", aliases: ["aceite vegetal", "aceite de maiz", "aceite de canola", "aceite de ajonjolí"] },
  { name: "Azúcar blanca", aliases: ["azucar", "azúcar", "azucar blanca"] },
  { name: "Azúcar morena", aliases: ["azucar morena", "azúcar mascabada", "panela"] },
  { name: "Mostaza", aliases: ["mostaza clasica", "mostaza dijon"] },
  { name: "Harina de trigo", aliases: ["harina de trigo para todo uso", "harina de trigo de todo uso"] },
  { name: "Cebolla", aliases: ["cebolla blanca", "cebolla morada", "cebolla perla", "cebolla cabezona"] },
  { name: "Ajo", aliases: ["ajo triturado", "diente de ajo", "ajo molido"] },
  { name: "Perejil", aliases: ["perejil fresco", "perejil seco"] },
  { name: "Acelga", aliases: ["acelga fresca", "acelga suiza"] },
  { name: "Berenjena", aliases: ["berenjena fresca", "eggplant"] },
  { name: "Chayota", aliases: ["chayote", "chayote fresco"] },
  { name: "Chuleta de cerdo", aliases: ["chuleta de cerdo ahumada", "paleta de cerdo", "pernil de cerdo"] },
  { name: "Lomo de cerdo", aliases: ["lomo de cerdo fresco", "lomo cerdo"] },
  { name: "Pan de centeno", aliases: ["pan de centeno integral", "rye bread"] },
  { name: "Pera", aliases: ["pera fresca", "pera congelada"] },
  { name: "Queso cheddar", aliases: ["cheddar", "queso amarillo"] },
  { name: "Queso parmesano", aliases: ["parmesano", "queso manchego"] },
  { name: "Queso fresco", aliases: ["queso fresco natural", "queso blanco", "cuajada", "queso panela", "queso panela rallado", "queso oaxaca"] },
  { name: "Queso cottage", aliases: ["cottage", "queso cottage clasico", "requeson", "requesón"] },
  { name: "Queso crema", aliases: ["cream cheese", "queso crema clasico", "crema light", "crema ácida", "crema para batir"] },
  { name: "Jugo de manzana", aliases: ["jugo de manzana natural", "manzana jugo fresco"] },
  { name: "Melón", aliases: ["melon fresco", "canteloupe"] },
  { name: "Trucha", aliases: ["trucha de mar", "trucha arcoíris"] },
  { name: "Tocino", aliases: ["tocineta frita", "tocineta", "bacon"] },
  { name: "Kiwi", aliases: ["kiwi fresco"] },
  { name: "Mandarina", aliases: ["mandarina fresca", "tangerine"] },
  { name: "Uva", aliases: ["uva verde", "uvas", "grapes"] },
  { name: "Toronja", aliases: ["toronja fresca", "grapefruit"] },
  { name: "Sardinas", aliases: ["sardinas enlatadas", "sardinas en agua"] },
  { name: "Ternera", aliases: ["ternera de res", "carne de ternera"] },
  { name: "Mermelada", aliases: ["mermelada de fresa", "mermelada de frutas"] },
  { name: "Margarina", aliases: ["margarina vegetal", "mantequilla vegetal"] },
  { name: "Pistacho", aliases: ["pistachos", "pistache"] },
  { name: "Granada", aliases: ["granada fresca"] },
  { name: "Higo", aliases: ["higos secos", "higo seco", "fig"] },
  { name: "Ciruela pasa", aliases: ["ciruela", "ciruelas pasas"] },
  { name: "Albaricoque", aliases: ["albaricoque fresco", "damasco", "chabacano"] },
  { name: "Berro", aliases: ["berro fresco", "watercress"] },
  { name: "Guayaba", aliases: ["guayaba brasilera", "guayaba fresca"] },
  { name: "Habas verdes", aliases: ["habas", "habas verdes frescas"] },
  { name: "Nabo blanco", aliases: ["nabo", "nabo blanco fresco", "turnip"] },
  { name: "Rábano", aliases: ["rabano", "rábano fresco"] },
  { name: "Escarola", aliases: ["escarola fresca"] },
  { name: "Mamey", aliases: ["mamey fresco", "mamey"] },
  { name: "Tamarindo", aliases: ["tamarindo fresco"] },
  { name: "Anón", aliases: ["anon", "anon fruta"] },
  { name: "Gelatina preparada", aliases: ["gelatina", "gelatina sin sabor"] },
  { name: "Queso azul", aliases: ["queso azul danes", "blue cheese"] },
  { name: "Queso de cabra", aliases: ["queso de cabra fresco", "goat cheese"] },
  { name: "Crema", aliases: ["crema espesa", "media crema"] },
  { name: "Pimiento rojo", aliases: ["pimiento", "red pepper", "bell pepper", "chile dulce", "paprika", "pimenton", "chile poblano", "chile serrano"] },
];

// ─── Pre-procesar marcas comerciales ─────────────────────────────────────────
const BRAND_PATTERNS = /\b(CARNATION|NESTLÉ|NESTLE|HERSHEY|QUAKER|Kellogg's|Kelloggs|MAGGI|NIDO)\b/gi;

// ─── Normalizar texto para comparación ──────────────────────────────────────
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Calcular similitud entre dos strings (coeficiente de bigramas) ─────────
function bigramSimilarity(a, b) {
  const normA = normalize(a);
  const normB = normalize(b);
  
  if (normA === normB) return 1.0;
  
  // Bigram overlap
  const bigramsA = new Set();
  const bigramsB = new Set();
  
  for (let i = 0; i < normA.length - 1; i++) bigramsA.add(normA.slice(i, i + 2));
  for (let i = 0; i < normB.length - 1; i++) bigramsB.add(normB.slice(i, i + 2));
  
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;
  
  let intersection = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) intersection++;
  }
  
  const union = bigramsA.size + bigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ─── Split tokens ────────────────────────────────────────────────
function tokenize(text) {
  return normalize(text).split(/\s+/).filter(t => t.length > 1);
}

// ─── Puntaje de inclusión: qué tanto un string contiene al otro ────────────
function inclusionScore(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  
  const longer = na.length >= nb.length ? na : nb;
  const shorter = na.length >= nb.length ? nb : na;
  
  // ⚠️ Strings muy cortos causan falsos positivos:
  //    "menta" (5) está dentro de "condimentada" → NO debe matchear
  //    "canela" (6) podría estar dentro de otra palabra → NO debe matchear
  // Solución: requerir que el corto sea al menos 30% del largo
  const ratio = shorter.length / longer.length;
  if (ratio < 0.3) return 0;
  
  // Si el corto está completamente contenido en el largo
  if (longer.includes(shorter)) {
    return 0.85 + ratio * 0.14;
  }
  
  return 0;
}

// ─── Token overlap score ────────────────────────────────────────────────────
function tokenOverlap(inputTokens, nameTokens) {
  if (inputTokens.length === 0) return 0;
  
  let matchCount = 0;
  for (const inputTok of inputTokens) {
    // Check if this token is part of any name token
    const matched = nameTokens.some(nt => 
      nt.includes(inputTok) || inputTok.includes(nt)
    );
    if (matched) matchCount++;
  }
  
  return matchCount / inputTokens.length;
}

// ─── Limpiar nombre de ingrediente ─────────────────────────────────────────
function cleanIngredientName(name) {
  return name.replace(BRAND_PATTERNS, "").replace(/,?\s*(carnation|nestlé)\s*,?/gi, "").trim();
}

// ─── Buscar match contra KNOWN_FOODS (FASE 1: aliases curados) ────────────
// Usa exact match + inclusion + bigram. Nada de token overlap (genera falsos).
function matchAgainstKnownFoods(input, cleaned) {
  let best = { name: null, score: 0, source: null };
  
  for (const food of KNOWN_FOODS) {
    const normName = normalize(food.name);
    
    // 1. Exact match contra nombre
    if (cleaned === normName) {
      return { name: food.name, score: 1.0, source: "known-exact" };
    }
    
    // 2. Exact match contra aliases (caso más común: "Miel de agave" → alias "miel de agave")
    for (const alias of food.aliases) {
      if (cleaned === normalize(alias)) {
        return { name: food.name, score: 1.0, source: "known-alias" };
      }
    }
    
    // 3. Inclusion: el input contiene el food.name o viceversa
    //    Ej: "Zarzamoras congeladas" contiene "Zarzamora" (alias de Frutos rojos)
    const inclScore = inclusionScore(cleaned, food.name);
    if (inclScore > best.score) {
      best = { name: food.name, score: inclScore, source: "known-inclusion" };
    }
    
    // 4. Alias inclusion
    for (const alias of food.aliases) {
      const aliasIncl = inclusionScore(cleaned, alias);
      if (aliasIncl > best.score) {
        best = { name: food.name, score: aliasIncl, source: "known-alias-incl" };
      }
    }
    
    // 5. Bigram contra nombre
    const biScore = bigramSimilarity(cleaned, food.name);
    if (biScore > best.score) {
      best = { name: food.name, score: biScore, source: "known-bigram" };
    }
  }
  
  // Umbral: solo exact/alias/inclusion (1.0) o bigram decente (>0.5)
  // No usamos threshold bajo porque bigram entre strings distintos genera falsos:
  //   ❌ "harina de trigo" → "harina de almendras" (0.41)
  //   ❌ "hielo" → "miel" (0.4)
  return best.score >= 0.5 ? best : null;
}

// ─── Buscar match contra FoodItem DB (FASE 2: nombres reales) ──────────────
// NO usa token overlap — solo exact + inclusion + bigram con threshold alto.
function matchAgainstFoodDB(input, cleaned) {
  let best = { name: null, score: 0, source: null };
  
  for (const dbName of FOOD_DB_NAMES) {
    const normDB = normalize(dbName);
    
    // 1. Exact match
    if (cleaned === normDB) {
      return { name: dbName, score: 1.0, source: "db-exact" };
    }
    
    // 2. Inclusion match (one contains the other)
    //    Ej: "Almendra" está contenido en "Almendra, Harina de" → 0.89
    //    Ej: "Aceite" está contenido en "Aceite de Oliva" → 0.89
    const inclScore = inclusionScore(cleaned, dbName);
    if (inclScore > best.score) {
      best = { name: dbName, score: inclScore, source: "db-inclusion" };
    }
    
    // 3. Bigram similarity (solo si es decente)
    const biScore = bigramSimilarity(cleaned, dbName);
    if (biScore > 0.5 && biScore > best.score) {
      best = { name: dbName, score: biScore, source: "db-bigram" };
    }
  }
  
  return best.score >= 0.45 ? best : null;
}

// ─── Encontrar el mejor match (orquestador) ─────────────────────────────────
// Estrategia:
//   FASE 1: KNOWN_FOODS (aliases curados para ingredientes de cocina)
//   FASE 2: FoodItem DB (nombres reales de la tabla de composición venezolana)
function findBestMatch(ingredientName) {
  const input = normalize(ingredientName);
  if (!input || input.length < 2) return null;

  const clean = cleanIngredientName(ingredientName);
  const cleaned = normalize(clean);

  // FASE 1: KNOWN_FOODS primero — cubre la mayoría de ingredientes de cocina
  let result = matchAgainstKnownFoods(input, cleaned);
  if (result) return result;

  // FASE 2: FoodItem DB — para ingredientes que no están en la lista curada
  result = matchAgainstFoodDB(input, cleaned);
  if (result) return result;

  return null;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const stdin = createInterface({ input: process.stdin });
  const inputLines = [];

  for await (const line of stdin) {
    inputLines.push(line);
  }

  const input = inputLines.join("\n");
  let recipes;

  try {
    recipes = JSON.parse(input);
  } catch {
    console.error("Error: stdin debe ser un JSON válido");
    process.exit(1);
  }

  if (!Array.isArray(recipes)) {
    recipes = [recipes];
  }

  let totalIngredients = 0;
  let matchedOK = 0;
  let matchedLow = 0;
  let unmatched = 0;
  const unmatchedList = [];

  for (const recipe of recipes) {
    if (!recipe.foods) continue;

    for (const food of recipe.foods) {
      totalIngredients++;
      const originalName = food.name;
      const match = findBestMatch(originalName);

      if (match) {
        food.name = match.name;
        food._matchScore = Math.round(match.score * 100) / 100;
        food._matchSource = match.source;

        if (match.score >= 0.6) {
          matchedOK++;
        } else {
          matchedLow++;
          unmatchedList.push({ 
            original: originalName, 
            matched: match.name, 
            score: match.score,
            source: match.source 
          });
        }
      } else {
        unmatched++;
        unmatchedList.push({ original: originalName, matched: null, score: 0, source: null });
      }
    }
  }

  // Stats a stderr
  console.error(`\n📊 Food Matching Results:`);
  console.error(`   Total ingredients: ${totalIngredients}`);
  console.error(`   ✅ Matched (score ≥ 0.6): ${matchedOK}`);
  console.error(`   🟡 Low confidence (0.3-0.59): ${matchedLow}`);
  console.error(`   ❌ Unmatched: ${unmatched}`);

  if (unmatchedList.length > 0) {
    console.error(`\n⚠️  Items to review:`);
    for (const item of unmatchedList.slice(0, 20)) {
      if (item.matched) {
        console.error(`   🟡 "${item.original}" → "${item.matched}" (score: ${item.score}, src: ${item.source})`);
      } else {
        console.error(`   ❌ "${item.original}" → SIN MATCH`);
      }
    }
    if (unmatchedList.length > 20) {
      console.error(`   ... y ${unmatchedList.length - 20} más`);
    }
  }

  // Output JSON a stdout
  console.log(JSON.stringify(recipes, null, 2));
}

main();
