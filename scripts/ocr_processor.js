import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const MENUS_DIR = process.env.MENUS_DIR || '/home/jsojo/Documentos/ECOSYSTEM/Nutringest/TOTALIDAD';
const OUTPUT_FILE = '/home/jsojo/Documentos/ECOSYSTEM/Nutringest/Nutringest_Arch/scripts/seed-data/raw-ocr-results.json';
const API_KEY = process.env.OCR_API_KEY || 'K83805989288957';

async function runOcr() {
  if (!fs.existsSync(MENUS_DIR)) {
    console.error(`El directorio ${MENUS_DIR} no existe.`);
    return;
  }

  const files = fs.readdirSync(MENUS_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext);
  });

  console.log(`🔍 Encontrados ${files.length} archivos en ${MENUS_DIR} para procesamiento ultra-rápido.`);

  const results = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(MENUS_DIR, file);
    const ext = path.extname(file).toLowerCase();

    console.log(`[${i + 1}/${files.length}] Procesando ${file} (${ext})...`);

    if (ext === '.pdf') {
      try {
        // Extraer todo el texto del PDF de forma instantánea usando pdftotext
        const stdout = execSync(`pdftotext "${filePath}" -`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        results[file] = { error: null, text: stdout.trim() };
        console.log(`⚡ [PDF] Extraído texto completo (${stdout.length} caracteres) de ${file}`);
      } catch (err) {
        console.error(`❌ Error en pdftotext para ${file}:`, err.message);
        results[file] = { error: err.message, text: '' };
      }
    } else {
      // Para imágenes (.jpg, .png, .webp) usamos la API OCR.Space
      try {
        const formData = new FormData();
        formData.append('apikey', API_KEY);
        formData.append('language', 'spa');
        formData.append('isOverlayRequired', 'false');

        const fileBuffer = fs.readFileSync(filePath);
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';

        const blob = new Blob([fileBuffer], { type: mimeType });
        formData.append('file', blob, file);

        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.IsErroredOnProcessing) {
          console.error(`❌ Error en API OCR para ${file}:`, data.ErrorMessage);
          results[file] = { error: data.ErrorMessage, text: '' };
        } else if (data.ParsedResults && data.ParsedResults.length > 0) {
          const fullText = data.ParsedResults.map(pr => pr.ParsedText || '').join('\n');
          results[file] = { error: null, text: fullText };
          console.log(`✓ [IMAGEN] Extraído texto (${fullText.length} caracteres)`);
        } else {
          results[file] = { error: 'No text found', text: '' };
        }
      } catch (err) {
        console.error(`Excepción procesando ${file}:`, err.message);
        results[file] = { error: err.message, text: '' };
      }

      // Esperar 1s entre llamadas API de imágenes
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n🎉 ¡Proceso OCR completado con éxito! ${Object.keys(results).length} archivos procesados.`);
  console.log(`Resultados guardados en: ${OUTPUT_FILE}`);
}

runOcr();
