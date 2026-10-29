import fs from 'fs';
import path from 'path';

const MENUS_DIR = '/home/jsojo/Documentos/ECOSYSTEM/Nutringest/MENUS/enfermedades';
const OUTPUT_FILE = '/home/jsojo/Documentos/ECOSYSTEM/Nutringest/Nutringest_Arch/scripts/seed-data/raw-ocr-enfermedades.json';
const API_KEY = 'K83805989288957';

async function runOcr() {
  const files = fs.readdirSync(MENUS_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'));
  console.log(`Encontradas ${files.length} imágenes de enfermedades/patologías para procesar.`);

  const results = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(MENUS_DIR, file);
    console.log(`[${i + 1}/${files.length}] Procesando ${file}...`);

    try {
      const formData = new FormData();
      formData.append('apikey', API_KEY);
      formData.append('language', 'spa');
      formData.append('isOverlayRequired', 'false');
      
      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      formData.append('file', blob, file);

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.IsErroredOnProcessing) {
        console.error(`Error en API para ${file}:`, data.ErrorMessage);
        results[file] = { error: data.ErrorMessage, text: '' };
      } else if (data.ParsedResults && data.ParsedResults.length > 0) {
        results[file] = { error: null, text: data.ParsedResults[0].ParsedText || '' };
        console.log(`✓ Extraído texto (${results[file].text.length} chars)`);
      } else {
        results[file] = { error: 'No text found', text: '' };
      }
    } catch (err) {
      console.error(`Excepción procesando ${file}:`, err.message);
      results[file] = { error: err.message, text: '' };
    }

    await new Promise(r => setTimeout(r, 1200));
  }

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n¡Proceso OCR de Patologías completado! Guardado en ${OUTPUT_FILE}`);
}

runOcr();
