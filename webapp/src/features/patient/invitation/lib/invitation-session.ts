/**
 * S1 (patient-onboarding) · B1 — sesión que se abre al aceptar la
 * invitación.
 *
 * El endpoint `POST /api/auth/patient-invitation/accept` emite los MISMOS
 * tokens que emite el login (`AuthService.getTokens`), así que la pantalla
 * replica el flujo de `useAuthStore.login`:
 *   1. `authStorage.setTokens(access_token, refresh_token)`;
 *   2. el store queda autenticado;
 *   3. `refreshSession()` carga usuario, sidebar y tabs — que es exactamente
 *      lo que hace el login después de recibir los tokens.
 *
 * No se reimplementa ninguna de esas piezas: se reutilizan las del store.
 */

import { authStorage } from '@/shared/lib/auth.storage';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';

export interface InvitationTokens {
  access_token: string;
  refresh_token: string;
}

/** Forma mínima del usuario que devuelve el backend tras aceptar. */
export interface InvitationUser {
  id?: string;
  email?: string;
  permits?: { name?: string } | null;
  subscriptions?: unknown[] | null;
}

/**
 * A dónde aterriza el paciente una vez aceptada la invitación.
 * Replica la lógica del login (`src/app/login/page.tsx`): un paciente va
 * al portal, una cuenta sin suscripciones a la selección de plan.
 */
export function resolveInvitationRedirect(user: InvitationUser | null | undefined): string {
  if (!user) {
    return '/dashboard';
  }

  if (user.permits?.name === 'PATIENT') {
    return '/dashboard';
  }

  if (Array.isArray(user.subscriptions) && user.subscriptions.length === 0) {
    return '/dashboard/subscription';
  }

  return '/dashboard';
}

/**
 * Persiste la sesión emitida por el backend, igual que el login.
 * No propaga el error de la renovación: el paciente ya tiene su contraseña
 * definida y no debe quedar con un error crudo en pantalla.
 */
export async function establishInvitationSession(tokens: InvitationTokens): Promise<void> {
  if (!tokens?.access_token || !tokens?.refresh_token) {
    return;
  }

  authStorage.setTokens(tokens.access_token, tokens.refresh_token);

  useAuthStore.setState({
    isAuthenticated: true,
    isLoading: false,
    error: null,
  });

  try {
    await useAuthStore.getState().refreshSession();
  } catch {
    // La renovación falló: los tokens ya están guardados y el store queda
    // autenticado. El interceptor de `apiClient` se encarga del refresco
    // silencioso en la primera petición autenticada.
  }
}
