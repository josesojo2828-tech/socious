"use client";

import { useEffect } from "react";
import { sendTelegramErrorAlert } from "@/lib/telegram-logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    sendTelegramErrorAlert({
      error,
      source: "Global App Error Boundary (global-error.tsx)",
    });
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">No se pudo cargar esta página</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Se produjo un error crítico. La alerta fue enviada al soporte técnico en tiempo real.
          </p>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => reset()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-950/50"
            >
              Recargar e intentar de nuevo
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm rounded-xl transition-all border border-slate-700"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
