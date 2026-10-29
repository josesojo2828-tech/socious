import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * S7 (legal-compliance) — el registro pide la fecha de nacimiento.
 *
 * El label se renderizaba como `{t('form.labels.birth_date') || 'Fecha de Nacimiento'}`.
 * En este repo `t()` devuelve el PATH de la clave cuando la clave no existe
 * (ver `src/context/i18n.context.tsx`, paso 5), así que el `|| fallback` era
 * código muerto y el usuario veía literalmente `form.labels.birth_date`.
 *
 * Estos tests son el guardián de esa clave:
 *   - si la clave desaparece de cualquiera de los locales, el test falla;
 *   - si alguien reintroduce el patrón `t(key) || fallback` en la pantalla,
 *     el test falla.
 *
 * El render del componente no se prueba en runtime (el entorno de vitest es
 * `node` y no hay DOM/testing-library), por lo que se verifica sobre los
 * archivos reales de locale y sobre el código fuente de la pantalla.
 */

const REGISTER_DIR = path.dirname(fileURLToPath(import.meta.url));

const readRepoFile = (...segments: string[]): string =>
  readFileSync(path.join(REGISTER_DIR, ...segments), 'utf8');

const esForm = JSON.parse(readRepoFile('..', '..', 'i18n', 'es', 'form.json')) as Record<string, any>;
const notEnForm = JSON.parse(readRepoFile('..', '..', 'i18n', 'not_en', 'form.json')) as Record<string, any>;

const KEY_PATH = 'form.labels.birth_date';
const KEY_SEGMENTS = ['labels', 'birth_date'];

/**
 * Réplica de la resolución de `t()` en `src/context/i18n.context.tsx`:
 * busca en el idioma activo, luego en `es`, y si no encuentra la clave
 * devuelve el PATH original (que es exactamente el bug reportado).
 */
const RESOURCES: Record<string, Record<string, any>> = {
  es: { form: esForm },
  not_en: { form: notEnForm },
};

const resolveIn = (resource: Record<string, any> | undefined, keyPath: string): string | undefined => {
  if (!resource) return undefined;

  const [fileName, ...keys] = keyPath.split('.');
  let value: any = resource[fileName];

  for (const key of keys) {
    if (value === undefined || value === null || value[key] === undefined) {
      return undefined;
    }
    value = value[key];
  }

  return typeof value === 'string' ? value : undefined;
};

const translate = (language: string, keyPath: string): string =>
  resolveIn(RESOURCES[language], keyPath) ?? resolveIn(RESOURCES.es, keyPath) ?? keyPath;

describe('register — guardián de la clave form.labels.birth_date', () => {
  it('la locale es define form.labels.birth_date', () => {
    const label = esForm?.labels?.birth_date;
    expect(typeof label).toBe('string');
    expect(label?.trim().length).toBeGreaterThan(0);
  });

  it('la locale not_en define form.labels.birth_date', () => {
    const label = notEnForm?.labels?.birth_date;
    expect(typeof label).toBe('string');
    expect(label?.trim().length).toBeGreaterThan(0);
  });

  it('ninguna locale resuelve la clave como path crudo (no se renderiza form.labels.birth_date)', () => {
    expect(translate('es', KEY_PATH)).not.toBe(KEY_PATH);
    expect(translate('not_en', KEY_PATH)).not.toBe(KEY_PATH);
  });

  it('el label resuelto difiere del path de la clave y de la etiqueta literal del idioma', () => {
    const esLabel = translate('es', KEY_PATH);
    const notEnLabel = translate('not_en', KEY_PATH);

    expect(esLabel).not.toBe(KEY_PATH);
    expect(notEnLabel).not.toBe(KEY_PATH);
    expect(esLabel).not.toBe(notEnLabel);
  });

  it('la pantalla de registro NO usa el patrón muerto t(key) || fallback para la fecha de nacimiento', () => {
    const source = readRepoFile('page.tsx');

    expect(source).not.toMatch(/t\(\s*['"]form\.labels\.birth_date['"]\s*\)\s*\|\|/);
  });

  it('la pantalla de registro resuelve la fecha de nacimiento con el helper de clave obligatoria', () => {
    const source = readRepoFile('page.tsx');

    expect(source).toMatch(/requireTranslation\(/);
    expect(source).toMatch(/requireTranslation\([^)]*['"]form\.labels\.birth_date['"]/);
  });
});
