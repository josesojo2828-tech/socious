"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from "lucide-react";

import { apiClient } from "@/shared/api/api.client";
import { AuthHeroSlider } from "@/shared/components/molecules/AuthHeroSlider/AuthHeroSlider";
import { AuthHeader } from "@/shared/components/molecules/AuthHeader/AuthHeader";

type Step = "email" | "sent";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError("");

    try {
      await apiClient.post("/api/auth/forgot-password", { email });
      setStep("sent");
    } catch (err: unknown) {
      const raw: unknown = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError((Array.isArray(raw) ? raw[0] : raw) as string || "Error al enviar el código de recuperación.");
    } finally {
      setIsLoading(false);
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

        {/* Right Panel: Forgot Password Form */}
        <section className="flex-1 flex items-center justify-center p-6 sm:p-10 md:p-16 lg:p-20">
          <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {step === "email" ? (
              <>
                {/* Header text */}
                <div className="space-y-2 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b2944a]/10 border border-[#b2944a]/30 text-[#b2944a] text-[10px] font-mono uppercase tracking-[0.16em] mb-2">
                    <KeyRound size={14} />
                    <span>Recuperación de Contraseña</span>
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-none tracking-tight text-[#111018] dark:text-[#f0ede4]">
                    ¿Olvidaste tu contraseña?
                  </h1>
                  <p className="text-sm text-base-content/60 font-medium leading-relaxed">
                    Ingresá tu correo electrónico y te enviaremos un código de 6 dígitos para recuperar el acceso a tu cuenta.
                  </p>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-sm font-semibold animate-in shake duration-300 flex items-center gap-3">
                    <AlertCircle size={20} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Form */}
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1">
                      Correo electrónico
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
                        <Mail size={20} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        placeholder="correo@ejemplo.com"
                        className="w-full pl-11 pr-4 py-3.5 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium disabled:opacity-50"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 bg-[#b2944a] hover:bg-[#bf9f54] active:scale-[0.99] text-white rounded-2xl font-black text-base shadow-lg shadow-[0_10px_26px_-12px_rgba(178,148,74,0.75)] transition-all flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed group"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span>Enviando código...</span>
                        </>
                      ) : (
                        <>
                          <span>Enviar código de recuperación</span>
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Link back to login */}
                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-accent hover:underline transition-colors"
                  >
                    <ArrowLeft size={16} />
                    <span>Volver al inicio de sesión</span>
                  </Link>
                </div>
              </>
            ) : (
              /* Step 2: Sent Confirmation */
              <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-400">
                <div className="mx-auto w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <CheckCircle2 size={44} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-base-content">
                    Revisá tu correo
                  </h2>
                  <p className="text-sm text-base-content/70 font-medium leading-relaxed max-w-sm mx-auto">
                    Te enviamos un código de 6 dígitos a{" "}
                    <strong className="text-base-content font-black">{email}</strong>. Es válido por 1 hora.
                  </p>
                </div>

                <div className="pt-4 space-y-3">
                  <Link href="/reset-password">
                    <button className="w-full py-4 bg-[#b2944a] hover:bg-[#bf9f54] active:scale-[0.99] text-white rounded-2xl font-black text-base shadow-lg shadow-[0_10px_26px_-12px_rgba(178,148,74,0.75)] transition-all flex items-center justify-center gap-3">
                      <span>Ingresar el código</span>
                      <ArrowRight size={18} />
                    </button>
                  </Link>
                </div>

                <p className="text-xs text-base-content/50 font-medium">
                  ¿No recibiste el correo?{" "}
                  <button
                    onClick={() => {
                      setStep("email");
                      setError("");
                    }}
                    className="text-primary hover:text-accent font-bold hover:underline"
                  >
                    Reenviar código
                  </button>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
