"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { apiClient } from "@/shared/api/api.client";
import { Button } from "@/shared/components/atoms/Button";
import { AuthHeroSlider } from "@/shared/components/molecules/AuthHeroSlider";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    apiClient
      .post("/api/auth/verify-email", { token })
      .then(() => {
        setStatus("success");
        setMessage("Tu correo electrónico fue verificado exitosamente.");
      })
      .catch((err) => {
        setStatus("error");
        const raw: unknown = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
        setMessage(
          (Array.isArray(raw) ? raw[0] : raw) as string ||
            "El token es inválido o expiró. Probá registrarte de nuevo.",
        );
      });
  }, [token]);

  // Sin token el resultado es error; se deriva en render (sin setState en effect).
  const effectiveStatus: Status = token ? status : "error";
  const effectiveMessage = token ? message : "Token de verificación no encontrado.";

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="lg:hidden text-center space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-550/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold">
          <span>Nutringest</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Tu salud, en tus manos.
        </h1>
      </div>

      {effectiveStatus === "loading" && (
        <div className="text-center space-y-6 py-16">
          <Loader2 size={48} className="animate-spin text-emerald-600 mx-auto" />
          <p className="text-slate-500 font-medium">Verificando tu correo...</p>
        </div>
      )}

      {effectiveStatus === "success" && (
        <div className="text-center space-y-6 py-8">
          <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">
              ¡Email verificado!
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed">{effectiveMessage}</p>
          </div>
          <div className="pt-4">
            <Link href="/login">
              <Button className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/10 hover:shadow-xl transition-all border-none">
                Iniciar sesión
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {effectiveStatus === "error" && (
        <div className="text-center space-y-6 py-8">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle size={40} className="text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">
              Error de verificación
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed">{effectiveMessage}</p>
          </div>
          <div className="pt-4">
            <Link href="/register">
              <Button className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/10 hover:shadow-xl transition-all border-none">
                Crear cuenta de nuevo
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen w-full bg-slate-50 font-sans selection:bg-emerald-500/20">
      <section className="hidden lg:flex w-[42%] bg-slate-950 relative overflow-hidden">
        <AuthHeroSlider />
      </section>

      <section className="w-full lg:w-[58%] flex items-center justify-center p-8 md:p-16 lg:p-24 bg-white">
        <Suspense fallback={
          <div className="text-center space-y-6 py-16">
            <Loader2 size={48} className="animate-spin text-emerald-600 mx-auto" />
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </section>
    </main>
  );
}
