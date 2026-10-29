"use client";

import { useEffect } from "react";
import { X, Loader2, Globe, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCommunityMenuDetail, getCommunityExchangeListDetail } from "../services/community.service";
import { CommunityMenuDetailView } from "./CommunityMenuDetailView";

interface CommunityDetailDrawerProps {
  entityId: string | null;
  entityType?: "menu" | "exchange-list" | string;
  onClose: () => void;
}

export function CommunityDetailDrawer({
  entityId,
  entityType = "menu",
  onClose,
}: CommunityDetailDrawerProps) {
  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (entityId) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [entityId, onClose]);

  // Menu Detail Query
  const {
    data: menuDetail,
    isLoading: isLoadingMenu,
    isError: isErrorMenu,
  } = useQuery({
    queryKey: ["community-menu-detail", entityId],
    queryFn: () => getCommunityMenuDetail(entityId!),
    enabled: Boolean(entityId && entityType === "menu"),
  });

  // Exchange List Detail Query
  const {
    data: exchangeListDetail,
    isLoading: isLoadingExchangeList,
    isError: isErrorExchangeList,
  } = useQuery({
    queryKey: ["community-exchange-list-detail", entityId],
    queryFn: () => getCommunityExchangeListDetail(entityId!),
    enabled: Boolean(entityId && entityType === "exchange-list"),
  });

  if (!entityId) return null;

  const isLoading = entityType === "menu" ? isLoadingMenu : isLoadingExchangeList;
  const isError = entityType === "menu" ? isErrorMenu : isErrorExchangeList;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Container: Bottom sheet on mobile, right slide-over on desktop */}
      <div className="relative w-full md:max-w-xl h-[88vh] md:h-full bg-white shadow-2xl rounded-t-3xl md:rounded-none md:border-l border-slate-200 flex flex-col z-10 animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
        {/* Mobile Pull Handle */}
        <div className="w-full pt-2.5 pb-1 flex justify-center md:hidden bg-slate-50 rounded-t-3xl border-b border-slate-100">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Ficha Técnica de Comunidad
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                {entityType === "menu" ? "Plan Nutricional / Menú" : "Lista de Intercambio"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors border-0 cursor-pointer"
            aria-label="Cerrar ficha"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs font-semibold text-slate-500">Cargando detalles de la ficha...</p>
          </div>
        ) : isError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No se pudo cargar la información</p>
            <p className="text-xs text-slate-500 max-w-xs">
              Ocurrió un error al consultar los detalles de este elemento comunitario. Por favor reintentá.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        ) : entityType === "menu" && menuDetail ? (
          <CommunityMenuDetailView detail={menuDetail} onImportSuccess={onClose} />
        ) : entityType === "exchange-list" && exchangeListDetail ? (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">{exchangeListDetail.name}</h2>
            {exchangeListDetail.description && (
              <p className="text-xs text-slate-600">{exchangeListDetail.description}</p>
            )}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-700">Ítems de Intercambio ({exchangeListDetail.items?.length || 0})</p>
              <ul className="mt-2 divide-y divide-slate-200 text-xs text-slate-600">
                {exchangeListDetail.items?.map((item) => (
                  <li key={item.id} className="py-1.5 flex justify-between">
                    <span>{item.foodExchangeList?.name || "Ítem de intercambio"}</span>
                    <span className="font-semibold">{item.amount} {item.servingLabel || "porción"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
