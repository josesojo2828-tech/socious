import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { INVITATION_TRANSLATION_KEYS } from '@/features/patient/invitation/lib/invitation-form';

/**
 * S1 (patient-onboarding) · B3 — guardián de i18n de la página pública
 * `/patient/invitacion`.
 *
 * En este repo `t()` devuelve el PATH de la clave cuando no la encuentra
 * (ver `src/context/i18n.context.tsx`, paso 5). Por eso `t(clave) || fallback`
 * es código muerto y el paciente vería literalmente `auth.invitation.title`.
 *
 * El render del componente no se prueba en runtime (el entorno de vitest es
 * `node`: no hay DOM ni `@testing-library`), así que se verifica sobre los
 * archivos reales de locale y sobre el código fuente de la pantalla.
 */

const PAGE_DIR = path.dirname(fileURLToPath(import.meta.url));

const readRepoFile = (...segments: string[]): string =>
  readFileSync(path.join(PAGE_DIR, ...segments), 'utf8');

const esAuth = JSON.parse(readRepoFile('..', '..', '..', 'i18n', 'es', 'auth.json')) as Record<string, any>;
const notEnAuth = JSON.parse(readRepoFile('..', '..', '..', 'i18n', 'not_en', 'auth.json')) as Record<string, any>;

const pageSource = readRepoFile('page.tsx');

/** Resuelve `auth.invitation.x` dentro de un archivo `auth.json`. */
const resolveIn = (resource: Record<string, any>, keyPath: string): string | undefined => {
  const segments = keyPath.split('.');
  let value: any = resource[segments[0]];

  if (value === undefined) {
    value = resource;
    segments.splice(0, 1);
  }

  for (const key of segments) {
    if (value === undefined || value === null || value[key] === undefined) {
      return undefined;
    }
    value = value[key];
  }

  return typeof value === 'string' ? value : undefined;
};

/** Todas las claves `auth.invitation.*` que la pantalla menciona. */
const usedKeys = Array.from(
  new Set(pageSource.match(/'auth\.invitation\.[a-z_]+'/g) ?? []),
).map((literal) => literal.replace(/'/g, ''));

describe('patient/invitacion — guardián de las claves de i18n', () => {
  it('la pantalla usa claves de invitación y todas están en la lista vigilada', () => {
    expect(usedKeys.length).toBeGreaterThan(0);

    usedKeys.forEach((key) => {
      expect(INVITATION_TRANSLATION_KEYS, `clave no vigilada: ${key}`).toContain(key);
    });
  });

  it('la lista vigilada y las claves usadas por la pantalla coinciden', () => {
    expect([...usedKeys].sort()).toEqual([...INVITATION_TRANSLATION_KEYS].sort());
  });

  it('todas las claves existen en el locale español', () => {
    INVITATION_TRANSLATION_KEYS.forEach((key) => {
      const resolved = resolveIn(esAuth, key);
      expect(resolved, `falta ${key} en es/auth.json`).toBeDefined();
      expect(resolved?.trim().length ?? 0).toBeGreaterThan(0);
    });
  });

  it('todas las claves existen en el locale not_en', () => {
    INVITATION_TRANSLATION_KEYS.forEach((key) => {
      const resolved = resolveIn(notEnAuth, key);
      expect(resolved, `falta ${key} en not_en/auth.json`).toBeDefined();
      expect(resolved?.trim().length ?? 0).toBeGreaterThan(0);
    });
  });

  it('el not_en está realmente traducido (no es copia del español)', () => {
    INVITATION_TRANSLATION_KEYS.forEach((key) => {
      expect(resolveIn(esAuth, key), `${key} sin traducir`).not.toBe(resolveIn(notEnAuth, key));
    });
  });
});

describe('patient/invitacion — la pantalla nunca renderiza el path crudo', () => {
  it('NO usa el patrón muerto t(clave) || fallback', () => {
    expect(pageSource).not.toMatch(/t\(\s*['"]auth\.invitation\.[a-z_]+['"]\s*\)\s*\|\|/);
  });

  it('resuelve cada clave de invitación con requireTranslation', () => {
    expect(pageSource).toMatch(/requireTranslation\(/);

    const directCalls = pageSource.match(/[^a-zA-Z]t\(\s*['"]auth\.invitation\./g) ?? [];
    expect(directCalls).toHaveLength(0);
  });
});

describe('patient/invitacion — el token no se muestra ni se registra', () => {
  it('el token nunca se renderiza en el marcado de la página', () => {
    const markupStart = pageSource.indexOf('min-h-screen flex flex-col bg-base-100');
    expect(markupStart).toBeGreaterThan(-1);

    const markup = pageSource.slice(markupStart);
    expect(markup).not.toMatch(/\btoken\b/);
  });

  it('el token nunca se escribe en la consola', () => {
    expect(pageSource).not.toMatch(/console\.(log|error|warn|info)\([^)]*\btoken\b/);
  });
});

describe('patient/invitacion — usa los endpoints públicos de la invitación', () => {
  it('consulta el estado de la invitación', () => {
    expect(pageSource).toMatch(/INVITATION_STATUS_ENDPOINT/);
  });

  it('acepta la invitación con token, password y confirmPassword', () => {
    expect(pageSource).toMatch(/INVITATION_ACCEPT_ENDPOINT/);
    expect(pageSource).toMatch(/confirmPassword/);
  });

  it('persiste la sesión con el flujo del login', () => {
    expect(pageSource).toMatch(/establishInvitationSession/);
    expect(pageSource).toMatch(/resolveInvitationRedirect/);
  });
});
