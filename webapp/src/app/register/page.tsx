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
  Tag,
  ArrowRight,
  CheckCircle2,
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
import { AuthHeader } from "@/shared/components/molecules/AuthHeader/AuthHeader";

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

      router.push('/dashboard/subscription');
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
    <div className="w-full max-w-lg space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header text */}
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-base-content">
          {t('form.title.create_user') || 'Crear Cuenta'}
        </h1>
        <p className="text-sm text-base-content/60 font-medium">
          {t('auth.already_have_account') || '¿Ya tenés una cuenta?'}{' '}
          <Link href="/login" className="text-primary hover:text-accent font-bold hover:underline transition-all">
            {t('auth.login_link') || 'Iniciar sesión'}
          </Link>
        </p>
      </div>


      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nombre & Apellido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1">
              {t('form.labels.firstName') || 'Nombre'}
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                {...register('firstName')}
                placeholder={t('form.placeholders.first_name') || 'Tu nombre'}
                className={`w-full pl-11 pr-4 py-3 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium ${
                  errors.firstName ? 'border-error ring-4 ring-error/10' : ''
                }`}
              />
            </div>
            {errors.firstName && <span className="text-error text-xs font-bold ml-1">{errors.firstName.message}</span>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1">
              {t('form.labels.lastName') || 'Apellido'}
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                {...register('lastName')}
                placeholder={t('form.placeholders.last_name') || 'Tu apellido'}
                className={`w-full pl-11 pr-4 py-3 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium ${
                  errors.lastName ? 'border-error ring-4 ring-error/10' : ''
                }`}
              />
            </div>
            {errors.lastName && <span className="text-error text-xs font-bold ml-1">{errors.lastName.message}</span>}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1">
            {t('form.labels.email') || 'Correo electrónico'}
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
              <Mail size={18} />
            </div>
            <input
              type="email"
              {...register('email')}
              placeholder={t('form.placeholders.email') || 'correo@ejemplo.com'}
              className={`w-full pl-11 pr-4 py-3 border rounded-lg transition-all outline-none font-medium bg-base-100 dark:bg-base-200 border-base-300 focus:border-primary focus:ring-4 focus:ring-primary/10 text-base-content ${errors.email ? 'border-error ring-4 ring-error/10' : ''}`}
            />
          </div>
          {errors.email && <span className="text-error text-xs font-bold ml-1">{errors.email.message}</span>}
        </div>

        {/* Género */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1">
            {t('form.labels.gender') || 'Género'}
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors pointer-events-none">
              <UserCircle size={18} />
            </div>
            <select
              {...register('gender')}
              className={`w-full pl-11 pr-10 py-3 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium appearance-none ${
                errors.gender ? 'border-error ring-4 ring-error/10' : ''
              }`}
            >
              <option value="">{t('form.placeholders.select_gender') || 'Seleccionar género'}</option>
              <option value="MALE">{t('form.gender_options.male') || 'Masculino'}</option>
              <option value="FEMALE">{t('form.gender_options.female') || 'Femenino'}</option>
              <option value="OTHER">{t('form.gender_options.other') || 'Otro'}</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-base-content/40">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
          {errors.gender && <span className="text-error text-xs font-bold ml-1">{errors.gender.message}</span>}
        </div>

        {/* Fecha de Nacimiento — S7 (legal-compliance): gate de edad */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1">
            {birthDateLabel}
          </label>
          <input
            type="date"
            {...register('birthDate')}
            className={`w-full px-4 py-3 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium ${
              errors.birthDate ? 'border-error ring-4 ring-error/10' : ''
            }`}
          />
          {errors.birthDate && <span className="text-error text-xs font-bold ml-1">{errors.birthDate.message}</span>}
        </div>

        {/* Contraseña & Confirmación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1">
              {t('form.labels.password') || 'Contraseña'}
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className={`w-full pl-11 pr-12 py-3 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium ${
                  errors.password ? 'border-error ring-4 ring-error/10' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <span className="text-error text-xs font-bold ml-1">{errors.password.message}</span>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1">
              {t('form.labels.password_confirm') || 'Confirmar Contraseña'}
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="••••••••"
                className={`w-full pl-11 pr-12 py-3 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium ${
                  errors.confirmPassword ? 'border-error ring-4 ring-error/10' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors p-1"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <span className="text-error text-xs font-bold ml-1">{errors.confirmPassword.message}</span>}
          </div>
        </div>

        {/* Código de Referido */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1 flex items-center justify-between">
            <span>{t('auth.referral_code_optional') || 'Código de Referido (Opcional)'}</span>
            {refParam && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                <CheckCircle2 size={10} /> {t('auth.referral_applied') || 'Aplicado'}
              </span>
            )}
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
              <Tag size={18} />
            </div>
            <input
              type="text"
              {...register('referralCode')}
              className="w-full pl-11 pr-4 py-3 border rounded-lg transition-all outline-none font-medium bg-base-100 dark:bg-base-200 border-base-300 text-primary focus:border-primary focus:ring-4 focus:ring-primary/10"
              placeholder={t('form.placeholders.referral_code') || 'OPCIONAL'}
            />
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
              className="w-4 h-4 mt-0.5 rounded border-2 border-base-300 text-primary focus:ring-primary/20 accent-[var(--color-primary)] cursor-pointer"
            />
            <span className="text-xs text-base-content/70 leading-relaxed font-medium group-hover:text-base-content transition-colors">
              Acepto los{' '}
              <Link href="/terms" className="text-primary underline font-bold hover:text-accent">
                Términos de Servicio
              </Link>{' '}
              y la{' '}
              <Link href="/privacy" className="text-primary underline font-bold hover:text-accent">
                Política de Privacidad
              </Link>{' '}
              de Socius.
            </span>
          </label>
          {termsError && (
            <div className="flex items-center gap-1.5 text-error text-xs font-bold mt-1 ml-1">
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
            className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] active:scale-[0.99] text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-900/20 hover:shadow-xl hover:shadow-indigo-900/30 transition-all flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>{t('auth.register_loading') || 'Creando cuenta...'}</span>
              </>
            ) : (
              <>
                <span>Crear mi cuenta gratis (14 días)</span>
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
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content font-sans antialiased selection:bg-primary/20">
      {/* Auth Navigation Header */}
      <AuthHeader />

      {/* Main Content Area */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Left Panel: Desktop Hero Branding */}
        <section className="hidden lg:flex lg:w-[45%] xl:w-[42%] bg-slate-950 relative overflow-hidden border-r border-base-200">
          <AuthHeroSlider />
        </section>

        {/* Right Panel: Form Container */}
        <section className="flex-1 flex items-center justify-center p-6 sm:p-10 md:p-16 lg:p-20 bg-base-100">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-primary" />
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