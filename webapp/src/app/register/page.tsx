'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  UserCircle,
  AlertCircle,
} from 'lucide-react';

import { apiClient } from '@/shared/api/api.client';
import { authStorage } from '@/shared/lib/auth.storage';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import type { User as SessionUser } from "@/types/backend/schema.types";
import { RegisterFormData, registerSchema } from '@/features/user/schemas/auth.schema';
import { useTranslation } from "@/context/i18n.context";

import { AuthHeroSlider } from "@/shared/components/molecules/AuthHeroSlider/AuthHeroSlider";

/**
 * `t()` devuelve el PATH de la clave cuando no la encuentra (ver
 * `src/context/i18n.context.tsx`, paso 5). Por eso `t(clave) || fallback`
 * nunca dispara el fallback y el usuario ve el path crudo
 * (por ejemplo `form.labels.birth_date`). Este helper resuelve la clave y,
 * si falta, falla de forma explícita en desarrollo y devuelve una etiqueta
 * de último recurso en producción: nunca renderiza un path.
 */
function requireTranslation(
  t: (key: string) => string,
  key: string,
  fallback: string,
): string {
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


/** Auth field language — Maison navy border, brass focus (not Daisy indigo). */
const AUTH_INPUT =
  "w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/80 dark:bg-[#0c101c]/60 px-4 py-3.5 text-[#111018] dark:text-[#f0ede4] placeholder:text-[#1a2a46]/35 dark:placeholder:text-[#f0ede4]/30 focus:border-[#b2944a] focus:ring-4 focus:ring-[#b2944a]/15 outline-none transition-all font-medium";

/**
 * Same fallback the backend applies in `OrganizationService.resolveTrialDays`
 * when the platform setting is missing: `DEFAULT_TRIAL_DAYS` setting → env →
 * 14 days. Keeping them in sync means the CTA never promises a length the
 * workspace creation would not grant.
 */
const DEFAULT_TRIAL_DAYS = 14;

function RegisterFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToastStore();
  const { t, language } = useTranslation();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      router.replace('/dashboard/subscription');
    }
  }, [user, router]);

  const refParam = searchParams.get('ref') || '';

  // S7 (legal-compliance): etiqueta de la fecha de nacimiento. La clave debe
  // existir en todos los locales (lo garantiza `register.form.spec.ts`).
  const birthDateLabel = requireTranslation(
    t,
    'form.labels.birth_date',
    language === 'es' ? 'Fecha de Nacimiento' : 'Date of Birth',
  );

  // Estados para mostrar u ocultar contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);

  // La duración del trial es una configuración de plataforma que el admin
  // edita en Configuración (`DEFAULT_TRIAL_DAYS`). Es la misma clave que el
  // backend resuelve al crear el workspace, así que el CTA no puede tener un
  // número fijo: si el admin la cambia, el botón miente.
  const [trialDays, setTrialDays] = useState(DEFAULT_TRIAL_DAYS);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get<{ value?: string }>('/api/system-settings/public/DEFAULT_TRIAL_DAYS')
      .then((res) => {
        const parsed = Number.parseInt(String(res.data?.value ?? ''), 10);
        if (!cancelled && Number.isFinite(parsed) && parsed > 0) {
          setTrialDays(parsed);
        }
      })
      .catch(() => {
        // Sin configuración o sin red: el backend otorga el mismo fallback.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      referralCode: refParam,
      gender: undefined,
      birthDate: '',
    },
  });

  useEffect(() => {
    if (refParam) {
      setValue('referralCode', refParam);
    }
  }, [refParam, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    if (!acceptedTerms) {
      setTermsError(true);
      return;
    }
    setTermsError(false);

    try {
      const response = await apiClient.post<{
        tokens?: { access_token: string; refresh_token: string };
        // The store holds a full User; refreshSession() reloads the complete
        // record right after, so the registration payload may be partial.
        user?: SessionUser;
      }>('/api/auth/register', { ...data, acceptedTerms: true });

      const { tokens, user: newUser } = response.data || {};

      if (tokens?.access_token && tokens?.refresh_token) {
        authStorage.setTokens(tokens.access_token, tokens.refresh_token);
      }

      if (newUser) {
        useAuthStore.setState({
          user: newUser,
          isAuthenticated: true,
          isLoading: false,
        });
        useAuthStore.getState().refreshSession().catch(() => {});
      }

      addToast({
        type: 'success',
        title: t('auth.welcome_title') || '¡Registro exitoso!',
        message: 'Tu cuenta ha sido creada exitosamente. Seleccioná tu plan para comenzar.',
      });

      // The account is safe; the business profile is the next step.
      router.push('/onboarding/business');
    } catch (error) {
      console.error(error);
      const apiMsg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || 'Error al completar el registro. Intentalo de nuevo.';
      addToast({
        type: 'error',
        title: 'Error de registro',
        message: apiMsg,
      });
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header text */}
      <div className="space-y-3 text-center lg:text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#b2944a]">
          {t('form.title.create_user') || 'Crear cuenta'}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-none tracking-tight text-[#111018] dark:text-[#f0ede4]">
          Empezá tu negocio
        </h1>
        <p className="text-sm text-[#1a2a46]/65 dark:text-[#f0ede4]/55 font-medium">
          {t('auth.already_have_account') || '¿Ya tenés una cuenta?'}{' '}
          <Link href="/login" className="text-[#b2944a] font-bold hover:underline transition-all inline-flex items-center gap-1">
            {t('auth.login_link') || 'Iniciar sesión'}
            <ArrowRight size={14} />
          </Link>
        </p>
      </div>


      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Nombre & Apellido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[#1a2a46]/60 dark:text-[#f0ede4]/50 ml-1">
              {t('form.labels.firstName') || 'Nombre'}
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a2a46]/40 group-focus-within:text-[#b2944a] transition-colors dark:text-[#f0ede4]/40 pointer-events-none">
                <User size={18} />
              </div>
              <input
                type="text"
                {...register('firstName')}
                placeholder={t('form.placeholders.first_name') || 'Tu nombre'}
                className={`${AUTH_INPUT} pl-11 ${errors.firstName ? 'border-[#c63749] ring-4 ring-[#c63749]/15' : ''}`}
              />
            </div>
            {errors.firstName && <span className="text-[#c63749] text-xs font-semibold ml-1">{errors.firstName.message}</span>}
          </div>

          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[#1a2a46]/60 dark:text-[#f0ede4]/50 ml-1">
              {t('form.labels.lastName') || 'Apellido'}
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a2a46]/40 group-focus-within:text-[#b2944a] transition-colors dark:text-[#f0ede4]/40 pointer-events-none">
                <User size={18} />
              </div>
              <input
                type="text"
                {...register('lastName')}
                placeholder={t('form.placeholders.last_name') || 'Tu apellido'}
                className={`${AUTH_INPUT} pl-11 ${errors.lastName ? 'border-[#c63749] ring-4 ring-[#c63749]/15' : ''}`}
              />
            </div>
            {errors.lastName && <span className="text-[#c63749] text-xs font-semibold ml-1">{errors.lastName.message}</span>}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[#1a2a46]/60 dark:text-[#f0ede4]/50 ml-1">
            {t('form.labels.email') || 'Correo electrónico'}
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a2a46]/40 group-focus-within:text-[#b2944a] transition-colors dark:text-[#f0ede4]/40 pointer-events-none">
              <Mail size={18} />
            </div>
              <input
                type="email"
                {...register('email')}
                placeholder={t('form.placeholders.email') || 'correo@ejemplo.com'}
                className={`${AUTH_INPUT} pl-11 ${errors.email ? 'border-[#c63749] ring-4 ring-[#c63749]/15' : ''}`}
              />
          </div>
          {errors.email && <span className="text-[#c63749] text-xs font-semibold ml-1">{errors.email.message}</span>}
        </div>

        {/* Género */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[#1a2a46]/60 dark:text-[#f0ede4]/50 ml-1">
            {t('form.labels.gender') || 'Género'}
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a2a46]/40 group-focus-within:text-[#b2944a] transition-colors dark:text-[#f0ede4]/40 pointer-events-none">
              <UserCircle size={18} />
            </div>
            <select
              {...register('gender')}
              className={`${AUTH_INPUT} pl-11 pr-10 appearance-none ${errors.gender ? 'border-[#c63749] ring-4 ring-[#c63749]/15' : ''}`}
            >
              <option value="">{t('form.placeholders.select_gender') || 'Seleccionar género'}</option>
              <option value="MALE">{t('form.gender_options.male') || 'Masculino'}</option>
              <option value="FEMALE">{t('form.gender_options.female') || 'Femenino'}</option>
              <option value="OTHER">{t('form.gender_options.other') || 'Otro'}</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#1a2a46]/40 dark:text-[#f0ede4]/40">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
          {errors.gender && <span className="text-[#c63749] text-xs font-semibold ml-1">{errors.gender.message}</span>}
        </div>

        {/* Fecha de Nacimiento — S7 (legal-compliance): gate de edad */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[#1a2a46]/60 dark:text-[#f0ede4]/50 ml-1">
            {birthDateLabel}
          </label>
          <input
            type="date"
            {...register('birthDate')}
            className={`${AUTH_INPUT} ${errors.birthDate ? 'border-[#c63749] ring-4 ring-[#c63749]/15' : ''}`}
          />
          {errors.birthDate && <span className="text-[#c63749] text-xs font-semibold ml-1">{errors.birthDate.message}</span>}
        </div>

        {/* Contraseña & Confirmación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[#1a2a46]/60 dark:text-[#f0ede4]/50 ml-1">
              {t('form.labels.password') || 'Contraseña'}
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a2a46]/40 group-focus-within:text-[#b2944a] transition-colors dark:text-[#f0ede4]/40 pointer-events-none">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className={`${AUTH_INPUT} pl-11 pr-12 ${errors.password ? 'border-[#c63749] ring-4 ring-[#c63749]/15' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1a2a46]/40 hover:text-[#1a2a46] transition-colors p-1 dark:text-[#f0ede4]/40 dark:hover:text-[#f0ede4]"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <span className="text-[#c63749] text-xs font-semibold ml-1">{errors.password.message}</span>}
          </div>

          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[#1a2a46]/60 dark:text-[#f0ede4]/50 ml-1">
              {t('form.labels.password_confirm') || 'Confirmar Contraseña'}
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a2a46]/40 group-focus-within:text-[#b2944a] transition-colors dark:text-[#f0ede4]/40 pointer-events-none">
                <Lock size={18} />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="••••••••"
                className={`${AUTH_INPUT} pl-11 pr-12 ${errors.confirmPassword ? 'border-[#c63749] ring-4 ring-[#c63749]/15' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1a2a46]/40 hover:text-[#1a2a46] transition-colors p-1 dark:text-[#f0ede4]/40 dark:hover:text-[#f0ede4]"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <span className="text-[#c63749] text-xs font-semibold ml-1">{errors.confirmPassword.message}</span>}
          </div>
        </div>

        {/* Checkbox Términos y Condiciones */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked);
                if (e.target.checked) setTermsError(false);
              }}
              className="w-4 h-4 mt-0.5 rounded border-2 border-[#1a2a46]/25 dark:border-white/20 focus:ring-[#b2944a]/25 accent-[#b2944a] cursor-pointer"
            />
            <span className="text-xs text-[#1a2a46]/70 dark:text-[#f0ede4]/65 leading-relaxed font-medium group-hover:text-[#111018] dark:group-hover:text-[#f0ede4] transition-colors">
              Acepto los{' '}
              <Link href="/terms" className="text-[#b2944a] underline font-semibold hover:underline">
                Términos de Servicio
              </Link>{' '}
              y la{' '}
              <Link href="/privacy" className="text-[#b2944a] underline font-semibold hover:underline">
                Política de Privacidad
              </Link>{' '}
              de Stockira.
            </span>
          </label>
          {termsError && (
            <div className="flex items-center gap-1.5 text-[#c63749] text-xs font-semibold mt-1 ml-1">
              <AlertCircle size={14} />
              <span>Debés aceptar los términos y condiciones para continuar.</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-[#b2944a] hover:bg-[#bf9f54] active:scale-[0.99] text-[#111018] font-semibold text-base shadow-[0_10px_26px_-12px_rgba(178,148,74,0.75)] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>{t('auth.register_loading') || 'Creando cuenta...'}</span>
              </>
            ) : (
              <>
                <span>Crear mi cuenta gratis ({trialDays} días)</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f0ede4]/50 dark:bg-[#0c101c] text-[#111018] dark:text-[#f0ede4] font-sans antialiased selection:bg-[#b2944a] selection:text-[#111018]">
      {/* Main Content Area */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Left Panel: Desktop Hero Branding */}
        <section className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative overflow-hidden border-r border-[#1a2a46]/10 dark:border-white/10">
          <AuthHeroSlider />
        </section>

        {/* Right Panel: Form Container */}
        <section className="flex-1 flex items-center justify-center p-6 sm:p-10 md:p-16 lg:p-20">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-[#b2944a]" />
              </div>
            }
          >
            <RegisterFormContent />
          </Suspense>
        </section>
      </div>
    </div>
  );
}