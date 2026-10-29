"use client";

import { useState } from "react";
import { Globe, Ban, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { publishMenu, unpublishMenu } from "@/features/community/services/community.service";

interface MenuPublishCardProps {
  menuId: string;
  publishedAt?: string | null;
}

export function MenuPublishCard({ menuId, publishedAt }: MenuPublishCardProps) {
  const [loading, setLoading] = useState(false);
  const [isPublished, setIsPublished] = useState(!!publishedAt);
  const { addToast } = useToastStore();

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isPublished) {
        await unpublishMenu(menuId);
        setIsPublished(false);
        addToast({ type: "success", title: "Retirado", message: "Menú retirado de la comunidad." });
      } else {
        await publishMenu(menuId);
        setIsPublished(true);
        addToast({ type: "success", title: "¡Publicado!", message: "Menú publicado en la comunidad." });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Ocurrió un error.";
      addToast({ type: "error", title: "Error", message: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-base-100 rounded-2xl p-5 shadow-sm border border-base-300">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {isPublished ? (
            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 text-base-content/30 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-base-content">
              {isPublished ? "Publicado en comunidad" : "No publicado"}
            </p>
            <p className="text-xs text-base-content/70 mt-0.5">
              {isPublished
                ? "Este menú es visible para la comunidad"
                : "Publicá este menú para compartirlo con otros nutricionistas"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-0 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
            isPublished
              ? "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
              : "bg-emerald-500 text-white hover:bg-emerald-600"
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPublished ? (
            <Ban className="w-4 h-4" />
          ) : (
            <Globe className="w-4 h-4" />
          )}
          {loading
            ? "Procesando..."
            : isPublished
            ? "Retirar de comunidad"
            : "Publicar en comunidad"}
        </button>
      </div>
    </div>
  );
}
