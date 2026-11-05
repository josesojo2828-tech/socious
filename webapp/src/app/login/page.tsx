"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Hooks y Stores
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useTranslation } from "@/context/i18n.context";

// Componentes
import { AuthHeroSlider } from "@/shared/components/molecules/AuthHeroSlider/AuthHeroSlider";
import { AuthHeader } from "@/shared/components/molecules/AuthHeader/AuthHeader";

/** Auth field language — Maison navy border, brass focus (not Daisy indigo). */
const AUTH_INPUT =
  "w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/80 dark:bg-[#0c101c]/60 px-4 py-3.5 text-[#111018] dark:text-[#f0ede4] placeholder:text-[#1a2a46]/35 dark:placeholder:text-[#f0ede4]/30 focus:border-[#b2944a] focus:ring-4 focus:ring-[#b2944a]/15 outline-none transition-all font-medium disabled:opacity-50";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // Lógica de Autenticación
  const { login, isLoading, error: authError, user } = useAuthStore();

  // Single source of truth for the post-login destination. Previously a
  // mount effect pushed `/dashboard` while the submit handler scheduled
  // `/dashboard/subscription`, so the two raced and the plans screen could be
  // skipped (or shown and then yanked away).
  useEffect(() => {
    if (!user) return;
    if (user.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    router.replace(
      user.subscriptions?.length ? "/dashboard" : "/dashboard/subscription",
    );
  }, [user, router]);

  // Estados Locales
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isPending = isLoading || isSuccess;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      await login(email, password);

      // Navigation is owned by the effect above, which reacts to `user`.
      setIsSuccess(true);
    } catch (err) {
      console.error("Login fallido", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0ede4]/50 dark:bg-[#0c101c] text-[#111018] dark:text-[#f0ede4] font-sans antialiased selection:bg-[#b2944a] selection:text-[#111018]">
      {/* Auth Navigation Header */}
      <AuthHeader />

      {/* Main Content Area */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Left Panel: Desktop Hero Branding */}
        <section className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative overflow-hidden border-r border-[#1a2a46]/10 dark:border-white/10">
          <AuthHeroSlider />
        </section>

        {/* Right Panel: Login Form */}
        <section className="flex-1 flex items-center justify-center p-6 sm:p-10 md:p-16 lg:p-20">
          <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Intro */}
            <div className="space-y-3 text-center lg:text-left">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#b2944a]">
                {t("auth.welcome_back") || "Bienvenido de nuevo"}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-none tracking-tight text-[#111018] dark:text-[#f0ede4]">
                Entrá a tu negocio
              </h1>
              <p className="text-sm text-[#1a2a46]/65 dark:text-[#f0ede4]/55 font-medium">
                {t("common.auth.no_account") || "¿No tenés una cuenta?"}{" "}
                <Link
                  href="/register"
                  className="text-[#b2944a] font-bold hover:underline transition-all inline-flex items-center gap-1"
                >
                  {t("auth.register_link") || "Registrate gratis"}
                  <ArrowRight size={14} />
                </Link>
              </p>
            </div>

            {/* Error Feedback Alert */}
            {authError && (
              <div className="p-4 rounded-xl bg-[#c63749]/10 border border-[#c63749]/25 text-[#c63749] text-sm font-semibold animate-in shake duration-300 flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Success Feedback Alert */}
            {isSuccess && (
              <div className="p-4 rounded-xl bg-[#128454]/10 border border-[#128454]/25 text-[#128454] text-sm font-semibold animate-in fade-in duration-300 flex items-center gap-3">
                <CheckCircle2 size={20} className="shrink-0" />
                <span>
                  {t("auth.login_success") ||
                    "¡Éxito! Redirigiendo a la plataforma..."}
                </span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[#1a2a46]/60 dark:text-[#f0ede4]/50 ml-1">
                  {t("form.labels.email") || "Correo electrónico"}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a2a46]/40 group-focus-within:text-[#b2944a] transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    placeholder={
                      t("form.placeholders.email") || "correo@ejemplo.com"
                    }
                    className={`${AUTH_INPUT} pl-11`}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[#1a2a46]/60 dark:text-[#f0ede4]/50">
                    {t("form.labels.password") || "Contraseña"}
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-[#b2944a] hover:underline transition-colors"
                  >
                    {t("common.auth.forgot_password") ||
                      "¿Olvidaste tu contraseña?"}
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a2a46]/40 group-focus-within:text-[#b2944a] transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    placeholder="••••••••"
                    className={`${AUTH_INPUT} pl-11 pr-12`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1a2a46]/40 hover:text-[#1a2a46] dark:text-[#f0ede4]/40 dark:hover:text-[#f0ede4] transition-colors p-1 rounded-lg"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button — brass CTA, same as landing */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-4 rounded-2xl bg-[#b2944a] hover:bg-[#bf9f54] active:scale-[0.99] text-[#111018] font-semibold text-base shadow-[0_10px_26px_-12px_rgba(178,148,74,0.75)] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>
                        {isSuccess
                          ? t("auth.login_success") || "¡Éxito! Redirigiendo..."
                          : t("auth.login_loading") ||
                            "Iniciando sesión..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{t("form.buttons.login") || "Iniciar Sesión"}</span>
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Legal Notice */}
            <p className="text-center text-xs text-[#1a2a46]/45 dark:text-[#f0ede4]/40 leading-relaxed font-medium">
              Al iniciar sesión, aceptás nuestros{" "}
              <Link
                href="/terms"
                className="text-[#1a2a46]/70 dark:text-[#f0ede4]/60 underline hover:text-[#b2944a] font-semibold transition-colors"
              >
                Términos de Servicio
              </Link>{" "}
              y{" "}
              <Link
                href="/privacy"
                className="text-[#1a2a46]/70 dark:text-[#f0ede4]/60 underline hover:text-[#b2944a] font-semibold transition-colors"
              >
                Política de Privacidad
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
