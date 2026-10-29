/**
 * S2 (patient-onboarding) · C3 — lógica pura del ALTA de paciente PEDIÁTRICO
 * (webapp, wizard express de `/dashboard/consulta-bolsillo`).
 *
 * Este módulo NO importa React ni toca el DOM: el formulario lo consume y los
 * tests lo verifican sin DOM (el entorno de vitest del webapp es `node`).
 *
 * Contrato con el servidor (`POST /api/patients/create/api`, C2):
 *   - `isPediatric: true` → el alta es de un MENOR: el bloque `representative`
 *     es OBLIGATORIO (`fullName` + `email`; el parentesco lo admite el
 *     servidor en `PADRE | MADRE | TUTOR | OTRO`) y la cuenta que se abre es
 *     la del REPRESENTANTE;
 *   - `isPediatric` AUSENTE → el alta es EXACTAMENTE la de siempre: ni el
 *     flag ni el bloque viajan en el payload.
 *
 * La INVITACIÓN por correo de un menor se envía al correo del REPRESENTANTE
 * (el servidor lo resuelve desde la base, nunca desde el cuerpo de la
 * petición); la de un adulto, al correo del propio paciente.
 */

/** Parentescos admitidos por el servidor para el representante. */
export const REPRESENTATIVE_RELATIONSHIPS = ['PADRE', 'MADRE', 'TUTOR', 'OTRO'] as const;

export type RepresentativeRelationship = (typeof REPRESENTATIVE_RELATIONSHIPS)[number];

/** ¿El valor es un parentesco admitido? (no distingue mayúsculas). */
export function isRepresentativeRelationship(value: string): value is RepresentativeRelationship {
  return (REPRESENTATIVE_RELATIONSHIPS as readonly string[]).includes(
    typeof value === 'string' ? value.trim().toUpperCase() : '',
  );
}

/**
 * Correo válido. Es una comprobación equivalente a la del servidor
 * (`class-validator` `isEmail`): sin espacios, con una arroba y un dominio
 * con punto. El servidor es la autoridad; esta función solo evita mandar un
 * alta que el servidor va a rechazar.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return typeof value === 'string' && EMAIL_PATTERN.test(value.trim());
}

/** Claves de i18n de la pestaña pediátrica. */
export const PEDIATRIC_TRANSLATION_KEYS = {
  generalTab: 'dashboard.patients.pediatric.general_tab',
  pediatricTab: 'dashboard.patients.pediatric.tab',
  switchLabel: 'dashboard.patients.pediatric.switch_label',
  switchHint: 'dashboard.patients.pediatric.switch_hint',
  representativeName: 'dashboard.patients.pediatric.representative_name',
  representativeEmail: 'dashboard.patients.pediatric.representative_email',
  representativePhone: 'dashboard.patients.pediatric.representative_phone',
  representativeRelationship: 'dashboard.patients.pediatric.representative_relationship',
  relationshipPlaceholder: 'dashboard.patients.pediatric.relationship_placeholder',
  patientEmailOptional: 'dashboard.patients.pediatric.patient_email_optional',
  invitationNote: 'dashboard.patients.pediatric.invitation_note',
  invitationMissingEmail: 'dashboard.patients.pediatric.invitation_missing_email',
  relationshipPadre: 'dashboard.patients.pediatric.relationship_padre',
  relationshipMadre: 'dashboard.patients.pediatric.relationship_madre',
  relationshipTutor: 'dashboard.patients.pediatric.relationship_tutor',
  relationshipOtro: 'dashboard.patients.pediatric.relationship_otro',
} as const;

/** Motivos por los que el bloque del representante no es válido. */
export type PediatricErrorCode =
  | 'missing_representative_name'
  | 'missing_representative_email'
  | 'invalid_representative_email'
  | 'missing_relationship'
  | 'invalid_relationship';

/** Clave de i18n del mensaje de cada error de validación. */
export const PEDIATRIC_ERROR_MESSAGE_KEYS: Record<PediatricErrorCode, string> = {
  missing_representative_name: 'dashboard.patients.pediatric.missing_representative_name',
  missing_representative_email: 'dashboard.patients.pediatric.missing_representative_email',
  invalid_representative_email: 'dashboard.patients.pediatric.invalid_representative_email',
  missing_relationship: 'dashboard.patients.pediatric.missing_relationship',
  invalid_relationship: 'dashboard.patients.pediatric.invalid_relationship',
};

/**
 * Errores del alta que NO son del bloque pediátrico.
 *
 * El peso y la talla los valida el navegador (`required` + `min`/`max`) en la
 * pestaña general; cuando la pestaña activa es la pediátrica esos campos no
 * están en el DOM, así que el formulario los comprueba a mano.
 */
export const PATIENT_CREATE_ERROR_MESSAGE_KEYS = {
  missingMeasurements: 'dashboard.patients.form.missing_measurements',
} as const;

/** ¿El peso y la talla son utilizables para el primer registro antropométrico? */
export function hasValidMeasurements(weight: number, height: number): boolean {
  return (
    Number.isFinite(weight) &&
    Number.isFinite(height) &&
    weight > 0 &&
    height > 0
  );
}

/** Datos del representante que escribe el profesional. */
export interface RepresentativeFormInput {
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
}

/** Datos del formulario de alta con respecto al paciente pediátrico. */
export interface PediatricFormInput {
  /** Estado del interruptor "Es paciente pediátrico". */
  isPediatric: boolean;
  /** Correo del propio paciente (opcional cuando es menor). */
  patientEmail: string;
  /** Datos del representante. */
  representative: RepresentativeFormInput;
}

export interface RepresentativeValidation {
  valid: boolean;
  errors: PediatricErrorCode[];
  missingName: boolean;
  missingEmail: boolean;
  invalidEmail: boolean;
  missingRelationship: boolean;
  invalidRelationship: boolean;
}

/**
 * Valida el bloque del representante.
 *
 * El servidor exige `fullName` y `email` (si no, 400 ANTES de escribir nada);
 * el parentesco lo admite en la lista cerrada y el teléfono es opcional.
 */
export function validateRepresentative(input: RepresentativeFormInput): RepresentativeValidation {
  const fullName = typeof input?.fullName === 'string' ? input.fullName.trim() : '';
  const email = typeof input?.email === 'string' ? input.email.trim() : '';
  const relationship = typeof input?.relationship === 'string' ? input.relationship.trim() : '';

  const missingName = fullName === '';
  const missingEmail = email === '';
  const invalidEmail = !missingEmail && !isValidEmail(email);
  const missingRelationship = relationship === '';
  const invalidRelationship = !missingRelationship && !isRepresentativeRelationship(relationship);

  const errors: PediatricErrorCode[] = [];
  if (missingName) errors.push('missing_representative_name');
  if (missingEmail) errors.push('missing_representative_email');
  else if (invalidEmail) errors.push('invalid_representative_email');
  if (missingRelationship) errors.push('missing_relationship');
  else if (invalidRelationship) errors.push('invalid_relationship');

  return {
    valid: errors.length === 0,
    errors,
    missingName,
    missingEmail,
    invalidEmail,
    missingRelationship,
    invalidRelationship,
  };
}

/** A quién va la invitación por correo. */
export type InvitationRecipient = 'patient' | 'representative';

export interface PediatricState {
  isPediatric: boolean;
  /** El correo del PROPIO paciente es obligatorio (adulto). */
  patientEmailRequired: boolean;
  /** El correo del PROPIO paciente es opcional (menor: usa el del representante). */
  patientEmailOptional: boolean;
  /** Falta el correo del paciente en un alta de adulto. */
  missingPatientEmail: boolean;
  /** El bloque del representante es válido (o no aplica). */
  representativeValid: boolean;
  /** Errores del bloque del representante. */
  validation: RepresentativeValidation;
  /** El formulario se puede enviar. */
  canSubmit: boolean;
  /** Quién recibe la invitación por correo. */
  invitationRecipient: InvitationRecipient;
  /** A qué correo va la invitación por correo. */
  invitationEmail: string;
}

/**
 * Estado del alta con respecto al paciente pediátrico.
 *
 * Con el interruptor apagado, el alta es la de siempre: el correo del
 * paciente es obligatorio y la invitación (si se pide) va a su correo.
 */
export function resolvePediatricState(input: PediatricFormInput): PediatricState {
  const isPediatric = input?.isPediatric === true;
  const patientEmail = typeof input?.patientEmail === 'string' ? input.patientEmail.trim() : '';
  const representativeEmail =
    typeof input?.representative?.email === 'string' ? input.representative.email.trim() : '';

  const validation = validateRepresentative(input?.representative ?? {
    fullName: '',
    email: '',
    phone: '',
    relationship: '',
  });

  const missingPatientEmail = !isPediatric && patientEmail === '';
  const representativeValid = isPediatric ? validation.valid : true;

  return {
    isPediatric,
    patientEmailRequired: !isPediatric,
    patientEmailOptional: isPediatric,
    missingPatientEmail,
    representativeValid,
    validation,
    canSubmit: !missingPatientEmail && representativeValid,
    invitationRecipient: isPediatric ? 'representative' : 'patient',
    invitationEmail: isPediatric ? representativeEmail : patientEmail,
  };
}

/** Normaliza el bloque del representante tal como lo espera el servidor. */
export function buildRepresentativePayload(input: RepresentativeFormInput): {
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
} {
  return {
    fullName: typeof input?.fullName === 'string' ? input.fullName.trim() : '',
    email: typeof input?.email === 'string' ? input.email.trim() : '',
    phone: typeof input?.phone === 'string' ? input.phone.trim() : '',
    relationship:
      typeof input?.relationship === 'string' ? input.relationship.trim().toUpperCase() : '',
  };
}

/**
 * Agrega el bloque pediátrico al payload del alta.
 *
 * Con el interruptor APAGADO devuelve el payload TAL COMO LLEGÓ (el mismo
 * objeto): el alta es byte a byte la de antes, sin `isPediatric` ni
 * `representative`.
 *
 * Con el interruptor ENCENDIDO agrega `isPediatric: true` y el bloque
 * `representative`. Si el representante no es válido, FALLA: mandar un alta
 * de adulto cuando el profesional marcó "pediátrico" sería un alta
 * silenciosamente equivocada (la cuenta sería la del menor... no: la del
 * paciente), así que es preferible que el formulario lo impida antes.
 */
export function applyPediatricToPayload(
  payload: Record<string, unknown>,
  input: PediatricFormInput,
): Record<string, unknown> {
  if (input?.isPediatric !== true) {
    return payload;
  }

  const validation = validateRepresentative(input?.representative ?? {
    fullName: '',
    email: '',
    phone: '',
    relationship: '',
  });

  if (!validation.valid) {
    throw new Error(
      `[patient-create] El bloque del representante es inválido: ${validation.errors.join(', ')}.`,
    );
  }

  return {
    ...payload,
    isPediatric: true,
    representative: buildRepresentativePayload(input.representative),
  };
}
