"use client";

import { Flame, BookOpen, Stethoscope, Sparkles, Filter, CheckCircle2 } from "lucide-react";
import type { CommunityStatsResponse } from "../types/community.types";

interface CommunityStatsHeaderProps {
  stats?: CommunityStatsResponse;
  isLoading: boolean;
  selectedTag?: string;
  onSelectTag: (tag: string | undefined) => void;
}

export function CommunityStatsHeader({
  stats,
  isLoading,
  selectedTag,
  onSelectTag,
}: CommunityStatsHeaderProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const activePathologiesCount = stats.pathologyStats.filter((p) => p.count > 0).length;

  return (
    <div className="space-y-4">
      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Menus */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100/60 transition-colors" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              Menús Clínicos
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900">{stats.totalMenus}</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                100% Con Fotos HD
              </span>
            </div>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Kcal Average */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100/60 transition-colors" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              Promedio Calórico
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-black text-slate-900">{stats.totalKcalAvg}</span>
              <span className="text-xs font-bold text-amber-700">kcal / menú</span>
            </div>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Pathology Conditions */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-indigo-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100/60 transition-colors" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
              Categorías Clínicas
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-black text-slate-900">
                {activePathologiesCount || stats.pathologyStats.length}
              </span>
              <span className="text-xs font-semibold text-indigo-700">Condiciones Activas</span>
            </div>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Filter Pills Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Filter className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filtrar por Diagnóstico o Patología
            </span>
          </div>
          {selectedTag && (
            <button
              onClick={() => onSelectTag(undefined)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
            >
              Limpiar filtro
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => onSelectTag(undefined)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              !selectedTag
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.02]"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
            }`}
          >
            {!selectedTag && <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>Todos</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${!selectedTag ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {stats.totalMenus}
            </span>
          </button>

          {stats.pathologyStats.map((item) => {
            const isSelected = selectedTag === item.tag;
            const hasCount = item.count > 0;

            return (
              <button
                key={item.tag}
                onClick={() => onSelectTag(isSelected ? undefined : item.tag)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.02]"
                    : hasCount
                    ? "bg-emerald-50/60 text-slate-800 border-emerald-200 hover:bg-emerald-100/80 hover:border-emerald-300"
                    : "bg-slate-50 text-slate-400 border-slate-200/60 hover:bg-slate-100"
                }`}
              >
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                <span>{item.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : hasCount
                      ? "bg-emerald-200/70 text-emerald-900"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
