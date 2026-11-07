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

const esForm = JSON.parse(readRepoFile('..', '..', 'i18n', 'es', 'form.json')) as Record<string, unknown>;
const notEnForm = JSON.parse(readRepoFile('..', '..', 'i18n', 'not_en', 'form.json')) as Record<string, unknown>;

const KEY_PATH = 'form.labels.birth_date';
const KEY_SEGMENTS = ['labels', 'birth_date'];

/**
 * Réplica de la resolución de `t()` en `src/context/i18n.context.tsx`:
 * busca en el idioma activo, luego en `es`, y si no encuentra la clave
 * devuelve el PATH original (que es exactamente el bug reportado).
 */
const RESOURCES: Record<string, Record<string, unknown>> = {
  es: { form: esForm },
  not_en: { form: notEnForm },
};

const resolveIn = (resource: Record<string, unknown> | undefined, keyPath: string): string | undefined => {
  if (!resource) return undefined;

  const [fileName, ...keys] = keyPath.split('.');
  let value: unknown = resource[fileName];

  for (const key of keys) {
    if (value === undefined || value === null || (value as Record<string, unknown>)[key] === undefined) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[key];
  }

  return typeof value === 'string' ? value : undefined;
};

const translate = (language: string, keyPath: string): string =>
  resolveIn(RESOURCES[language], keyPath) ?? resolveIn(RESOURCES.es, keyPath) ?? keyPath;

describe('register — guardián de la clave form.labels.birth_date', () => {
  it('la locale es define form.labels.birth_date', () => {
    const label = resolveIn(RESOURCES.es, KEY_PATH);
    expect(typeof label).toBe('string');
    expect(label?.trim().length).toBeGreaterThan(0);
  });

  it('la locale not_en define form.labels.birth_date', () => {
    const label = resolveIn(RESOURCES.not_en, KEY_PATH);
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

/**
 * Los iconos de los campos son absolutos sobre el input (`absolute left-4`).
 * Si el control no reserva ese espacio con `pl-11`, el texto y el placeholder
 * quedan debajo del icono. Login ya lo hacía; el registro era el que no.
 */
describe('register — los inputs con icono reservan espacio para el icono', () => {
  it('todo control con icono a la izquierda aplica pl-11', () => {
    const source = readRepoFile('page.tsx');
    const ICON_WRAPPER = 'absolute left-4 top-1/2 -translate-y-1/2';
    const chunks = source.split(ICON_WRAPPER).slice(1);

    expect(chunks.length).toBeGreaterThan(0);

    for (const chunk of chunks) {
      const controlStart = chunk.search(/<(input|select)\b/);
      expect(controlStart).toBeGreaterThanOrEqual(0);

      const control = chunk.slice(controlStart);
      const tagEnd = control.indexOf('>');
      const tag = control.slice(0, tagEnd);

      expect(tag).toMatch(/\bpl-11\b/);
    }
  });
});

/**
 * El código de referido ya no se tipea en el formulario, pero el link de
 * invitación (`/register?ref=...`, ver `UserReferenceSection`) sigue siendo el
 * mecanismo de atribución: el `ref` tiene que llegar al backend en silencio.
 * Sin estos guardas, "limpiar" el campo puede llevarse puesta la atribución de
 * todos los links ya compartidos.
 */
describe('register — código de referido', () => {
  it('no renderiza el input de código de referido', () => {
    const source = readRepoFile('page.tsx');

    expect(source).not.toMatch(/register\(\s*['"]referralCode['"]\s*\)/);
    expect(source).not.toMatch(/form\.placeholders\.referral_code/);
  });

  it('sigue enviando el ?ref= al backend como referralCode', () => {
    const source = readRepoFile('page.tsx');

    expect(source).toMatch(/searchParams\.get\(\s*['"]ref['"]\s*\)/);
    expect(source).toMatch(/referralCode:\s*refParam/);
  });
});

/**
 * El trial no es una constante del frontend: es la configuración
 * `DEFAULT_TRIAL_DAYS` que el admin edita en Configuración y que el backend
 * resuelve al crear el workspace.
 */
describe('register — días de prueba', () => {
  it('lee DEFAULT_TRIAL_DAYS del endpoint público en vez de hardcodear el número', () => {
    const source = readRepoFile('page.tsx');

    expect(source).toMatch(/\/api\/system-settings\/public\/DEFAULT_TRIAL_DAYS/);
    expect(source).toMatch(/Crear mi cuenta gratis \(\{trialDays\} días\)/);
    expect(source).not.toMatch(/Crear mi cuenta gratis \(14 días\)/);
  });
});
