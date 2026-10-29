/**
 * S1 (patient-onboarding) · D2b — lógica pura de la opción "enviar invitación
 * por correo" del ALTA de paciente del webapp.
 *
 * Este módulo NO importa React ni toca el DOM: el formulario lo consume y los
 * tests lo verifican sin DOM (el entorno de vitest del webapp es `node`).
 *
 * Contrato con el servidor (`POST /api/patients/create/api`, D2a):
 *   - `sendInvitation: true` → la cuenta del paciente nace SIN contraseña
 *     utilizable (`password: null`, `mustChangePassword: true`) y el paciente
 *     define la suya con el enlace de la invitación por correo;
 *   - `sendInvitation` AUSENTE → comportamiento de siempre (la contraseña la
 *     pone el profesional, o la aleatoria que nadie conoce);
 *   - `sendInvitation: true` SIN correo → 400 ("el paciente necesita un
 *     correo para recibir la invitación"). Por eso el formulario NUNCA pide la
 *     invitación sin correo: avisa y no la envía.
 *
 * El plazo de expiración de la invitación (72 h) es el del servidor
 * (`PatientInvitationService`), no una decisión de la UI.
 */

/** Vigencia del enlace de invitación, en horas (la del servidor). */
export const PATIENT_INVITATION_EXPIRY_HOURS = 72;

/** Claves de i18n de la opción de invitación. */
export const PATIENT_INVITATION_TRANSLATION_KEYS = {
  label: 'dashboard.patients.invitation.label',
  note: 'dashboard.patients.invitation.note',
  missingEmail: 'dashboard.patients.invitation.missing_email',
} as const;

/** Estado del formulario de alta con respecto a la invitación. */
export interface PatientInvitationInput {
  /** Correo del paciente (el profesional lo escribe en el formulario). */
  email: string;
  /** Estado de la casilla "Enviar invitación por correo". */
  sendInvitation: boolean;
}

export interface PatientInvitationState {
  /** El paciente tiene correo (hay a quién invitar). */
  hasEmail: boolean;
  /** La casilla está marcada. */
  checked: boolean;
  /** La invitación es posible: marcada Y con correo. */
  enabled: boolean;
  /** Marcada pero sin correo: el servidor la rechazaría. */
  missingEmail: boolean;
  /** El formulario se puede enviar. */
  canSubmit: boolean;
  /** Hay que mandar el flag `sendInvitation` al servidor. */
  sendFlag: boolean;
}

/** ¿El paciente tiene correo? (sin correo no hay a quién invitar). */
export function hasPatientEmail(email: string): boolean {
  return typeof email === 'string' && email.trim() !== '';
}

/**
 * Estado por defecto de la casilla: activada si el paciente tiene correo.
 * Con el correo vacío la casilla queda apagada, porque una invitación sin
 * destinatario no se puede enviar.
 */
export function defaultSendInvitation(email: string): boolean {
  return hasPatientEmail(email);
}

/**
 * Estado efectivo de la invitación a partir del correo y de la casilla.
 *
 * - marcada + correo → habilitada, se manda el flag;
 * - marcada + sin correo → `missingEmail`: hay que avisar y NO se puede
 *   enviar el formulario (el servidor lo rechazaría con 400);
 * - desmarcada → no hay invitación, el alta es la de siempre.
 */
export function resolveInvitationState(input: PatientInvitationInput): PatientInvitationState {
  const hasEmail = hasPatientEmail(input.email);
  const checked = input.sendInvitation === true;
  const missingEmail = checked && !hasEmail;
  const enabled = checked && hasEmail;

  return {
    hasEmail,
    checked,
    enabled,
    missingEmail,
    canSubmit: !missingEmail,
    sendFlag: enabled,
  };
}

/**
 * Siguiente estado de la casilla cuando el profesional escribe el correo.
 *
 * Mientras el profesional NO haya tocado la casilla, esta sigue al correo
 * (se activa sola cuando hay correo). Si la tocó, su decisión manda: no se
 * le cambia la casilla por debajo.
 */
export function nextSendInvitation(args: {
  email: string;
  current: boolean;
  touched: boolean;
}): boolean {
  if (args.touched) {
    return args.current;
  }

  return defaultSendInvitation(args.email);
}

/** Datos que el formulario de alta manda al servidor. */
export interface PatientCreateFormInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  weight: number;
  height: number;
  /** Estado de la casilla "Enviar invitación por correo". */
  sendInvitation: boolean;
}

/**
 * Arma el payload del alta (`POST /api/patients/create/api`).
 *
 * El payload es EXACTAMENTE el de antes, más `sendInvitation: true` cuando la
 * invitación está habilitada. Cuando no lo está, la clave NO viaja: el
 * backend trata "ausente" y "false" igual, y así el alta sin invitación es
 * byte a byte la de siempre.
 *
 * `privacyNoticeAccepted` (S5 legal-compliance) se conserva intacto y sigue
 * siendo obligatorio: es lo que prueba que el paciente recibió y aceptó el
 * Aviso de Privacidad antes de registrar sus datos clínicos.
 */
export function buildPatientCreatePayload(input: PatientCreateFormInput): Record<string, unknown> {
  const state = resolveInvitationState({
    email: input.email,
    sendInvitation: input.sendInvitation,
  });

  const payload: Record<string, unknown> = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim() || '.',
    email: input.email.trim(),
    phone: input.phone.trim(),
    birthDate: input.birthDate,
    gender: input.gender,
    weight: input.weight,
    height: input.height,
    privacyNoticeAccepted: true,
  };

  if (state.sendFlag) {
    payload.sendInvitation = true;
  }

  return payload;
}
