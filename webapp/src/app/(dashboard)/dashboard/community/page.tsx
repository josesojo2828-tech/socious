"use client";

import { useState } from "react";
import { Search, Loader2, Globe, FileText, Utensils, Plus, Sparkles, Filter, BookOpen, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Pagination } from "@/shared/components/molecules/Pagination";
import { CommunityMenuCard } from "@/features/community/components/CommunityMenuCard";
import { CommunityStatsHeader } from "@/features/community/components/CommunityStatsHeader";
import { CommunityDetailDrawer } from "@/features/community/components/CommunityDetailDrawer";
import { LinkedInFeed } from "@/features/community/components/LinkedInFeed";
import { getCommunityMenus, getCommunityStats } from "@/features/community/services/community.service";
import type { CommunityItemResponse } from "@/features/community/types/community.types";

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<"feed" | "menus">("feed");

  // --- MENUS STATE ---
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<CommunityItemResponse | null>(null);

  // Stats query
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["community-stats"],
    queryFn: getCommunityStats,
  });

  // Menus query
  const { data, isLoading, isError } = useQuery({
    queryKey: ["community-menus", page, search, selectedTag],
    queryFn: () =>
      getCommunityMenus({
        page,
        perPage: 20,
        search: search || undefined,
        tags: selectedTag ? [selectedTag] : undefined,
      }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedTag(undefined);
    setPage(1);
    setSearch(searchInput);
  };

  const handleSelectTag = (tag: string | undefined) => {
    setSelectedTag(tag);
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* HEADER PRINCIPAL BLANCO Y PULCRO (ESTILO LINKEDIN DEPORTIVO / CLINICO) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-500/20 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Red Profesional Nutringest
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Comunidad Nutricional
            </h1>
            <p className="text-slate-500 mt-1 text-xs md:text-sm font-normal">
              Conectá con colegas acreditados, compartí hallazgos clínicos y explorá menús patológicos verificados.
            </p>
          </div>

          {/* Stat summary pills */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <span className="block text-xs font-bold text-slate-400 uppercase">Menús Clínicos</span>
              <span className="text-lg font-extrabold text-slate-900">{statsData?.totalMenus ?? 732}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-500/20 text-center">
              <span className="block text-xs font-bold text-emerald-600 uppercase">Colegas Verificados</span>
              <span className="text-lg font-extrabold text-emerald-700">100% SACS/CNDV</span>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION BAR */}
        <div className="flex border-b border-slate-200 mt-6 gap-2">
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "feed"
                ? "border-emerald-500 text-emerald-700 bg-emerald-50/50 rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            Feed de la Comunidad (Estilo LinkedIn)
          </button>

          <button
            onClick={() => setActiveTab("menus")}
            className={`flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "menus"
                ? "border-emerald-500 text-emerald-700 bg-emerald-50/50 rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Utensils className="w-4 h-4 text-slate-500" />
            Menús & Planes Clínicos
          </button>
        </div>
      </div>

      {/* TAB 1: LINKEDIN STYLE SOCIAL FEED */}
      {activeTab === "feed" && <LinkedInFeed />}

      {/* TAB 2: MENUS & CLINICAL PLANS */}
      {activeTab === "menus" && (
        <div className="space-y-6">
          {/* KPI Stats & Pathology Filters */}
          <CommunityStatsHeader
            stats={statsData}
            isLoading={isLoadingStats}
            selectedTag={selectedTag}
            onSelectTag={handleSelectTag}
          />

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nombre, alimento o receta..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all border-0 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              Buscar
            </button>
          </form>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : isError ? (
            <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto my-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-100">
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Comunidad Exclusiva Pro & Premium</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                La sección de comunidad está reservada para usuarios con plan <strong>PRO</strong> o <strong>PREMIUM</strong>.
                Contactá con administración o actualizá tu suscripción para acceder.
              </p>
              <a
                href="/dashboard/subscriptions"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-500/20"
              >
                Ver planes de suscripción
              </a>
            </div>
          ) : !data?.data.length ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No se encontraron menús para el filtro seleccionado</p>
              <p className="text-slate-400 text-sm mt-1">Probá seleccionando otro filtro o haciendo clic en "Todos"</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.data.map((item) => (
                  <CommunityMenuCard key={item.id} item={item} onSelect={(selected) => setSelectedItem(selected)} />
                ))}
              </div>

              {data.meta.totalPages > 1 && (
                <div className="flex justify-center pt-4">
                  <Pagination
                    currentPage={data.meta.page}
                    totalPages={data.meta.totalPages}
                    handleNext={() => setPage((p) => Math.min(p + 1, data.meta.totalPages))}
                    handlePrev={() => setPage((p) => Math.max(p - 1, 1))}
                    hideOnSinglePage={false}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Menu Detail Preview Drawer */}
      <CommunityDetailDrawer
        entityId={selectedItem?.entityId || null}
        entityType={selectedItem?.entityType || "menu"}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
