import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PATIENT_CREATE_ERROR_MESSAGE_KEYS,
  PEDIATRIC_ERROR_MESSAGE_KEYS,
  PEDIATRIC_TRANSLATION_KEYS,
  REPRESENTATIVE_RELATIONSHIPS,
  applyPediatricToPayload,
  buildRepresentativePayload,
  hasValidMeasurements,
  isRepresentativeRelationship,
  resolvePediatricState,
  validateRepresentative,
} from './pediatric-patient';
import { buildPatientCreatePayload } from './patient-create-invitation';

/**
 * S2 (patient-onboarding) · C3 — alta de PACIENTE PEDIÁTRICO con
 * REPRESENTANTE (webapp, wizard express de `/dashboard/consulta-bolsillo`).
 *
 * El entorno de vitest del webapp es `node`: no hay DOM ni
 * `@testing-library`, así que el render del formulario NO se puede afirmar en
 * runtime. Por eso la lógica vive en un módulo puro
 * (`pediatric-patient.ts`) y se prueba acá; el wiring del componente se
 * verifica sobre el código fuente real del wizard.
 *
 * Contrato con el servidor (`POST /api/patients/create/api`, C2):
 *   - `isPediatric: true` → el alta es de un MENOR: el bloque `representative`
 *     es OBLIGATORIO (`fullName` + `email`) y la cuenta que se abre es la del
 *     REPRESENTANTE;
 *   - `isPediatric` AUSENTE → el alta es EXACTAMENTE la de siempre.
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
 * Resolución de la clave dentro del archivo de locale, SIN el fallback al
 * español: así una clave que falta en `not_en` rompe el test (con el fallback
 * de `t()` la clave faltante se.camufla con el español).
 */
const resolveIn = (resource: Record<string, any> | undefined, keyPath: string): string | undefined => {
  if (!resource) return undefined;

  const segments = keyPath.split('.');
  const [fileName, ...keys] = segments;
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

const BASE_FORM = {
  firstName: '  Mateo ',
  lastName: '  Rossi ',
  email: '  paciente@ejemplo.com ',
  phone: '  +54 9 11 1234 ',
  birthDate: '1995-05-15',
  gender: 'MALE' as const,
  weight: 72,
  height: 175,
};

const REPRESENTATIVE = {
  fullName: '  María Pérez ',
  email: '  maria@ejemplo.com ',
  phone: '  +58 412 1234567 ',
  relationship: 'MADRE',
};

const pediatricInput = (overrides: Partial<{ isPediatric: boolean; patientEmail: string; representative: typeof REPRESENTATIVE }> = {}) => ({
  isPediatric: overrides.isPediatric ?? true,
  patientEmail: overrides.patientEmail ?? 'paciente@ejemplo.com',
  representative: overrides.representative ?? REPRESENTATIVE,
});

describe('alta de paciente — parentescos del representante', () => {
  it('los parentescos admitidos son exactamente PADRE, MADRE, TUTOR y OTRO', () => {
    expect([...REPRESENTATIVE_RELATIONSHIPS]).toEqual(['PADRE', 'MADRE', 'TUTOR', 'OTRO']);
  });

  it('el parentesco se reconoce sin distinguir mayúsculas y se rechazan los demás', () => {
    expect(isRepresentativeRelationship('PADRE')).toBe(true);
    expect(isRepresentativeRelationship('madre')).toBe(true);
    expect(isRepresentativeRelationship(' Tutor ')).toBe(true);
    expect(isRepresentativeRelationship('OTRO')).toBe(true);
    expect(isRepresentativeRelationship('ABUELO')).toBe(false);
    expect(isRepresentativeRelationship('')).toBe(false);
  });
});

describe('alta de paciente — estado del bloque pediátrico', () => {
  it('con el interruptor apagado el alta es la de siempre: el correo del paciente es obligatorio', () => {
    const state = resolvePediatricState(pediatricInput({ isPediatric: false }));

    expect(state.isPediatric).toBe(false);
    expect(state.patientEmailRequired).toBe(true);
    expect(state.patientEmailOptional).toBe(false);
    expect(state.representativeValid).toBe(true);
    expect(state.invitationRecipient).toBe('patient');
    expect(state.invitationEmail).toBe('paciente@ejemplo.com');
    expect(state.canSubmit).toBe(true);
  });

  it('con el interruptor encendido el correo del paciente es opcional y la invitación va al representante', () => {
    const state = resolvePediatricState(pediatricInput());

    expect(state.isPediatric).toBe(true);
    expect(state.patientEmailRequired).toBe(false);
    expect(state.patientEmailOptional).toBe(true);
    expect(state.representativeValid).toBe(true);
    expect(state.invitationRecipient).toBe('representative');
    expect(state.invitationEmail).toBe('maria@ejemplo.com');
    expect(state.canSubmit).toBe(true);
  });

  it('con el interruptor encendido y sin correo del paciente, el alta sigue siendo válida', () => {
    const state = resolvePediatricState(pediatricInput({ patientEmail: '   ' }));

    expect(state.canSubmit).toBe(true);
    expect(state.patientEmailRequired).toBe(false);
    expect(state.missingPatientEmail).toBe(false);
  });

  it('un adulto sin correo NO se puede registrar (el servidor lo necesita)', () => {
    const state = resolvePediatricState(pediatricInput({ isPediatric: false, patientEmail: '  ' }));

    expect(state.missingPatientEmail).toBe(true);
    expect(state.canSubmit).toBe(false);
  });
});

describe('alta de paciente — validación del representante', () => {
  it('un representante completo es válido', () => {
    const validation = validateRepresentative(REPRESENTATIVE);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('sin nombre del representante el alta es inválida', () => {
    const validation = validateRepresentative({ ...REPRESENTATIVE, fullName: '   ' });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('missing_representative_name');
    expect(validation.missingName).toBe(true);
  });

  it('sin correo del representante el alta es inválida', () => {
    const validation = validateRepresentative({ ...REPRESENTATIVE, email: '  ' });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('missing_representative_email');
    expect(validation.missingEmail).toBe(true);
  });

  it('con un correo mal formado el alta es inválida (el servidor lo rechazaría)', () => {
    const validation = validateRepresentative({ ...REPRESENTATIVE, email: 'no-es-un-correo' });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('invalid_representative_email');
    expect(validation.invalidEmail).toBe(true);
  });

  it('sin parentesco el alta es inválida', () => {
    const validation = validateRepresentative({ ...REPRESENTATIVE, relationship: '  ' });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('missing_relationship');
    expect(validation.missingRelationship).toBe(true);
  });

  it('con un parentesco fuera de la lista el alta es inválida', () => {
    const validation = validateRepresentative({ ...REPRESENTATIVE, relationship: 'ABUELO' });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('invalid_relationship');
    expect(validation.invalidRelationship).toBe(true);
  });

  it('el teléfono es opcional: sin teléfono el representante sigue siendo válido', () => {
    const validation = validateRepresentative({ ...REPRESENTATIVE, phone: '   ' });

    expect(validation.valid).toBe(true);
  });

  it('el bloque del representante se arma normalizado (sin espacios sobrantes)', () => {
    expect(buildRepresentativePayload(REPRESENTATIVE)).toEqual({
      fullName: 'María Pérez',
      email: 'maria@ejemplo.com',
      phone: '+58 412 1234567',
      relationship: 'MADRE',
    });
  });
});

describe('alta de paciente — payload del alta pediátrica', () => {
  it('con el interruptor apagado el payload es IDÉNTICO byte a byte al de antes', () => {
    const basePayload = buildPatientCreatePayload({ ...BASE_FORM, sendInvitation: false });

    const payload = applyPediatricToPayload(basePayload, pediatricInput({ isPediatric: false }));

    // Mismo objeto: ni una clave de más, ni un byte de diferencia.
    expect(payload).toBe(basePayload);
    expect(JSON.stringify(payload)).toBe(
      JSON.stringify({
        firstName: 'Mateo',
        lastName: 'Rossi',
        email: 'paciente@ejemplo.com',
        phone: '+54 9 11 1234',
        birthDate: '1995-05-15',
        gender: 'MALE',
        weight: 72,
        height: 175,
        privacyNoticeAccepted: true,
      }),
    );
  });

  it('con el interruptor apagado el payload NO lleva isPediatric ni representative', () => {
    const payload = applyPediatricToPayload(
      buildPatientCreatePayload({ ...BASE_FORM, sendInvitation: false }),
      pediatricInput({ isPediatric: false }),
    );

    expect('isPediatric' in payload).toBe(false);
    expect('representative' in payload).toBe(false);
  });

  it('con el interruptor encendido el payload lleva isPediatric y el bloque del representante', () => {
    const payload = applyPediatricToPayload(
      buildPatientCreatePayload({ ...BASE_FORM, email: '   ', sendInvitation: false }),
      pediatricInput({ patientEmail: '   ' }),
    );

    expect(payload.isPediatric).toBe(true);
    expect(payload.representative).toEqual({
      fullName: 'María Pérez',
      email: 'maria@ejemplo.com',
      phone: '+58 412 1234567',
      relationship: 'MADRE',
    });
    // El resto del payload no cambia.
    expect(payload.privacyNoticeAccepted).toBe(true);
    expect(payload.firstName).toBe('Mateo');
  });

  it('el payload pediátrico conserva la atestación de privacidad y el resto del alta', () => {
    const payload = applyPediatricToPayload(
      buildPatientCreatePayload({ ...BASE_FORM, sendInvitation: true }),
      pediatricInput(),
    );

    expect(payload.privacyNoticeAccepted).toBe(true);
    expect(payload.sendInvitation).toBe(true);
    expect(payload.email).toBe('paciente@ejemplo.com');
  });

  it('un representante inválido NO se manda: el módulo falla en vez de enviar un alta de adulto', () => {
    expect(() =>
      applyPediatricToPayload(
        buildPatientCreatePayload({ ...BASE_FORM, sendInvitation: false }),
        pediatricInput({ representative: { ...REPRESENTATIVE, fullName: '  ' } }),
      ),
    ).toThrow();
  });
});

describe('alta de paciente — peso y talla utilizables', () => {
  it('un peso y una talla válidos pasan el control', () => {
    expect(hasValidMeasurements(72, 175)).toBe(true);
    expect(hasValidMeasurements(0.5, 50)).toBe(true);
  });

  it('sin peso o sin talla (o con valores no numéricos) el control falla', () => {
    expect(hasValidMeasurements(Number.NaN, 175)).toBe(false);
    expect(hasValidMeasurements(72, Number.NaN)).toBe(false);
    expect(hasValidMeasurements(0, 175)).toBe(false);
    expect(hasValidMeasurements(72, 0)).toBe(false);
  });
});

describe('alta de paciente — guardián de las claves de i18n', () => {
  const keyPaths = [
    ...Object.values(PEDIATRIC_TRANSLATION_KEYS),
    ...Object.values(PEDIATRIC_ERROR_MESSAGE_KEYS),
    ...Object.values(PATIENT_CREATE_ERROR_MESSAGE_KEYS),
  ];

  it('las claves pediatricas están declaradas en el módulo puro', () => {
    expect(keyPaths.length).toBeGreaterThan(0);
    [...Object.values(PEDIATRIC_TRANSLATION_KEYS), ...Object.values(PEDIATRIC_ERROR_MESSAGE_KEYS)].forEach(
      (key) => expect(key.startsWith('dashboard.patients.pediatric.')).toBe(true),
    );
    expect(PATIENT_CREATE_ERROR_MESSAGE_KEYS.missingMeasurements).toBe(
      'dashboard.patients.form.missing_measurements',
    );
  });

  it('el locale es define TODAS las claves pediatricas', () => {
    keyPaths.forEach((key) => {
      const value = resolveIn(esDashboard, key);
      expect(value, `falta la clave ${key} en es`).toBeDefined();
      expect(value!.trim().length).toBeGreaterThan(0);
    });
  });

  it('el locale not_en define TODAS las claves pediatricas', () => {
    keyPaths.forEach((key) => {
      const value = resolveIn(notEnDashboard, key);
      expect(value, `falta la clave ${key} en not_en`).toBeDefined();
      expect(value!.trim().length).toBeGreaterThan(0);
    });
  });

  it('las tradiciones están realmente traducidas (no copiadas del español)', () => {
    keyPaths.forEach((key) => {
      expect(resolveIn(notEnDashboard, key)).not.toBe(resolveIn(esDashboard, key));
    });
  });
});

describe('alta de paciente — wiring del wizard (pediátrico)', () => {
  it('el wizard usa el módulo puro (no arma el payload a mano)', () => {
    expect(WIZARD_SOURCE).toMatch(/resolvePediatricState\(/);
    expect(WIZARD_SOURCE).toMatch(/applyPediatricToPayload\(/);
    expect(WIZARD_SOURCE).toMatch(/PEDIATRIC_TRANSLATION_KEYS/);
  });

  it('el wizard usa el componente de pestañas existente para la pestaña Pediátrico', () => {
    expect(WIZARD_SOURCE).toMatch(/from ['"]@\/shared\/components\/organisms\/Tabs\/Tabs['"]/);
    expect(WIZARD_SOURCE).toMatch(/<Tabs\b/);
    expect(WIZARD_SOURCE).toMatch(/PEDIATRIC_TRANSLATION_KEYS\.pediatricTab/);
  });

  it('el wizard resuelve las etiquetas pediatricas con requireTranslation (nunca t(key) || fallback)', () => {
    expect(WIZARD_SOURCE).toMatch(
      /requireTranslation\(\s*t,\s*PEDIATRIC_TRANSLATION_KEYS\.(generalTab|pediatricTab|switchLabel|switchHint|representativeName|representativeEmail|representativePhone|representativeRelationship|patientEmailOptional|invitationNote|invitationMissingEmail)/,
    );
    expect(WIZARD_SOURCE).not.toMatch(/t\(\s*PEDIATRIC_TRANSLATION_KEYS\.[A-Za-z]+\s*\)\s*\|\|/);
    expect(WIZARD_SOURCE).not.toMatch(/t\(\s*['"]dashboard\.patients\.pediatric\.[a-z_]+['"]\s*\)\s*\|\|/);
  });

  it('el wizard NO escribe a mano las claves de i18n pediatricas', () => {
    const matches = WIZARD_SOURCE.match(/['"]dashboard\.patients\.pediatric\.[a-z_]+['"]/g) ?? [];
    expect(Array.from(new Set(matches))).toEqual([]);
  });

  it('el wizard conserva la atestación del Aviso de Privacidad', () => {
    expect(WIZARD_SOURCE).toMatch(/privacyNoticeAccepted/);
    expect(WIZARD_SOURCE).toMatch(/required\s*[\n\r]*\s*checked=\{privacyNoticeAccepted\}/);
  });

  it('el wizard manda el payload con el módulo puro y el resto del alta no cambia', () => {
    expect(WIZARD_SOURCE).toMatch(/buildPatientCreatePayload\(/);
    expect(WIZARD_SOURCE).toMatch(/applyPediatricToPayload\(\s*buildPatientCreatePayload\(/);
  });
});
