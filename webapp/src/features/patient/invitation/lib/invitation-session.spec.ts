import { beforeEach, describe, expect, it, vi } from 'vitest';

const setTokens = vi.fn();
const clearTokens = vi.fn();
const setState = vi.fn();
const getState = vi.fn();

vi.mock('@/shared/lib/auth.storage', () => ({
  authStorage: {
    setTokens: (...args: unknown[]) => setTokens(...args),
    clearTokens: (...args: unknown[]) => clearTokens(...args),
    getAccessToken: () => null,
    getRefreshToken: () => null,
  },
}));

vi.mock('@/shared/store/auth/useAuthStore', () => ({
  useAuthStore: {
    getState: (...args: unknown[]) => getState(...args),
    setState: (...args: unknown[]) => setState(...args),
  },
}));

import {
  establishInvitationSession,
  resolveInvitationRedirect,
} from './invitation-session';

/**
 * S1 (patient-onboarding) · B1 — la sesión que se abre al aceptar la
 * invitación.
 *
 * El login (`useAuthStore.login`) persiste los tokens con `authStorage` y
 * deja el store con `user`, `isAuthenticated`, `sidebar` y `tabs`. La
 * invitación devuelve los tokens ya emitidos por el servidor, así que la
 * pantalla replica ese mismo flujo: mismos tokens, mismo store, misma
 * renovación de sesión (`refreshSession`).
 */

const refreshSession = vi.fn();

describe('establishInvitationSession — misma persistencia que el login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshSession.mockResolvedValue(undefined);
    getState.mockReturnValue({ refreshSession });
  });

  it('persiste los tokens emitidos por el servidor', async () => {
    await establishInvitationSession({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });

    expect(setTokens).toHaveBeenCalledTimes(1);
    expect(setTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
  });

  it('deja el store autenticado', async () => {
    await establishInvitationSession({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });

    expect(setState).toHaveBeenCalledTimes(1);
    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({ isAuthenticated: true, isLoading: false, error: null }),
    );
  });

  it('renueva la sesión (usuario, sidebar y tabs) como hace el login', async () => {
    await establishInvitationSession({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });

    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('no tira la sesión si la renovación falla (el paciente igual puede entrar)', async () => {
    refreshSession.mockRejectedValue(new Error('network'));

    await expect(
      establishInvitationSession({ access_token: 'a', refresh_token: 'r' }),
    ).resolves.toBeUndefined();

    expect(setTokens).toHaveBeenCalledTimes(1);
  });

  it('no persiste tokens vacíos', async () => {
    await establishInvitationSession({ access_token: '', refresh_token: '' });

    expect(setTokens).not.toHaveBeenCalled();
  });
});

describe('resolveInvitationRedirect — a dónde aterriza el paciente', () => {
  it('un paciente va al portal (/dashboard)', () => {
    expect(resolveInvitationRedirect({ permits: { name: 'PATIENT' } } as any)).toBe('/dashboard');
  });

  it('sin sesión resuelta también se va al portal, nunca a un path crudo', () => {
    expect(resolveInvitationRedirect(null)).toBe('/dashboard');
    expect(resolveInvitationRedirect(undefined)).toBe('/dashboard');
  });

  it('una cuenta sin suscripciones va a la selección de plan (como el login)', () => {
    expect(resolveInvitationRedirect({ subscriptions: [] } as any)).toBe('/dashboard/subscription');
  });

  it('una cuenta con suscripciones va al dashboard (como el login)', () => {
    expect(resolveInvitationRedirect({ subscriptions: [{ id: '1' }] } as any)).toBe('/dashboard');
  });
});
