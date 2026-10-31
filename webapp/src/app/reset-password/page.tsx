"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
} from "lucide-react";

import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { AuthHeroSlider } from "@/shared/components/molecules/AuthHeroSlider/AuthHeroSlider";
import { AuthHeader } from "@/shared/components/molecules/AuthHeader/AuthHeader";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, "").slice(0, 6);
      const newCode = [...code];
      for (let i = 0; i < pasted.length; i++) {
        if (index + i < 6) newCode[index + i] = pasted[i];
      }
      setCode(newCode);
      const nextIndex = Math.min(index + pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Ingresá el código completo de 6 dígitos.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await apiClient.post("/api/auth/reset-password", {
        code: fullCode,
        password,
        confirmPassword,
      });
      setSuccess(true);
      addToast({
        type: "success",
        title: "Contraseña actualizada",
        message: "Ya puedes iniciar sesión con tu nueva contraseña.",
      });
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al restablecer la contraseña. Verifica el código.");
    } finally {
      setIsLoading(false);
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

        {/* Right Panel: Reset Password Form */}
        <section className="flex-1 flex items-center justify-center p-6 sm:p-10 md:p-16 lg:p-20 bg-base-100">
          <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {success ? (
              /* Success State */
              <div className="text-center space-y-6 py-6 animate-in fade-in zoom-in-95 duration-400">
                <div className="mx-auto w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <CheckCircle2 size={44} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-base-content">
                    ¡Contraseña Restablecida!
                  </h2>
                  <p className="text-sm text-base-content/60 font-medium">
                    Tu contraseña ha sido actualizada con éxito. Redirigiendo al inicio de sesión...
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Form Header */}
                <div className="space-y-2 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-2">
                    <KeyRound size={14} />
                    <span>Nueva Contraseña</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-base-content">
                    Restablecer contraseña
                  </h1>
                  <p className="text-sm text-base-content/60 font-medium leading-relaxed">
                    Ingresá el código de 6 dígitos enviado a tu correo y definí tu nueva contraseña.
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
                  {/* 6-Digit PIN Code Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1 block text-center lg:text-left">
                      Código de verificación (6 dígitos)
                    </label>
                    <div className="flex gap-2 justify-center lg:justify-start">
                      {code.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            inputRefs.current[i] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeChange(i, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(i, e)}
                          disabled={isLoading}
                          className="w-11 h-14 text-center text-xl sm:text-2xl font-black bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content disabled:opacity-50"
                        />
                      ))}
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1">
                      Nueva contraseña
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
                        <Lock size={20} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-12 py-3.5 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium disabled:opacity-50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-base-content/70 ml-1">
                      Confirmar nueva contraseña
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors">
                        <Lock size={20} />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-12 py-3.5 bg-base-100 dark:bg-base-200 border-2 border-base-300 rounded-2xl focus:bg-base-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base-content font-medium disabled:opacity-50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 bg-[#4f46e5] hover:bg-[#4338ca] active:scale-[0.99] text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-900/20 hover:shadow-xl hover:shadow-indigo-900/30 transition-all flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed group"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span>Actualizando contraseña...</span>
                        </>
                      ) : (
                        <>
                          <span>Restablecer contraseña</span>
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Back to login link */}
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
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
