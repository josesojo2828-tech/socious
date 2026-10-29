// src/i18n/i18n.service.ts
import { Global, Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);

  private translations = new Map<string, Map<string, any>>();

  constructor() {
    const i18nRoot = path.join(process.cwd(), "src/i18n");

    this.logger.log(`Cargando traducciones desde: ${i18nRoot}`);

    try {
      const langFolders = fs
        .readdirSync(i18nRoot)
        .filter((d) => fs.statSync(path.join(i18nRoot, d)).isDirectory());

      for (const lang of langFolders) {
        const langMap = new Map<string, any>();
        const langPath = path.join(i18nRoot, lang);

        const files = fs
          .readdirSync(langPath)
          .filter((f) => f.endsWith(".json"));

        for (const file of files) {
          const filePath = path.join(langPath, file);
          const fileContent = fs.readFileSync(filePath, "utf8");
          const fileName = file.replace(".json", ""); // 'common'

          langMap.set(fileName, JSON.parse(fileContent));
        }

        // 3. Guardar en el mapa principal
        this.translations.set(lang, langMap);
      }

      this.logger.log(`Idiomas cargados: [${[...this.translations.keys()]}]`);
    } catch (error) {
      this.logger.error("Error fatal al cargar archivos de traducción", error);
    }
  }

  /**
   * Traduce una clave completa (ej: 'common.wallet.balance')
   */
  translate(key: string, lang: string): string {
    if (!key) return "";

    try {
      // 1. Parsear la clave
      // 'common.wallet.balance' -> ['common', 'wallet', 'balance']
      const parts = key.split(".");

      // El primer elemento es SIEMPRE el nombre del archivo
      const fileName = parts.shift(); // 'common'

      // El resto es la clave anidada
      const nestedKey = parts.join("."); // 'wallet.balance'

      if (!fileName || parts.length === 0) {
        this.logger.warn(`Clave i18n mal formada (sin archivo): ${key}`);
        return key;
      }

      // 2. Obtener el archivo JSON
      const langFiles = this.translations.get(lang);
      if (!langFiles) return key; // Idioma no encontrado

      const fileContent = langFiles.get(fileName);
      if (!fileContent) {
        this.logger.warn(
          `Archivo i18n no encontrado: ${fileName} (lang: ${lang})`,
        );
        return key; // Archivo no encontrado
      }

      // 3. Buscar la clave anidada (ej: 'wallet.balance')
      const value = parts.reduce((o, i) => o[i], fileContent);

      return value || key; // Retorna la clave si la traducción no existe
    } catch (error) {
      this.logger.warn(`Clave i18n no encontrada: ${key} (lang: ${lang})`);
      return key; // Fallback
    }
  }
}
