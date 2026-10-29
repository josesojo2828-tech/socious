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
  LogIn,
} from "lucide-react";

// Hooks y Stores
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useTranslation } from "@/context/i18n.context";

// Componentes
import { AuthHeroSlider } from "@/shared/components/molecules/AuthHeroSlider/AuthHeroSlider";
import { AuthHeader } from "@/shared/components/molecules/AuthHeader/AuthHeader";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // Lógica de Autenticación
  const { login, isLoading, error: authError, user } = useAuthStore();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Estados Locales
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isPending = isLoading || isSuccess;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      await login(email, password);

      const { user } = useAuthStore.getState();
      if (user?.mustChangePassword) {
        router.push("/change-password");
        return;
      }

      setIsSuccess(true);

      setTimeout(() => {
        const { user } = useAuthStore.getState();
        const isCampus = localStorage.getItem("show_campus_welcome") === "true";
        const isPatient = user?.permits?.name === "PATIENT";

        if (isCampus) {
          localStorage.removeItem("show_campus_welcome");
          router.push("/campus/bienvenido");
        } else if (isPatient) {
          router.push("/dashboard");
        } else if (!user?.subscriptions?.length) {
          router.push("/dashboard/subscription");
        } else {
          router.push("/dashboard");
        }
      }, 1200);
    } catch (err) {
      console.error("Login fallido", err);
    }
  };

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

        {/* Right Panel: Login Form */}
        <section className="flex-1 flex items-center justify-center p-6 sm:p-10 md:p-16 lg:p-20 bg-base-100">
          <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Intro */}
            <div className="space-y-2 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-2">
                <LogIn size={14} />
                <span>Iniciar Sesión</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-base-content">
                {t("auth.welcome_back") || "Bienvenido de nuevo"}
              </h1>
              <p className="text-sm text-base-content/60 font-medium">
                {t("common.auth.no_account") || "¿No tenés una cuenta?"}{" "}
                <Link
                  href="/register"
                  className="text-primary hover:text-accent font-bold hover:underline transition-all inline-flex items-center gap-1"
                >
                  {t("auth.register_link") || "Registrate gratis"}
                  <ArrowRight size={14} />
                </Link>
              </p>
            </div>

            {/* Error Feedback Alert */}
            {authError && (
              <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-sm font-semibold animate-in shake duration-300 flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Success Feedback Alert */}
            {isSuccess && (
              <div className="p-4 rounded-2xl bg-success/10 border border-success/20 text-success text-sm font-semibold animate-in fade-in duration-300 flex items-center gap-3">
                <CheckCircle2 size={20} className="shrink-0" />
                <span>{t("auth.login_success") || "¡Éxito! Redirigiendo a la plataforma..."}</span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1">
                  {t("form.labels.email") || "Correo electrónico"}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    placeholder={t("form.placeholders.email") || "correo@ejemplo.com"}
                    className="w-full pl-11 pr-4 py-3.5 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                    {t("form.labels.password") || "Contraseña"}
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-bold text-primary hover:text-accent hover:underline uppercase tracking-wide transition-colors"
                  >
                    {t("common.auth.forgot_password") || "¿Olvidaste tu contraseña?"}
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
                    <Lock size={20} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3.5 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium disabled:opacity-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors p-1 rounded-lg"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Remember Me Row */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isPending}
                    className="w-4 h-4 rounded border-2 border-base-300 text-primary focus:ring-primary/20 accent-[#5b21b6] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-base-content/70 group-hover:text-base-content transition-colors">
                    Recordarme en este dispositivo
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-4 bg-[#5b21b6] hover:bg-[#4c1d95] active:scale-[0.99] text-white rounded-2xl font-black text-base shadow-lg shadow-purple-900/20 hover:shadow-xl hover:shadow-purple-900/30 transition-all flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed group"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>
                        {isSuccess
                          ? t("auth.login_success") || "¡Éxito! Redirigiendo..."
                          : t("auth.login_loading") || "Iniciando sesión..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{t("form.buttons.login") || "Iniciar Sesión"}</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Legal Notice */}
            <p className="text-center text-xs text-base-content/50 leading-relaxed font-medium">
              Al iniciar sesión, aceptás nuestros{" "}
              <Link href="/terms" className="text-base-content/70 underline hover:text-primary font-semibold transition-colors">
                Términos de Servicio
              </Link>{" "}
              y{" "}
              <Link href="/privacy" className="text-base-content/70 underline hover:text-primary font-semibold transition-colors">
                Política de Privacidad
              </Link>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}