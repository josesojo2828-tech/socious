/**
 * S1 (patient-onboarding) · B1/B2/B3 — lógica pura de la página pública
 * `/patient/invitacion`.
 *
 * Este módulo NO importa React ni toca el DOM: la pantalla lo consume y los
 * tests lo verifican sin DOM (el entorno de vitest del webapp es `node`).
 *
 * Contrato con el servidor (`serverapp/src/modules/patient-invitation`):
 *   - `GET  /api/auth/patient-invitation/status?token=…` →
 *     `{ "status": "valid" | "expired" | "used" | "invalid" }`;
 *   - `POST /api/auth/patient-invitation/accept` con
 *     `{ token, password, confirmPassword }` →
 *     `{ tokens: { access_token, refresh_token }, user }`.
 *
 * La política de contraseñas es la del servidor (`ChangePasswordDto.newPassword`,
 * reutilizada por `PasswordPolicy`): mínimo 8 caracteres, al menos una letra
 * y al menos un número. El esquema del registro (`min(6)`) está
 * desactualizado y NO se replica acá.
 */

/** Los cuatro estados que devuelve el endpoint de estado. */
export type InvitationStatus = 'valid' | 'expired' | 'used' | 'invalid';

export const INVITATION_STATUSES: readonly InvitationStatus[] = ['valid', 'expired', 'used', 'invalid'];

/** Endpoints públicos de la invitación. */
export const INVITATION_STATUS_ENDPOINT = '/api/auth/patient-invitation/status';
export const INVITATION_ACCEPT_ENDPOINT = '/api/auth/patient-invitation/accept';

/**
 * Política de contraseñas del servidor. Las expresiones regulares son las
 * mismas de `ChangePasswordDto` (incluidas las letras acentuadas del
 * español), para que el cliente no acepte lo que el servidor va a rechazar.
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  letterPattern: /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/,
  digitPattern: /\d/,
} as const;

/** Motivos por los que el formulario no se puede enviar. */
export type InvitationFormErrorCode = 'too_short' | 'missing_letter' | 'missing_digit' | 'mismatch';

export interface InvitationFormValidation {
  valid: boolean;
  code?: InvitationFormErrorCode;
}

const VALID: InvitationFormValidation = { valid: true };

/**
 * Valida la contraseña contra la política del servidor.
 * El orden importa: primero longitud, después letra, después número.
 */
export function validatePassword(password: string): InvitationFormValidation {
  const value = typeof password === 'string' ? password : '';

  if (value.length < PASSWORD_POLICY.minLength) {
    return { valid: false, code: 'too_short' };
  }

  if (!PASSWORD_POLICY.letterPattern.test(value)) {
    return { valid: false, code: 'missing_letter' };
  }

  if (!PASSWORD_POLICY.digitPattern.test(value)) {
    return { valid: false, code: 'missing_digit' };
  }

  return VALID;
}

/** Valida que la confirmación sea idéntica a la contraseña. */
export function validateConfirmation(password: string, confirmPassword: string): InvitationFormValidation {
  if (password !== confirmPassword) {
    return { valid: false, code: 'mismatch' };
  }

  return VALID;
}

/**
 * Valida el formulario completo: primero la política de la contraseña y
 * después la coincidencia de la confirmación (el mismo orden del mensaje que
 * ve el paciente).
 */
export function validateInvitationForm(password: string, confirmPassword: string): InvitationFormValidation {
  const policy = validatePassword(password);

  if (!policy.valid) {
    return policy;
  }

  return validateConfirmation(password, confirmPassword);
}

/**
 * Normaliza el estado que devuelve el servidor. Cualquier valor
 * desconocido (incluido un `undefined`) se trata como `invalid`: nunca como
 * `valid`, para no mostrar el formulario ante una respuesta inesperada.
 */
export function parseInvitationStatus(value: unknown): InvitationStatus {
  if (typeof value !== 'string') {
    return 'invalid';
  }

  const status = value.trim();

  return (INVITATION_STATUSES as readonly string[]).includes(status)
    ? (status as InvitationStatus)
    : 'invalid';
}

/** Claves de i18n del título y del mensaje de cada estado. */
export const INVITATION_STATUS_MESSAGE_KEYS: Record<
  InvitationStatus,
  { title: string; message: string }
> = {
  valid: {
    title: 'auth.invitation.valid_title',
    message: 'auth.invitation.valid_message',
  },
  expired: {
    title: 'auth.invitation.expired_title',
    message: 'auth.invitation.expired_message',
  },
  used: {
    title: 'auth.invitation.used_title',
    message: 'auth.invitation.used_message',
  },
  invalid: {
    title: 'auth.invitation.invalid_title',
    message: 'auth.invitation.invalid_message',
  },
};

/** Clave de i18n del mensaje de cada error de validación del formulario. */
export const INVITATION_ERROR_MESSAGE_KEYS: Record<InvitationFormErrorCode, string> = {
  too_short: 'auth.invitation.error_too_short',
  missing_letter: 'auth.invitation.error_missing_letter',
  missing_digit: 'auth.invitation.error_missing_digit',
  mismatch: 'auth.invitation.error_mismatch',
};

/**
 * Todas las claves de i18n que usa la pantalla. La lista es la fuente de
 * verdad para el guardián de locales: si la pantalla usa una clave que no
 * está acá, el test de la página falla.
 */
export const INVITATION_TRANSLATION_KEYS: readonly string[] = [
  'auth.invitation.title',
  'auth.invitation.subtitle',
  'auth.invitation.password_label',
  'auth.invitation.confirm_label',
  'auth.invitation.password_policy',
  'auth.invitation.submit',
  'auth.invitation.submitting',
  'auth.invitation.checking',
  'auth.invitation.accept_error',
  'auth.invitation.success_title',
  'auth.invitation.success_message',
  'auth.invitation.sign_in',
  ...Object.values(INVITATION_ERROR_MESSAGE_KEYS),
  ...Object.values(INVITATION_STATUS_MESSAGE_KEYS).flatMap((entry) => [entry.title, entry.message]),
];

/** Firma de `t()` del contexto de i18n (devuelve `any` en la app). */
export type TranslationFn = (key: string) => unknown;

/**
 * `t()` devuelve el PATH de la clave cuando no la encuentra (ver
 * `src/context/i18n.context.tsx`, paso 5), así que `t(clave) || fallback` es
 * código muerto y el usuario vería el path crudo. Este helper resuelve la
 * clave y, si falta, falla de forma explícita en desarrollo/test y devuelve
 * un texto de último recurso en producción: nunca renderiza un path.
 *
 * Mismo patrón que `src/app/register/page.tsx`.
 */
export function requireTranslation(t: TranslationFn, key: string, fallback: string): string {
  const value = t(key);

  if (typeof value !== 'string' || value.trim() === '' || value === key) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`[i18n] Falta la clave de traducción: "${key}"`);
    }

    console.error(`[i18n] Falta la clave de traducción: "${key}"`);
    return fallback;
  }

  return value;
}

/**
 * Resuelve el título y el mensaje de un estado de la invitación.
 * `translate` debe ser un `t` que devuelve el path crudo cuando la clave
 * no existe: `requireTranslation` lo detecta y falla.
 */
export function resolveInvitationState(
  status: InvitationStatus,
  t: TranslationFn,
): { title: string; message: string } {
  const keys = INVITATION_STATUS_MESSAGE_KEYS[status];

  return {
    title: requireTranslation(t, keys.title, ''),
    message: requireTranslation(t, keys.message, ''),
  };
}
