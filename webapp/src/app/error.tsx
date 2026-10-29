"use client";

import { useEffect } from "react";
import { sendTelegramErrorAlert } from "@/lib/telegram-logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 1. Detectar si es un ChunkLoadError (típico cuando se despliega nueva versión en Next.js/Vercel)
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Failed to fetch dynamically imported module");

    if (isChunkError) {
      // Auto-reload si no se ha recargado recientemente en esta sesión
      const reloadKey = "chunk_error_reloaded";
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, "true");
        window.location.reload();
        return;
      }
    }

    // 2. Detectar manipulación externa del DOM (Google Translate / extensiones móviles)
    const isDomTamperingError =
      error?.name === "NotFoundError" &&
      (error?.message?.includes("insertBefore") || error?.message?.includes("removeChild"));

    if (isDomTamperingError) {
      sendTelegramErrorAlert({
        error,
        source: "React Route Error Boundary (error.tsx) [DOM Auto-Recovery]",
      });
      const reloadKey = "dom_tampering_reloaded";
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, "true");
        window.location.reload();
        return;
      }
    }

    // 3. Enviar la alerta a Telegram de manera silenciosa para otros errores
    sendTelegramErrorAlert({
      error,
      source: "React Route Error Boundary (error.tsx)",
    });
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 m-4">
      <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
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

      <h2 className="text-2xl font-bold mb-2">¡Ups! Ocurrió un inconveniente</h2>
      <p className="text-slate-400 max-w-md mb-6 text-sm">
        Ha surgido un error inesperado al cargar esta sección. El equipo técnico ya fue notificado automáticamente para resolverlo.
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-emerald-950/40"
        >
          Reintentar
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-xl transition-all border border-slate-700"
        >
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
