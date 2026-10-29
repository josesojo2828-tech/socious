import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  INVITATION_STATUS_MESSAGE_KEYS,
  INVITATION_TRANSLATION_KEYS,
  PASSWORD_POLICY,
  parseInvitationStatus,
  requireTranslation,
  resolveInvitationState,
  validateConfirmation,
  validateInvitationForm,
  validatePassword,
} from './invitation-form';

/**
 * S1 (patient-onboarding) · B3 — lógica de la página pública
 * `/patient/invitacion`.
 *
 * El entorno de vitest del webapp es `node`: no hay DOM ni
 * `@testing-library`, así que el render del componente NO se puede afirmar en
 * runtime. Por eso la lógica de la página vive en un módulo puro
 * (`invitation-form.ts`) y se prueba acá.
 *
 * La política de contraseñas es la MISMA que exige el servidor
 * (`ChangePasswordDto.newPassword`, reutilizada por el DTO de la invitación):
 * mínimo 8 caracteres, al menos una letra y al menos un número. El esquema
 * del registro (`features/user/schemas/auth.schema.ts`) usa `min(6)` y está
 * desactualizado: NO se copia de ahí.
 */

const LIB_DIR = path.dirname(fileURLToPath(import.meta.url));

const readRepoFile = (...segments: string[]): string =>
  readFileSync(path.join(LIB_DIR, ...segments), 'utf8');

const esAuth = JSON.parse(readRepoFile('..', '..', '..', '..', 'i18n', 'es', 'auth.json')) as Record<string, any>;
const notEnAuth = JSON.parse(readRepoFile('..', '..', '..', '..', 'i18n', 'not_en', 'auth.json')) as Record<string, any>;

/**
 * Réplica de la resolución de `t()` en `src/context/i18n.context.tsx`:
 * `auth.invitation.title` → recurso `auth` (el archivo `auth.json`) y luego
 * las claves `invitation` y `title`.
 */
const resolveIn = (resource: Record<string, any> | undefined, keyPath: string): string | undefined => {
  if (!resource) return undefined;

  const segments = keyPath.split('.');
  const [fileName, ...keys] = segments;
  let value: any = resource[fileName];

  if (value === undefined) {
    // El recurso ya ES el archivo de locale (`auth.json`): se navega desde
    // la raíz con las claves que siguen al nombre del archivo.
    value = resource;
    keys.length = 0;
    keys.push(...segments.slice(1));
  }

  for (const key of keys) {
    if (value === undefined || value === null || value[key] === undefined) {
      return undefined;
    }
    value = value[key];
  }

  return typeof value === 'string' ? value : undefined;
};

const translate = (language: 'es' | 'not_en', keyPath: string): string => {
  const resource = language === 'es' ? esAuth : notEnAuth;
  return resolveIn(resource, keyPath) ?? resolveIn(esAuth, keyPath) ?? keyPath;
};

describe('invitation-form — política de contraseñas (la misma que el servidor)', () => {
  it('la política declarada es la del servidor: 8+, una letra, un número', () => {
    expect(PASSWORD_POLICY.minLength).toBe(8);
  });

  it('ACEPTA una contraseña de 8 caracteres con letra y número', () => {
    expect(validatePassword('abcd1234').valid).toBe(true);
  });

  it('ACEPTA una contraseña larga con letra y número', () => {
    expect(validatePassword('Nutringest2026').valid).toBe(true);
  });

  it('RECHAZA una contraseña de 7 caracteres (aunque tenga letra y número)', () => {
    const result = validatePassword('abc1234');
    expect(result.valid).toBe(false);
    expect(result.code).toBe('too_short');
  });

  it('RECHAZA una contraseña sin letras', () => {
    const result = validatePassword('12345678');
    expect(result.valid).toBe(false);
    expect(result.code).toBe('missing_letter');
  });

  it('RECHAZA una contraseña sin números', () => {
    const result = validatePassword('abcdefgh');
    expect(result.valid).toBe(false);
    expect(result.code).toBe('missing_digit');
  });

  it('RECHAZA una contraseña vacía', () => {
    expect(validatePassword('').valid).toBe(false);
  });

  it('ACEPTA letras acentuadas (misma expresión regular que el servidor)', () => {
    expect(validatePassword('áéñ12345').valid).toBe(true);
  });

  it('NO acepta la política del registro (min 6): "abc123" es inválida acá', () => {
    const result = validatePassword('abc123');
    expect(result.valid).toBe(false);
    expect(result.code).toBe('too_short');
  });
});

describe('invitation-form — confirmación de la contraseña', () => {
  it('ACEPTA dos contraseñas iguales', () => {
    expect(validateConfirmation('abcd1234', 'abcd1234').valid).toBe(true);
  });

  it('RECHAZA dos contraseñas distintas', () => {
    const result = validateConfirmation('abcd1234', 'abcd12345');
    expect(result.valid).toBe(false);
    expect(result.code).toBe('mismatch');
  });

  it('la política se evalúa antes que la coincidencia', () => {
    const result = validateInvitationForm('abc', 'xyz');
    expect(result.valid).toBe(false);
    expect(result.code).toBe('too_short');
  });

  it('el formulario completo es válido sólo con política cumplida y coincidencia', () => {
    expect(validateInvitationForm('abcd1234', 'abcd1234').valid).toBe(true);
    expect(validateInvitationForm('abcd1234', 'abcd12345').code).toBe('mismatch');
  });
});

describe('invitation-form — estados de la invitación', () => {
  it('reconoce los cuatro estados del servidor', () => {
    expect(parseInvitationStatus('valid')).toBe('valid');
    expect(parseInvitationStatus('expired')).toBe('expired');
    expect(parseInvitationStatus('used')).toBe('used');
    expect(parseInvitationStatus('invalid')).toBe('invalid');
  });

  it('cualquier estado desconocido se trata como inválido (nunca como válido)', () => {
    expect(parseInvitationStatus(undefined)).toBe('invalid');
    expect(parseInvitationStatus(null)).toBe('invalid');
    expect(parseInvitationStatus('')).toBe('invalid');
    expect(parseInvitationStatus('VALID')).toBe('invalid');
    expect(parseInvitationStatus('active')).toBe('invalid');
  });

  it('cada estado tiene su propio mensaje', () => {
    const messages = (['valid', 'expired', 'used', 'invalid'] as const).map(
      (status) => resolveInvitationState(status, (key) => translate('es', key)).message,
    );

    expect(new Set(messages).size).toBe(4);
    messages.forEach((message) => {
      expect(message).not.toBe('');
      expect(message).not.toMatch(/^auth\.invitation\./);
    });
  });

  it('el mensaje de cada estado existe en los dos locales', () => {
    (['valid', 'expired', 'used', 'invalid'] as const).forEach((status) => {
      const { title, message } = INVITATION_STATUS_MESSAGE_KEYS[status];

      expect(translate('es', title)).not.toBe(title);
      expect(translate('es', message)).not.toBe(message);
      expect(translate('not_en', title)).not.toBe(title);
      expect(translate('not_en', message)).not.toBe(message);
    });
  });

  it('los mensajes de los estados son distintos entre sí', () => {
    const messages = Object.values(INVITATION_STATUS_MESSAGE_KEYS).map((entry) => entry.message);

    expect(new Set(messages).size).toBe(4);
  });
});

describe('invitation-form — requireTranslation (nunca renderizar el path crudo)', () => {
  it('devuelve el valor traducido cuando la clave existe', () => {
    const value = requireTranslation((key) => translate('es', key), 'auth.invitation.title', 'fallback');
    expect(value).not.toBe('fallback');
    expect(value).not.toBe('auth.invitation.title');
  });

  it('lanza un error explícito si la clave falta (falla ruidoso en dev/test)', () => {
    expect(() =>
      requireTranslation(() => 'auth.invitation.missing', 'auth.invitation.missing', 'fallback'),
    ).toThrow(/auth\.invitation\.missing/);
  });

  it('una clave que resuelve al path crudo se considera ausente', () => {
    expect(() =>
      requireTranslation((key) => key, 'auth.invitation.title', 'fallback'),
    ).toThrow(/auth\.invitation\.title/);
  });
});

describe('invitation-form — guardián de las claves de i18n', () => {
  it('todas las claves usadas por la página existen en el locale español', () => {
    INVITATION_TRANSLATION_KEYS.forEach((key) => {
      const resolved = translate('es', key);
      expect(resolved, `falta ${key} en es/auth.json`).not.toBe(key);
      expect(resolved.trim().length).toBeGreaterThan(0);
    });
  });

  it('todas las claves usadas por la página existen en el locale not_en', () => {
    INVITATION_TRANSLATION_KEYS.forEach((key) => {
      const resolved = translate('not_en', key);
      expect(resolved, `falta ${key} en not_en/auth.json`).not.toBe(key);
      expect(resolved.trim().length).toBeGreaterThan(0);
    });
  });

  it('el locale español y el not_en no comparten el mismo texto (traducción real)', () => {
    INVITATION_TRANSLATION_KEYS.forEach((key) => {
      expect(translate('es', key), `${key} no está traducido`).not.toBe(translate('not_en', key));
    });
  });
});
