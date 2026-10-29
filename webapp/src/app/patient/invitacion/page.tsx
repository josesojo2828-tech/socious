'use client';

/**
 * S1 (patient-onboarding) · B1/B2 — página PÚBLICA `/patient/invitacion`.
 *
 * El paciente (o el representante de un menor) recibe un correo con un enlace
 * a esta página y define ahí su propia contraseña. La ruta es pública: no
 * hace falta sesión para abrirla.
 *
 * Flujo:
 *   1. se lee `?token=…` de la query string (el token NUNCA se muestra en el
 *      texto de la página ni se escribe en la consola);
 *   2. `GET /api/auth/patient-invitation/status` devuelve el estado:
 *      `valid` | `expired` | `used` | `invalid`;
 *   3. con `valid` se muestra el formulario (contraseña + confirmación) con
 *      la MISMA política que exige el servidor (8+, una letra, un número);
 *   4. `POST /api/auth/patient-invitation/accept` define la contraseña y
 *      emite la sesión: se persiste EXACTAMENTE como el login.
 *
 * La lógica vive en `src/features/patient/invitation/lib/` (módulo puro) y
 * se prueba con vitest: el entorno de vitest del webapp es `node` y no hay
 * DOM para renderizar el componente.
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';

import { Navbar } from '@/features/public/components/Navbar';
import { Footer } from '@/features/public/components/Footer';
import { apiClient } from '@/shared/api/api.client';
import { useTranslation } from '@/context/i18n.context';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import {
  INVITATION_ACCEPT_ENDPOINT,
  INVITATION_ERROR_MESSAGE_KEYS,
  INVITATION_STATUS_ENDPOINT,
  type InvitationFormErrorCode,
  type InvitationStatus,
  parseInvitationStatus,
  requireTranslation,
  resolveInvitationState,
  validateInvitationForm,
} from '@/features/patient/invitation/lib/invitation-form';
import {
  establishInvitationSession,
  resolveInvitationRedirect,
} from '@/features/patient/invitation/lib/invitation-session';

/**
 * Último recurso cuando falta una clave de traducción. `t()` devuelve el
 * PATH de la clave cuando no la encuentra, así que `t(clave) || fallback`
 * sería código muerto y el paciente vería `auth.invitation.title`. El helper
 * `requireTranslation` falla de forma explícita en desarrollo/test y sólo
 * recurre a estos textos en producción.
 */
const FALLBACKS: Record<string, { es: string; not_en: string }> = {
  'auth.invitation.title': {
    es: 'Crea tu contraseña',
    not_en: 'Create your password',
  },
  'auth.invitation.subtitle': {
    es: 'Definí la contraseña de tu cuenta para acceder a tu portal de paciente.',
    not_en: 'Set the password of your account to access your patient portal.',
  },
  'auth.invitation.password_label': {
    es: 'Contraseña',
    not_en: 'Password',
  },
  'auth.invitation.confirm_label': {
    es: 'Confirmar contraseña',
    not_en: 'Confirm password',
  },
  'auth.invitation.password_policy': {
    es: 'Mínimo 8 caracteres, al menos una letra y al menos un número.',
    not_en: 'At least 8 characters, including one letter and one number.',
  },
  'auth.invitation.error_too_short': {
    es: 'La contraseña debe tener al menos 8 caracteres.',
    not_en: 'The password must have at least 8 characters.',
  },
  'auth.invitation.error_missing_letter': {
    es: 'La contraseña debe contener al menos una letra.',
    not_en: 'The password must contain at least one letter.',
  },
  'auth.invitation.error_missing_digit': {
    es: 'La contraseña debe contener al menos un número.',
    not_en: 'The password must contain at least one number.',
  },
  'auth.invitation.error_mismatch': {
    es: 'Las contraseñas no coinciden.',
    not_en: 'The passwords do not match.',
  },
  'auth.invitation.submit': {
    es: 'Crear mi contraseña',
    not_en: 'Create my password',
  },
  'auth.invitation.submitting': {
    es: 'Creando tu contraseña...',
    not_en: 'Creating your password...',
  },
  'auth.invitation.checking': {
    es: 'Verificando la invitación...',
    not_en: 'Checking the invitation...',
  },
  'auth.invitation.accept_error': {
    es: 'No pudimos completar la invitación. La invitación no es válida, expiró o ya fue utilizada.',
    not_en:
      'We could not complete the invitation. The invitation is not valid, it expired, or it was already used.',
  },
  'auth.invitation.valid_title': {
    es: 'Invitación válida',
    not_en: 'Valid invitation',
  },
  'auth.invitation.valid_message': {
    es: 'Definí tu contraseña para activar el acceso a tu portal de paciente.',
    not_en: 'Set your password to activate access to your patient portal.',
  },
  'auth.invitation.expired_title': {
    es: 'La invitación expiró',
    not_en: 'The invitation expired',
  },
  'auth.invitation.expired_message': {
    es: 'El plazo de esta invitación venció. Pídele una nueva al profesional que te atiende.',
    not_en: 'This invitation is no longer valid. Ask your nutritionist for a new one.',
  },
  'auth.invitation.used_title': {
    es: 'La invitación ya fue utilizada',
    not_en: 'The invitation was already used',
  },
  'auth.invitation.used_message': {
    es: 'Esta invitación ya se usó para crear una contraseña. Si no fuste tú, pídele una nueva al profesional que te atiende.',
    not_en:
      'This invitation was already used to create a password. If this was not you, ask your nutritionist for a new one.',
  },
  'auth.invitation.invalid_title': {
    es: 'Invitación no válida',
    not_en: 'Invalid invitation',
  },
  'auth.invitation.invalid_message': {
    es: 'El enlace de invitación no es válido. Pídele uno nuevo al profesional que te atiende.',
    not_en: 'The invitation link is not valid. Ask your nutritionist for a new one.',
  },
  'auth.invitation.success_title': {
    es: '¡Cuenta activada!',
    not_en: 'Account activated!',
  },
  'auth.invitation.success_message': {
    es: 'Tu contraseña fue creada correctamente. Redirigiendo a tu portal...',
    not_en: 'Your password was created successfully. Redirecting to your portal...',
  },
  'auth.invitation.sign_in': {
    es: 'Ir al inicio de sesión',
    not_en: 'Go to sign in',
  },
};

function InvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useTranslation();

  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<InvitationStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorCode, setErrorCode] = useState<InvitationFormErrorCode | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  /** Resuelve una clave de i18n sin poder renderizar el path crudo. */
  const tr = (key: string): string => {
    const fallback = FALLBACKS[key];
    return requireTranslation(t, key, language === 'not_en' ? fallback?.not_en ?? '' : fallback?.es ?? '');
  };

  // Estado de la invitación. Un token ausente o una respuesta inesperada se
  // tratan como invitación inválida: NUNCA se muestra el formulario.
  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setStatus('invalid');
      setChecking(false);
      return;
    }

    setChecking(true);

    apiClient
      .get(INVITATION_STATUS_ENDPOINT, { params: { token } })
      .then((res) => {
        if (cancelled) return;
        setStatus(parseInvitationStatus(res?.data?.status));
      })
      .catch(() => {
        // No se registra el error crudo: el objeto de axios contiene la URL
        // con el token de la invitación.
        if (cancelled) return;
        setStatus('invalid');
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateInvitationForm(password, confirmPassword);

    if (!validation.valid && validation.code) {
      setErrorCode(validation.code);
      setSubmitError(null);
      return;
    }

    setErrorCode(null);
    setSubmitError(null);
    setSubmitting(true);

    try {
      const { data } = await apiClient.post(INVITATION_ACCEPT_ENDPOINT, {
        token,
        password,
        confirmPassword,
      });

      await establishInvitationSession(data?.tokens);

      setDone(true);

      const { user } = useAuthStore.getState();
      const redirect = resolveInvitationRedirect(user);

      setTimeout(() => router.push(redirect), 900);
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { message?: unknown } } })?.response;
      const serverMessage = response?.data?.message;

      if (response?.status === 400 && serverMessage === 'Las contraseñas no coinciden') {
        setErrorCode('mismatch');
      } else {
        // Token inválido, expirado, usado o revocado (403) y cualquier otro
        // fallo: se muestra el mensaje genérico, nunca el error del servidor.
        setSubmitError(tr('auth.invitation.accept_error'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const stateMessage = status ? resolveInvitationState(status, t) : null;

  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content font-sans antialiased selection:bg-primary/20">
      <Navbar />

      <main className="flex-grow flex items-center justify-center px-6 py-16 sm:py-24">
        <div className="w-full max-w-md space-y-8">
          {checking ? (
            <div className="flex flex-col items-center gap-4 text-base-content/60">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm font-medium">{tr('auth.invitation.checking')}</p>
            </div>
          ) : done ? (
            <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-400">
              <div className="mx-auto w-20 h-20 bg-success/10 border border-success/20 rounded-full flex items-center justify-center text-success shadow-inner">
                <CheckCircle2 size={44} />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-base-content">
                  {tr('auth.invitation.success_title')}
                </h1>
                <p className="text-sm text-base-content/60 font-medium">
                  {tr('auth.invitation.success_message')}
                </p>
              </div>
            </div>
          ) : status === 'valid' ? (
            <>
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-2">
                  <ShieldCheck size={14} />
                  <span>{tr('auth.invitation.valid_title')}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-base-content">
                  {tr('auth.invitation.title')}
                </h1>
                <p className="text-sm text-base-content/60 font-medium leading-relaxed">
                  {tr('auth.invitation.subtitle')}
                </p>
              </div>

              {submitError && (
                <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-sm font-semibold flex items-center gap-3">
                  <AlertCircle size={20} className="shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="invitation-password"
                    className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1 block"
                  >
                    {tr('auth.invitation.password_label')}
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
                      <Lock size={20} />
                    </div>
                    <input
                      id="invitation-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full pl-11 pr-12 py-3.5 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium disabled:opacity-50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors p-1 rounded-lg"
                      tabIndex={-1}
                      aria-label={tr('auth.invitation.password_label')}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-base-content/50 font-medium ml-1">
                    {tr('auth.invitation.password_policy')}
                  </p>
                  {errorCode && (
                    <span className="text-error text-xs font-bold ml-1 block">
                      {tr(INVITATION_ERROR_MESSAGE_KEYS[errorCode])}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="invitation-confirm-password"
                    className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1 block"
                  >
                    {tr('auth.invitation.confirm_label')}
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
                      <Lock size={20} />
                    </div>
                    <input
                      id="invitation-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={submitting}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full pl-11 pr-12 py-3.5 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium disabled:opacity-50"
                      required
                    />
                  </div>
                  {errorCode === 'mismatch' && (
                    <span className="text-error text-xs font-bold ml-1 block">
                      {tr(INVITATION_ERROR_MESSAGE_KEYS.mismatch)}
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-[#5b21b6] hover:bg-[#4c1d95] active:scale-[0.99] text-white rounded-2xl font-black text-base shadow-lg shadow-purple-900/20 hover:shadow-xl hover:shadow-purple-900/30 transition-all flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>{tr('auth.invitation.submitting')}</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={18} />
                        <span>{tr('auth.invitation.submit')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mx-auto w-20 h-20 bg-error/10 border border-error/20 rounded-full flex items-center justify-center text-error shadow-inner">
                <AlertCircle size={44} />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-base-content">
                  {stateMessage?.title}
                </h1>
                <p className="text-sm text-base-content/60 font-medium leading-relaxed">
                  {stateMessage?.message}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-accent hover:underline transition-colors"
                >
                  {tr('auth.invitation.sign_in')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function PatientInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-base-100 text-base-content">
          <Navbar />
          <main className="flex-grow flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-primary" />
          </main>
          <Footer />
        </div>
      }
    >
      <InvitationContent />
    </Suspense>
  );
}
