import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PATIENT_INVITATION_EXPIRY_HOURS,
  PATIENT_INVITATION_TRANSLATION_KEYS,
  buildPatientCreatePayload,
  defaultSendInvitation,
  hasPatientEmail,
  nextSendInvitation,
  resolveInvitationState,
} from './patient-create-invitation';

/**
 * S1 (patient-onboarding) · D2b — opción "enviar invitación por correo" del
 * ALTA de paciente del webapp.
 *
 * El entorno de vitest del webapp es `node`: no hay DOM ni
 * `@testing-library`, así que el render del formulario NO se puede afirmar en
 * runtime. Por eso la lógica vive en un módulo puro
 * (`patient-create-invitation.ts`) y se prueba acá; el wiring del componente
 * se verifica sobre el código fuente real del wizard.
 *
 * Contrato con el servidor (`POST /api/patients/create/api`, D2a):
 *   - `sendInvitation: true` → la cuenta del paciente nace SIN contraseña
 *     utilizable y el paciente define la suya con la invitación por correo;
 *   - `sendInvitation` ausente → comportamiento de siempre.
 *   - un paciente SIN correo con `sendInvitation: true` es rechazado con 400
 *     ("el paciente necesita un correo para recibir la invitación"), así que
 *     el formulario NO puede pedir la invitación sin correo.
 */

const LIB_DIR = path.dirname(fileURLToPath(import.meta.url));

const readRepoFile = (...segments: string[]): string =>
  readFileSync(path.join(LIB_DIR, ...segments), 'utf8');

const esDashboard = JSON.parse(readRepoFile('..', '..', '..', '..', 'i18n', 'es', 'dashboard.json')) as Record<string, any>;
const notEnDashboard = JSON.parse(readRepoFile('..', '..', '..', '..', 'i18n', 'not_en', 'dashboard.json')) as Record<string, any>;

const WIZARD_SOURCE = readRepoFile(
  '..',
  '..',
  '..',
  '..',
  'features',
  'nutringest',
  'consultation',
  'components',
  'ConsultaBolsilloWizard.tsx',
);

/**
 * Réplica de la resolución de `t()` en `src/context/i18n.context.tsx`:
 * `dashboard.patients.invitation.label` → recurso `dashboard` y luego las
 * claves `patients`, `invitation` y `label`. Si la clave no existe devuelve
 * el PATH crudo (que es exactamente el bug que hay que evitar).
 */
const resolveIn = (resource: Record<string, any> | undefined, keyPath: string): string | undefined => {
  if (!resource) return undefined;

  const segments = keyPath.split('.');
  const [fileName, ...keys] = segments;
  // El recurso YA es el archivo de locale (`dashboard.json`): cuando no
  // existe una clave con el nombre del archivo, se navega desde la raíz con
  // las claves que siguen al nombre del archivo.
  const isFileRoot = resource[fileName] === undefined;
  let value: any = isFileRoot ? resource : resource[fileName];

  for (const key of keys) {
    if (value === undefined || value === null || value[key] === undefined) {
      return undefined;
    }
    value = value[key];
  }

  return typeof value === 'string' ? value : undefined;
};

const translate = (language: 'es' | 'not_en', keyPath: string): string => {
  const resource = language === 'es' ? esDashboard : notEnDashboard;
  return resolveIn(resource, keyPath) ?? resolveIn(esDashboard, keyPath) ?? keyPath;
};

describe('alta de paciente — estado de la invitación por correo', () => {
  it('el correo del paciente es el que decide si hay invitación', () => {
    expect(hasPatientEmail('paciente@ejemplo.com')).toBe(true);
    expect(hasPatientEmail('  paciente@ejemplo.com  ')).toBe(true);
    expect(hasPatientEmail('')).toBe(false);
    expect(hasPatientEmail('   ')).toBe(false);
  });

  it('la invitación viene activada por defecto solo si el paciente tiene correo', () => {
    expect(defaultSendInvitation('paciente@ejemplo.com')).toBe(true);
    expect(defaultSendInvitation('')).toBe(false);
  });

  it('con la casilla marcada y correo, la invitación queda habilitada y se envía el flag', () => {
    const state = resolveInvitationState({ email: 'paciente@ejemplo.com', sendInvitation: true });

    expect(state).toEqual({
      hasEmail: true,
      checked: true,
      enabled: true,
      missingEmail: false,
      canSubmit: true,
      sendFlag: true,
    });
  });

  it('con la casilla marcada y SIN correo, la invitación es imposible: se avisa y no se puede enviar', () => {
    const state = resolveInvitationState({ email: '', sendInvitation: true });

    expect(state.missingEmail).toBe(true);
    expect(state.enabled).toBe(false);
    expect(state.sendFlag).toBe(false);
    expect(state.canSubmit).toBe(false);
  });

  it('con la casilla desmarcada no hay invitación aunque el paciente tenga correo', () => {
    const state = resolveInvitationState({ email: 'paciente@ejemplo.com', sendInvitation: false });

    expect(state.checked).toBe(false);
    expect(state.enabled).toBe(false);
    expect(state.sendFlag).toBe(false);
    expect(state.missingEmail).toBe(false);
    expect(state.canSubmit).toBe(true);
  });

  it('mientras el profesional no toque la casilla, sigue al correo; si la toca, manda el profesional', () => {
    expect(nextSendInvitation({ email: 'paciente@ejemplo.com', current: false, touched: false })).toBe(true);
    expect(nextSendInvitation({ email: '', current: true, touched: false })).toBe(false);

    // El profesional desmarcó a propósito: su decisión manda.
    expect(nextSendInvitation({ email: 'paciente@ejemplo.com', current: false, touched: true })).toBe(false);
    expect(nextSendInvitation({ email: '', current: true, touched: true })).toBe(true);
  });
});

describe('alta de paciente — payload del alta', () => {
  const baseForm = {
    firstName: '  Mateo ',
    lastName: '  Rossi ',
    email: '  paciente@ejemplo.com ',
    phone: '  +54 9 11 1234 ',
    birthDate: '1995-05-15',
    gender: 'MALE' as const,
    weight: 72,
    height: 175,
  };

  it('con la invitación activada el payload pide la invitación y conserva la atestación de privacidad', () => {
    const payload = buildPatientCreatePayload({ ...baseForm, sendInvitation: true });

    expect(payload.sendInvitation).toBe(true);
    expect(payload.privacyNoticeAccepted).toBe(true);
    expect(payload.firstName).toBe('Mateo');
    expect(payload.lastName).toBe('Rossi');
    expect(payload.email).toBe('paciente@ejemplo.com');
    expect(payload.phone).toBe('+54 9 11 1234');
    expect(payload.birthDate).toBe('1995-05-15');
    expect(payload.gender).toBe('MALE');
    expect(payload.weight).toBe(72);
    expect(payload.height).toBe(175);
  });

  it('sin la invitación el payload es EXACTAMENTE el de antes: no lleva el flag', () => {
    const payload = buildPatientCreatePayload({ ...baseForm, sendInvitation: false });

    expect('sendInvitation' in payload).toBe(false);
    expect(payload.privacyNoticeAccepted).toBe(true);
  });

  it('con la casilla marcada pero sin correo, el payload NO pide la invitación (el servidor la rechazaría)', () => {
    const payload = buildPatientCreatePayload({ ...baseForm, email: '   ', sendInvitation: true });

    expect('sendInvitation' in payload).toBe(false);
    expect(payload.privacyNoticeAccepted).toBe(true);
  });

  it('sin la invitación el payload es IDÉNTICO al que armaba el código anterior (chequeo diferencial)', () => {
    // Payload tal como lo armaba el wizard antes de D2b (HEAD).
    const legacyPayload = {
      firstName: baseForm.firstName.trim(),
      lastName: baseForm.lastName.trim() || '.',
      email: baseForm.email.trim(),
      phone: baseForm.phone.trim(),
      birthDate: baseForm.birthDate,
      gender: baseForm.gender,
      weight: Number(baseForm.weight),
      height: Number(baseForm.height),
      privacyNoticeAccepted: true,
    };

    expect(buildPatientCreatePayload({ ...baseForm, sendInvitation: false })).toEqual(legacyPayload);
  });
});

describe('alta de paciente — guardián de las claves de i18n', () => {
  const keyPaths = Object.values(PATIENT_INVITATION_TRANSLATION_KEYS);

  it('las claves de la invitación están declaradas en el módulo puro', () => {
    expect(keyPaths.length).toBeGreaterThan(0);
    keyPaths.forEach((key) => expect(key.startsWith('dashboard.patients.invitation.')).toBe(true));
  });

  it('el locale es define todas las claves de la invitación', () => {
    keyPaths.forEach((key) => {
      const value = translate('es', key);
      expect(value).not.toBe(key);
      expect(value.trim().length).toBeGreaterThan(0);
    });
  });

  it('el locale not_en define todas las claves de la invitación', () => {
    keyPaths.forEach((key) => {
      const value = translate('not_en', key);
      expect(value).not.toBe(key);
      expect(value.trim().length).toBeGreaterThan(0);
    });
  });

  it('las tradiciones están realmente traducidas (no copiadas del español)', () => {
    keyPaths.forEach((key) => {
      expect(translate('not_en', key)).not.toBe(translate('es', key));
    });
  });

  it('el plazo de expiración que se anuncia es el de 72 horas', () => {
    expect(PATIENT_INVITATION_EXPIRY_HOURS).toBe(72);
    expect(translate('es', PATIENT_INVITATION_TRANSLATION_KEYS.note)).toContain('72');
  });
});

describe('alta de paciente — wiring del wizard', () => {
  it('el wizard arma el payload con el módulo puro (no a mano)', () => {
    expect(WIZARD_SOURCE).toMatch(/buildPatientCreatePayload\(/);
  });

  it('el wizard usa las claves de i18n del módulo puro (no literales sueltos)', () => {
    expect(WIZARD_SOURCE).toMatch(/PATIENT_INVITATION_TRANSLATION_KEYS/);
    expect(WIZARD_SOURCE).toMatch(/PATIENT_INVITATION_TRANSLATION_KEYS\.label/);
    expect(WIZARD_SOURCE).toMatch(/PATIENT_INVITATION_TRANSLATION_KEYS\.note/);
    expect(WIZARD_SOURCE).toMatch(/PATIENT_INVITATION_TRANSLATION_KEYS\.missingEmail/);
    expect(keyPathsOf(WIZARD_SOURCE)).toEqual([]);
  });

  it('las claves del módulo puro son las de la locale', () => {
    expect(PATIENT_INVITATION_TRANSLATION_KEYS).toEqual({
      label: 'dashboard.patients.invitation.label',
      note: 'dashboard.patients.invitation.note',
      missingEmail: 'dashboard.patients.invitation.missing_email',
    });
  });

  it('el wizard resuelve las etiquetas con el helper de clave obligatoria', () => {
    expect(WIZARD_SOURCE).toMatch(/requireTranslation\(/);
    expect(WIZARD_SOURCE).toMatch(
      /requireTranslation\(\s*t,\s*PATIENT_INVITATION_TRANSLATION_KEYS\.(label|note|missingEmail)/,
    );
  });

  it('el wizard NO usa el patrón muerto t(key) || fallback', () => {
    expect(WIZARD_SOURCE).not.toMatch(/t\(\s*['"]dashboard\.patients\.invitation\.[a-z_]+['"]\s*\)\s*\|\|/);
    expect(WIZARD_SOURCE).not.toMatch(/t\(\s*PATIENT_INVITATION_TRANSLATION_KEYS\.[A-Za-z]+\s*\)\s*\|\|/);
  });

  it('el wizard conserva la atestación de privacidad del Aviso de Privacidad', () => {
    expect(WIZARD_SOURCE).toMatch(/privacyNoticeAccepted/);
  });
});

const keyPathsOf = (source: string): string[] => {
  const matches = source.match(/['"](dashboard\.patients\.invitation\.[a-z_]+)['"]/g) ?? [];
  return Array.from(new Set(matches.map((match) => match.replace(/['"]/g, ''))));
};
