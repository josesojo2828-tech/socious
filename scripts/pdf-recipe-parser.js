#!/usr/bin/env node

/**
 * pdf-recipe-parser.js — Extrae recetas estructuradas de PDFs usando NVIDIA API
 * 
 * Uso: node scripts/pdf-recipe-parser.js <ruta-al-pdf>
 * 
 * Variables de entorno:
 *   NVIDIA_API_KEY  — Requerida. API key de build.nvidia.com (nvapi-...)
 * 
 * Salida: JSON con array de recetas a stdout
 *   Logs/errores van a stderr (para piping fácil)
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";

// ─── Config ────────────────────────────────────────────────────────────────
const MODEL = "meta/llama-3.1-8b-instruct";
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MAX_CHUNK_LINES = 300; // ~300 líneas por chunk (~20-30 páginas)
const MAX_CONCURRENT = 3;    // llamadas paralelas máximo

// ─── Colores para logs ─────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function log(...args) {
  console.error(C.cyan + "✦" + C.reset, ...args);
}
function ok(...args) {
  console.error(C.green + "✔" + C.reset, ...args);
}
function warn(...args) {
  console.error(C.yellow + "⚠" + C.reset, ...args);
}
function fail(...args) {
  console.error(C.red + "✘" + C.reset, ...args);
}

// ─── LISTA DE ALIMENTOS CONOCIDOS (para que el LLM matchee los nombres) ──
// El LLM debe usar EXACTAMENTE estos nombres cuando sea posible
const KNOWN_FOODS = [
  "Aceite de oliva", "Aguacate", "Almendras", "Apio", "Arroz blanco", "Arroz integral",
  "Arándanos", "Atún en agua", "Avena", "Bagel", "Banano", "Brócoli", "Cacao en polvo",
  "Camarones", "Camote / Batata", "Canela", "Carne de res magra", "Champiñones",
  "Coco rallado", "Coliflor", "Durazno", "Ejotes / Judías verdes", "Ensalada mixta",
  "Espinaca", "Espárragos", "Fideos", "Fresas", "Frijoles negros", "Frutas variadas",
  "Frutos rojos", "Garbanzos", "Granola", "Harina de almendras", "Huevo entero",
  "Hummus", "Leche entera", "Lechuga", "Lentejas cocidas", "Limón", "Mango",
  "Mantequilla de maní", "Manzana", "Manzana verde", "Maíz dulce", "Miel", "Naranja",
  "Nueces", "Pan integral", "Papa", "Papas baby", "Papaya", "Pasta cocida",
  "Pavo molido", "Pechuga de pavo", "Pepino", "Pescado blanco", "Pesto", "Pimiento rojo",
  "Piña", "Plátano", "Pollo pechuga", "Queso Feta", "Queso Mozzarella", "Queso cottage",
  "Queso crema", "Queso fresco", "Quinoa cocida", "Remolacha / Betarraga", "Salmón",
  "Salmón ahumado", "Semillas de calabaza", "Semillas de chía", "Semillas de linaza",
  "Sopa de verduras", "Tofu", "Tomate", "Tomate cherry", "Trigo sarraceno",
  "Verduras mixtas", "Yogur griego", "Yogur natural", "Zanahoria", "Zucchini / Calabacín"
];

// ─── SYSTEM PROMPT (la clave del parsing) ──────────────────────────────────
const SYSTEM_PROMPT = `Eres un chef profesional y experto en nutrición. Tu tarea es extraer recetas de cocina SALUDABLES de textos extraídos de PDFs.

## REGLAS ESTRICTAS

1. **SOLO** extrae recetas completas con ingredientes y cantidades.
2. **IGNORA** todo esto (NO son recetas):
   - Portadas, índices, tablas de contenido
   - Pies de página, números de página, encabezados de documento
   - Texto promocional: "Gracias por descargar", "Click aquí", "Síguenos en", "Comparte este", "Elige preparaciones como", "Consejo nutricional"
   - Textos de derechos de autor, ISBN, editorial
   - Listas de compras genéricas sin preparación
   - Textos sueltos como "Ingredientes", "Preparación", "Modo de preparación" sin contexto de receta
   - Publicidad, suscripciones a newsletters, referencias a sitios web
   - Tablas nutricionales genéricas sin contexto de receta

3. **Nombres de recetas**: deben ser NATURALES y DESCRIPTIVOS.
   ✅ Correcto: "Pollo a la Plancha con Quinoa y Verduras"
   ✅ Correcto: "Batido Verde de Espinaca y Banano"
   ❌ Incorrecto: "PREPARACIÓN", "RECETA 1", "Ingredientes", "LUNES", "OPCIONES DE..."

4. **Categorías**: Clasificá cada receta en UNA de:
   - "desayuno" — comidas de la mañana (avena, pancakes, tostadas, huevos, batidos)
   - "almuerzo" — comida principal del mediodía (platos con proteína + carbohidrato)
   - "cena" — comidas ligeras nocturnas (sopas, cremas, ensaladas, proteína magra)
   - "snack" — meriendas, tentempiés (batidos, barritas, frutas, yogures)

5. **Tags**: Asigná 2-5 tags relevantes en español. Elegí de esta lista:
   diabetes, hipertension, renal, anti-inflamatorio, digestivo, hepatico,
   vegetariano, vegano, sin-gluten, bajo-ig, keto, proteico, alto-fibra, hipocalorico,
   rapido, facil, economico, batch-cooking, alto-en-proteinas, bajo-en-grasas

6. **INGREDIENTES — IMPORTANTE**: 
   - Usá los nombres EXACTOS de la siguiente lista de alimentos conocidos. Si un ingrediente no está en la lista, usá el nombre más cercano posible.
   - Lista de alimentos conocidos: ${KNOWN_FOODS.join(", ")}
   - Convertí las cantidades a gramos (g) o mililitros (ml). NO uses tazas, cucharadas, unidades. Estimá conversiones razonables:
     * 1 taza ≈ 240ml (líquidos) o 150g (sólidos)
     * 1 cucharada ≈ 15ml
     * 1 cucharadita ≈ 5ml
     * 1 unidad de huevo ≈ 50g
     * 1 unidad de fruta mediana ≈ 150g
     * 1 rebanada de pan ≈ 30g

7. **Descripción**: Texto corto (1-2 líneas) describiendo el plato.

## FORMATO DE SALIDA

Respondé SOLO con un JSON array válido. NADA más antes o después.

[
  {
    "name": "Nombre Natural del Plato",
    "category": "desayuno|almuerzo|cena|snack",
    "description": "Breve descripción del plato.",
    "tags": ["tag1", "tag2"],
    "foods": [
      { "name": "Pollo pechuga", "quantity": 150, "unit": "g" },
      { "name": "Arroz integral", "quantity": 120, "unit": "g" }
    ]
  }
]

Si no hay NINGUNA receta en el texto, respondé: []`;

// ─── Helper: llamar a NVIDIA API ──────────────────────────────────────────
async function callNvidia(text) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY no está configurada");

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Extraé las recetas de este texto:\n\n${text}` },
    ],
    temperature: 0.1,
    max_tokens: 2048,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000); // 3 min timeout

  const resp = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`API error ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Extraer JSON de la respuesta (el modelo a veces pone markdown)
  const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);

  // Si no encontró array, intentar parsear todo
  try {
    return JSON.parse(content);
  } catch {
    warn("No se pudo parsear JSON de la respuesta, devolviendo []");
    return [];
  }
}

// ─── Extraer texto de PDF usando pdftotext ────────────────────────────────
function extractPdfText(pdfPath) {
  if (!existsSync(pdfPath)) {
    throw new Error(`Archivo no encontrado: ${pdfPath}`);
  }

  log(`Extrayendo texto de: ${basename(pdfPath)}`);
  
  try {
    const text = execSync(`pdftotext "${pdfPath}" - 2>/dev/null`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });

    if (!text || text.trim().length < 50) {
      warn(`Texto extraído muy corto (${text?.length || 0} chars) — el PDF puede ser escaneado/imagen`);
    }

    ok(`${text.length} caracteres extraídos`);
    return text;
  } catch (err) {
    throw new Error(`Error ejecutando pdftotext: ${err.message}`);
  }
}

// ─── Chunkear texto por líneas ─────────────────────────────────────────────
function chunkText(text) {
  const lines = text.split("\n");
  const chunks = [];

  for (let i = 0; i < lines.length; i += MAX_CHUNK_LINES) {
    const chunk = lines.slice(i, i + MAX_CHUNK_LINES).join("\n");
    if (chunk.trim().length > 20) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

// ─── Deducir categoría de un nombre de archivo ─────────────────────────────
function guessCategoryFromFilename(filename) {
  const name = filename.toLowerCase();
  if (/desayuno|breakfast|avena|pancake/.test(name)) return "desayuno";
  if (/cena|dinner|sopa|crema|ligera/.test(name)) return "cena";
  if (/snack|merienda|batido|barrita/.test(name)) return "snack";
  if (/ensalada|almuerzo|lunch/.test(name)) return "almuerzo";
  return null; // sin categoría forzada
}

// ─── Pipeline principal ────────────────────────────────────────────────────
async function main() {
  const pdfPath = resolve(process.argv[2]);
  if (!pdfPath) {
    console.error("Uso: node scripts/pdf-recipe-parser.js <ruta-al-pdf>");
    process.exit(1);
  }

  if (!process.env.NVIDIA_API_KEY) {
    // Intentar leer de .env
    try {
      const envContent = readFileSync(".env", "utf-8");
      const match = envContent.match(/NVIDIA_API_KEY=(.+)/);
      if (match) process.env.NVIDIA_API_KEY = match[1].trim();
    } catch {}
    
    if (!process.env.NVIDIA_API_KEY) {
      fail("NVIDIA_API_KEY no encontrada. Configurala como variable de entorno o en un archivo .env");
      process.exit(1);
    }
  }

  const startTime = Date.now();
  const pdfName = basename(pdfPath, ".pdf");
  const forcedCategory = guessCategoryFromFilename(pdfName);

  log(C.bold + `📄 Procesando: ${basename(pdfPath)}` + C.reset);
  if (forcedCategory) {
    log(`   Categoría forzada (por nombre de archivo): ${forcedCategory}`);
  }

  // 1. Extraer texto
  const text = extractPdfText(pdfPath);

  // 2. Chunkear
  const chunks = chunkText(text);
  log(`Texto dividido en ${chunks.length} chunks de ~${MAX_CHUNK_LINES} líneas c/u`);

  if (chunks.length === 0) {
    warn("No hay texto para procesar");
    console.log("[]");
    process.exit(0);
  }

  // 3. Procesar chunks con NVIDIA (en paralelo, con límite de concurrencia)
  log(`Enviando a ${MODEL}...`);

  const allRecipes = [];
  let completed = 0;

  async function processChunk(chunk, idx) {
    try {
      const recipes = await callNvidia(chunk);
      completed++;
      ok(`Chunk ${idx + 1}/${chunks.length}: ${recipes.length} recetas extraídas`);

      if (forcedCategory) {
        for (const r of recipes) {
          r.category = forcedCategory;
        }
      }

      return recipes;
    } catch (err) {
      completed++;
      fail(`Chunk ${idx + 1}/${chunks.length}: ${err.message}`);
      return [];
    }
  }

  // Procesar en lotes paralelos
  for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
    const batch = chunks.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.all(
      batch.map((chunk, j) => processChunk(chunk, i + j))
    );
    allRecipes.push(...results.flat());
  }

  // 4. Deduplicar por nombre (case-insensitive)
  const seen = new Set();
  const unique = [];

  for (const r of allRecipes) {
    const key = r.name?.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    if (key.length < 5) continue; // descartar nombres muy cortos
    if (/^(preparacion|ingredientes|receta\s*\d*|modo\s+de|lunes|martes|miercoles|jueves|viernes|sabado|domingo)$/i.test(key)) continue;
    seen.add(key);
    unique.push(r);
  }

  // 5. Output
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  ok(`✅ Completado en ${elapsed}s`);
  log(`   Total recetas crudas: ${allRecipes.length}`);
  log(`   Total recetas únicas: ${unique.length}`);

  // Imprimir JSON a stdout
  console.log(JSON.stringify(unique, null, 2));

  // Resumen a stderr
  if (unique.length > 0) {
    const cats = {};
    for (const r of unique) {
      cats[r.category || "sin-categoria"] = (cats[r.category || "sin-categoria"] || 0) + 1;
    }
    log(`\n📊 Resumen:`);
    for (const [cat, count] of Object.entries(cats)) {
      log(`   ${cat}: ${count}`);
    }
    log(`\n${C.bold}Primeras 5 recetas:${C.reset}`);
    for (const r of unique.slice(0, 5)) {
      log(`   • ${r.name} (${r.category}) — ${r.foods?.length || 0} ingredientes`);
    }
  }
}

main().catch((err) => {
  fail(err.message);
  process.exit(1);
});
