"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Globe, ArrowRight, Calendar, FileText, ListOrdered } from "lucide-react";
import { getMyImports } from "@/features/community/services/community.service";
import type { ImportedItem } from "@/features/community/types/community.types";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function importDetailHref(item: ImportedItem): string {
  if (item.importedFromType === "menu") return `/dashboard/menu/${item.id}`;
  return `/dashboard/exchange-list/${item.id}`;
}

export default function MyImportsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-imports"],
    queryFn: getMyImports,
  });

  const hasMenus = (data?.menus?.length ?? 0) > 0;
  const hasExchangeLists = (data?.exchangeLists?.length ?? 0) > 0;
  const hasAny = hasMenus || hasExchangeLists;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Globe className="w-7 h-7 text-emerald-500" />
            Mis importaciones
          </h1>
          <p className="text-slate-500 mt-1">
            Menús y listas que importaste desde la comunidad
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
          <p className="text-slate-500">Error al cargar tus importaciones. Intentalo de nuevo.</p>
        </div>
      ) : !hasAny ? (
        <div className="text-center py-16">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No importaste nada todavía</p>
          <p className="text-slate-400 text-sm mt-1">
            Explorá la comunidad para importar menús y listas de intercambio
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Menús */}
          {hasMenus && (
            <section>
              <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Menús importados ({data!.menus.length})
              </h2>
              <div className="space-y-3">
                {data!.menus.map((item) => {
                  const href = importDetailHref(item);
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Listas de Intercambio */}
          {hasExchangeLists && (
            <section>
              <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-blue-500" />
                Listas de Intercambio importadas ({data!.exchangeLists.length})
              </h2>
              <div className="space-y-3">
                {data!.exchangeLists.map((item) => {
                  const href = importDetailHref(item);
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <ListOrdered className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
