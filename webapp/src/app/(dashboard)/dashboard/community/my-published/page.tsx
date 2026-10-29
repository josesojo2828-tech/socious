"use client";

import { useState } from "react";
import { Loader2, Globe, Users, Tag, Trash2, Calendar } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyPublished, unpublishMenu, unpublishExchangeList } from "@/features/community/services/community.service";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import type { CommunityItemResponse } from "@/features/community/types/community.types";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function TypeBadge({ type }: { type: string }) {
  const isMenu = type === "menu";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        isMenu ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
      }`}
    >
      {isMenu ? "Menú" : "Lista de Intercambio"}
    </span>
  );
}

export default function MyPublishedPage() {
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-published"],
    queryFn: getMyPublished,
  });

  const handleUnpublish = async (item: CommunityItemResponse) => {
    setRemovingId(item.entityId);
    try {
      if (item.entityType === "menu") {
        await unpublishMenu(item.entityId);
      } else {
        await unpublishExchangeList(item.entityId);
      }
      addToast({ type: "success", title: "Retirado", message: `${item.title} fue retirado de la comunidad.` });
      queryClient.invalidateQueries({ queryKey: ["my-published"] });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Ocurrió un error al retirar.";
      addToast({ type: "error", title: "Error", message: Array.isArray(msg) ? msg[0] : msg });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Globe className="w-7 h-7 text-emerald-500" />
            Mis publicaciones
          </h1>
          <p className="text-slate-500 mt-1">
            Gestioná los menús y listas que compartiste con la comunidad
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : isError ? (
        <div className="text-center py-16">
          <p className="text-slate-500">Error al cargar tus publicaciones. Intentalo de nuevo.</p>
        </div>
      ) : !data?.length ? (
        <div className="text-center py-16">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No publicaste nada todavía</p>
          <p className="text-slate-400 text-sm mt-1">
            Tus menús y listas publicados aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-base leading-tight truncate">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <TypeBadge type={item.entityType} />
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.publishedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                  {item.tags.length > 4 && (
                    <span className="text-[10px] text-slate-400">+{item.tags.length - 4}</span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>{item.importCount} importaciones</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnpublish(item)}
                  disabled={removingId === item.entityId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0"
                >
                  {removingId === item.entityId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {removingId === item.entityId ? "Retirando..." : "Retirar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
