import fs from 'fs';
import path from 'path';

const RAW_OCR_FILE = '/home/jsojo/Documentos/ECOSYSTEM/Nutringest/Nutringest_Arch/scripts/seed-data/raw-ocr-results.json';
const OUTPUT_FILE = '/home/jsojo/Documentos/ECOSYSTEM/Nutringest/Nutringest_Arch/scripts/seed-data/totalidad-menus.json';

// Mapeos y diccionarios de alimentos para parsear texto de recetas
const KNOWN_FOODS = [
  { keywords: ['pollo', 'pechuga'], name: 'Pollo pechuga', defaultQty: 150, unit: 'g' },
  { keywords: ['pavo'], name: 'Pechuga de pavo', defaultQty: 140, unit: 'g' },
  { keywords: ['carne', 'res', 'ternera'], name: 'Carne de res magra', defaultQty: 150, unit: 'g' },
  { keywords: ['salmón', 'salmon'], name: 'Salmón', defaultQty: 150, unit: 'g' },
  { keywords: ['atún', 'atun'], name: 'Atún en agua', defaultQty: 120, unit: 'g' },
  { keywords: ['pescado', 'merluza', 'tilapia', 'bacalao'], name: 'Pescado blanco', defaultQty: 150, unit: 'g' },
  { keywords: ['camarón', 'camaron', 'gambas'], name: 'Camarones', defaultQty: 130, unit: 'g' },
  { keywords: ['huevo', 'huevos'], name: 'Huevo entero', defaultQty: 100, unit: 'g' },
  { keywords: ['arroz blanco'], name: 'Arroz blanco', defaultQty: 150, unit: 'g' },
  { keywords: ['arroz integral', 'arroz'], name: 'Arroz integral', defaultQty: 140, unit: 'g' },
  { keywords: ['avena'], name: 'Avena', defaultQty: 50, unit: 'g' },
  { keywords: ['quinoa', 'quínua'], name: 'Quinoa cocida', defaultQty: 120, unit: 'g' },
  { keywords: ['brócoli', 'brocoli'], name: 'Brócoli', defaultQty: 100, unit: 'g' },
  { keywords: ['espinaca', 'espinacas'], name: 'Espinaca', defaultQty: 50, unit: 'g' },
  { keywords: ['lechuga'], name: 'Lechuga', defaultQty: 60, unit: 'g' },
  { keywords: ['tomate', 'tomates'], name: 'Tomate', defaultQty: 80, unit: 'g' },
  { keywords: ['pepino'], name: 'Pepino', defaultQty: 80, unit: 'g' },
  { keywords: ['aguacate', 'palta'], name: 'Aguacate', defaultQty: 50, unit: 'g' },
  { keywords: ['zanahoria'], name: 'Zanahoria', defaultQty: 60, unit: 'g' },
  { keywords: ['lenteja', 'lentejas'], name: 'Lentejas cocidas', defaultQty: 150, unit: 'g' },
  { keywords: ['garbanzo', 'garbanzos'], name: 'Garbanzos', defaultQty: 130, unit: 'g' },
  { keywords: ['frijol', 'frijoles', 'caraotas'], name: 'Frijoles negros', defaultQty: 120, unit: 'g' },
  { keywords: ['pan integral', 'pan'], name: 'Pan integral', defaultQty: 60, unit: 'g' },
  { keywords: ['yogur', 'yogurt'], name: 'Yogur natural', defaultQty: 150, unit: 'g' },
  { keywords: ['leche'], name: 'Leche entera', defaultQty: 200, unit: 'ml' },
  { keywords: ['manzana'], name: 'Manzana', defaultQty: 100, unit: 'g' },
  { keywords: ['plátano', 'banana', 'banano'], name: 'Plátano', defaultQty: 100, unit: 'g' },
  { keywords: ['fresa', 'fresas'], name: 'Fresas', defaultQty: 80, unit: 'g' },
  { keywords: ['arándano', 'arándanos'], name: 'Arándanos', defaultQty: 60, unit: 'g' },
  { keywords: ['nueces', 'nuez'], name: 'Nueces', defaultQty: 20, unit: 'g' },
  { keywords: ['almendra', 'almendras'], name: 'Almendras', defaultQty: 20, unit: 'g' },
  { keywords: ['chía', 'chia'], name: 'Semillas de chía', defaultQty: 15, unit: 'g' },
  { keywords: ['aceite de oliva', 'aceite'], name: 'Aceite de oliva', defaultQty: 10, unit: 'g' }
];

function sanitizeTitle(rawTitle) {
  if (!rawTitle) return "Menú Saludable";
  let cleaned = rawTitle
    .replace(/(?:Hipertensión|Diabetes|Plan)?\s*(?:Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)\s*[-:\s]*/gi, '')
    .replace(/(?:Día|Dia)\s*\d+\s*[-:\s]*/gi, '')
    .replace(/Algun\s+dia\s*[-:\s]*/gi, '')
    .replace(/^[-:\s]+|[-:\s]+$/g, '')
    .trim();

  if (!cleaned || cleaned.length < 4) return "Plato Nutritivo Balanceado";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function detectCategory(text, title) {
  const lower = (text + " " + title).toLowerCase();
  if (lower.includes('desayuno') || lower.includes('pancake') || lower.includes('avena') || lower.includes('omelette')) return 'desayuno';
  if (lower.includes('cena') || lower.includes('sopa') || lower.includes('crema') || lower.includes('ligero')) return 'cena';
  if (lower.includes('snack') || lower.includes('merienda') || lower.includes('batido') || lower.includes('smoothie')) return 'snack';
  return 'almuerzo';
}

function detectTags(text, title, fileName) {
  const tags = new Set();
  const lower = (text + " " + title + " " + fileName).toLowerCase();

  if (lower.includes('diabet') || lower.includes('glucosa') || lower.includes('insulina')) {
    tags.add('diabetes');
    tags.add('bajo-ig');
  }
  if (lower.includes('hiperten') || lower.includes('presion') || lower.includes('sodio') || lower.includes('hiposodico')) {
    tags.add('hipertension');
    tags.add('hiposodico');
  }
  if (lower.includes('renal') || lower.includes('riñon')) {
    tags.add('renal');
    tags.add('control-potasio');
  }
  if (lower.includes('anti-inflamator') || lower.includes('curcuma') || lower.includes('omega-3')) {
    tags.add('anti-inflamatorio');
  }
  if (lower.includes('embaraz') || lower.includes('lactanc') || lower.includes('gestac')) {
    tags.add('embarazo');
  }
  if (lower.includes('ceto') || lower.includes('keto')) {
    tags.add('keto');
  }
  if (lower.includes('ensalada')) tags.add('ensaladas');
  if (lower.includes('batido') || lower.includes('smoothie')) tags.add('batidos');
  if (lower.includes('proteic') || lower.includes('proteina')) tags.add('proteico');

  if (tags.size === 0) {
    tags.add('saludable');
    tags.add('balanceado');
  }

  return Array.from(tags);
}

function extractFoodsFromText(text) {
  const lowerText = text.toLowerCase();
  const foundFoods = [];

  for (const food of KNOWN_FOODS) {
    const matched = food.keywords.some(kw => lowerText.includes(kw));
    if (matched) {
      foundFoods.push({
        name: food.name,
        quantity: food.defaultQty,
        unit: food.unit
      });
    }
  }

  // Fallback si no se detectaron suficientes alimentos
  if (foundFoods.length === 0) {
    foundFoods.push(
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Arroz integral', quantity: 120, unit: 'g' },
      { name: 'Brócoli', quantity: 100, unit: 'g' }
    );
  }

  return foundFoods;
}

function parseOcrToMenus() {
  if (!fs.existsSync(RAW_OCR_FILE)) {
    console.error("No se encontró el archivo raw-ocr-results.json");
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(RAW_OCR_FILE, 'utf-8'));
  const extractedMenus = [];

  console.log(`🧠 Procesando texto de ${Object.keys(rawData).length} archivos para estructurar menús...`);

  for (const fileName of Object.keys(rawData)) {
    const fileItem = rawData[fileName];
    if (!fileItem.text || fileItem.text.length < 20) continue;

    // Dividir texto por secciones/recetas (ej: líneas vacías, saltos de página o títulos)
    const blocks = fileItem.text.split(/(?:\r?\n){2,}|--- PAGE ---|Receta \d+|Menú \d+/i);

    for (let bIndex = 0; bIndex < blocks.length; bIndex++) {
      const block = blocks[bIndex].trim();
      if (block.length < 30) continue;

      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      // El primer renglón significativo suele ser el título de la receta/menú
      let rawTitle = lines[0].replace(/^[\d\.\-\*#\s]+/, '');
      const title = sanitizeTitle(rawTitle);

      const description = lines.slice(1, 4).join(' ').substring(0, 200) || `Receta saludable y nutritiva extraída del catálogo.`;
      const category = detectCategory(block, title);
      const tags = detectTags(block, title, fileName);
      const foods = extractFoodsFromText(block);

      extractedMenus.push({
        imageFile: fileName.endsWith('.pdf') ? 'Menu saludable.jpg' : fileName,
        name: title,
        category: category,
        description: description,
        tags: tags,
        foods: foods
      });
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(extractedMenus, null, 2));
  console.log(`\n🎉 Extracción completada con éxito. Se generaron ${extractedMenus.length} menús estructurados en total!`);
  console.log(`Guardado en: ${OUTPUT_FILE}`);
}

parseOcrToMenus();
