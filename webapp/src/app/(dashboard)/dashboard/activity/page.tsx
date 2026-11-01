"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "@/context/i18n.context";
import { useActivityFeed } from "@/features/dashboard/hooks/useActivityFeed";
import { useActivityStats } from "@/features/dashboard/hooks/useActivityStats";
import {
  Activity,
  RefreshCw,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Search,
  Calendar,
  Users,
} from "lucide-react";
import type { IActivityLog } from "@/types/backend/activity.type";
import {
  getActionConfig,
  formatRelativeTime,
  getUserInitials,
} from "@/shared/lib/activity.mapper";
import {
  BRASS_DOT,
  BTN_GHOST,
  CARD,
  CTA_BRASS,
  EYEBROW,
  GLASS,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";

/** Tonos de las categorías del mapper, en el lenguaje pastel/brasa de las listas. */
const BADGE_TONE: Record<string, string> = {
  "badge-primary": "border-[#1a2a46]/25 bg-[#1a2a46]/10 text-[#1a2a46] dark:border-white/15 dark:text-slate-200",
  "badge-success": "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "badge-warning": "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "badge-error": "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  "badge-info": "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "badge-neutral": "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  "badge-accent": "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "badge-ghost": "border-slate-500/30 bg-slate-500/10 text-slate-500 dark:text-slate-400",
};

function ActivityItem({ log }: { log: IActivityLog }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const actionCfg = getActionConfig(log.action, t);
  const initials = useMemo(() => getUserInitials(log), [log]);

  return (
    <div className={`rounded-2xl transition-shadow hover:shadow-md ${CARD}`}>
      <div className="p-4 sm:p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
            <span className="font-semibold text-[#111018] dark:text-slate-100 text-sm truncate">
              {log.user?.fullName || log.user?.email || "Usuario desconocido"}
            </span>
            {log.user?.email && log.user?.fullName && (
              <span className="text-xs text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                {log.user.email}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                BADGE_TONE[actionCfg.badgeClass] ?? BADGE_TONE["badge-ghost"]
              }`}
            >
              {actionCfg.label}
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">{formatRelativeTime(log.createdAt)}</span>
          </div>
          {log.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{log.description}</p>
          )}
        </div>
        {(log.ipAddress || log.userAgent || log.metadata) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:hover:bg-slate-800"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
      {expanded && (
        <div className="px-4 sm:px-5 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
          {log.ipAddress && (
            <div className="flex gap-2">
              <span className="font-bold text-slate-400 dark:text-slate-500 shrink-0">IP:</span>
              <span className="break-all">{log.ipAddress}</span>
            </div>
          )}
          {log.userAgent && (
            <div className="flex gap-2">
              <span className="font-bold text-slate-400 dark:text-slate-500 shrink-0">UA:</span>
              <span className="break-all truncate">{log.userAgent}</span>
            </div>
          )}
          {log.metadata && (
            <div className="flex gap-2">
              <span className="font-bold text-slate-400 dark:text-slate-500 shrink-0">Meta:</span>
              <pre className="text-xs text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/80 rounded-lg p-2 overflow-x-auto w-full border border-slate-200/40 dark:border-slate-800">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ACTION_OPTIONS = [
  { value: "", label: "Todas las acciones" },
  { value: "LOGIN", label: "Inicio de sesión" },
  { value: "LOGOUT", label: "Cierre de sesión" },
  { value: "CREATE", label: "Creación" },
  { value: "UPDATE", label: "Actualización" },
  { value: "DELETE", label: "Eliminación" },
];

export default function ActivityPage() {
  const {
    data: feed,
    loading,
    loadingMore,
    error: feedError,
    nextCursor,
    filters,
    loadMore,
    setFilters,
    refetch: refetchFeed,
  } = useActivityFeed();

  const {
    stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useActivityStats();

  const [localUserId, setLocalUserId] = useState("");

  const handleActionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilters({ ...filters, action: e.target.value || undefined });
    },
    [filters, setFilters],
  );

  const handleUserIdSearch = useCallback(() => {
    setFilters({ ...filters, userId: localUserId || undefined });
  }, [filters, localUserId, setFilters]);

  const handleUserIdKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleUserIdSearch();
    },
    [handleUserIdSearch],
  );

  const handleFromDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters({ ...filters, fromDate: e.target.value || undefined });
    },
    [filters, setFilters],
  );

  const handleToDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters({ ...filters, toDate: e.target.value || undefined });
    },
    [filters, setFilters],
  );

  const clearFilters = useCallback(() => {
    setLocalUserId("");
    setFilters({});
  }, [setFilters]);

  const handleRefresh = useCallback(() => {
    refetchFeed();
    refetchStats();
  }, [refetchFeed, refetchStats]);

  const hasActiveFilters = filters.action || filters.userId || filters.fromDate || filters.toDate;
  const hasStats = stats && !statsLoading && !statsError;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span>Actividad</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Auditoría del sistema</span>
          </div>
          <h1 className={`${PAGE_TITLE} flex items-center gap-2`}>
            <Activity className="text-[#b2944a]" size={28} />
            Feed de Actividad
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Historial de acciones y eventos registrados en el sistema.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className={BTN_GHOST}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refrescar
        </button>
      </div>

      {hasStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`rounded-2xl p-5 flex items-center gap-4 ${GLASS}`}>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Total Acciones</p>
              <h3 className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-[#111018] dark:text-slate-100">
                {stats!.totalActions.toLocaleString("es-ES")}
              </h3>
            </div>
          </div>
          <div className={`rounded-2xl p-5 flex items-center gap-4 ${GLASS}`}>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Calendar size={22} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Acciones Hoy</p>
              <h3 className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-[#111018] dark:text-slate-100">
                {stats!.dailyTrend?.length > 0
                  ? stats!.dailyTrend[stats!.dailyTrend.length - 1].count.toLocaleString("es-ES")
                  : 0}
              </h3>
            </div>
          </div>
          <div className={`rounded-2xl p-5 flex items-center gap-4 ${GLASS}`}>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Users size={22} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Usuarios Activos</p>
              <h3 className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-[#111018] dark:text-slate-100">
                {stats!.topUsers?.length || 0}
              </h3>
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-2xl p-4 sm:p-5 ${GLASS}`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col w-full sm:w-auto min-w-[160px]">
            <label className="pb-1">
              <span className={`${LABEL_SM} flex items-center gap-1`}>
                <Filter size={12} /> Acción
              </span>
            </label>
            <select
              className={INPUT}
              value={filters.action || ""}
              onChange={handleActionChange}
            >
              {ACTION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col w-full sm:w-auto min-w-[180px]">
            <label className="pb-1">
              <span className={`${LABEL_SM} flex items-center gap-1`}>
                <Search size={12} /> Usuario ID
              </span>
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                className={`${INPUT} placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                placeholder="Buscar por ID..."
                value={localUserId}
                onChange={e => setLocalUserId(e.target.value)}
                onKeyDown={handleUserIdKeyDown}
              />
              <button
                onClick={handleUserIdSearch}
                className={`px-3 py-2 text-sm ${CTA_BRASS}`}
              >
                <Search size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-col w-full sm:w-auto min-w-[140px]">
            <label className="pb-1">
              <span className={`${LABEL_SM} flex items-center gap-1`}>
                <Calendar size={12} /> Desde
              </span>
            </label>
            <input
              type="date"
              className={INPUT}
              value={filters.fromDate || ""}
              onChange={handleFromDateChange}
            />
          </div>

          <div className="flex flex-col w-full sm:w-auto min-w-[140px]">
            <label className="pb-1">
              <span className={`${LABEL_SM} flex items-center gap-1`}>
                <Calendar size={12} /> Hasta
              </span>
            </label>
            <input
              type="date"
              className={INPUT}
              value={filters.toDate || ""}
              onChange={handleToDateChange}
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30"
            >
              <X size={14} />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {loading && feed.length === 0 && (
          <div className="min-h-[40vh] w-full flex flex-col items-center justify-center bg-transparent">
            <Loader2 className="h-10 w-10 animate-spin text-slate-400 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
              Cargando feed de actividad...
            </p>
          </div>
        )}

        {!loading && feedError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 max-w-2xl mx-auto my-8 shadow-sm text-center dark:border-red-900/40 dark:bg-red-950/40">
            <div className="flex justify-center mb-4 text-red-500 dark:text-red-400">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">Error al cargar actividad</h3>
            <p className="text-red-600 dark:text-red-400 mb-6">{feedError}</p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-6 py-2 text-sm font-semibold text-white transition-colors mx-auto"
            >
              <RefreshCw size={16} />
              Intentar de nuevo
            </button>
          </div>
        )}

        {!loading && !feedError && feed.length === 0 && (
          <div className="min-h-[40vh] w-full flex flex-col items-center justify-center bg-transparent">
            <Activity className="h-14 w-14 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-1">Sin actividad</h3>
            <p className="text-slate-400 dark:text-slate-500 text-sm">No hay actividad registrada{hasActiveFilters ? " con los filtros actuales" : ""}.</p>
          </div>
        )}

        {!loading && !feedError && feed.length > 0 && (
          <>
            <div className="space-y-3">
              {feed.map(log => (
                <ActivityItem key={log.id} log={log} />
              ))}
            </div>

            {nextCursor && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1a2a46]/15 px-8 py-2 text-sm font-medium text-[#1a2a46]/80 hover:bg-[#1a2a46]/[0.05] transition-colors disabled:opacity-40 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    "Cargar más"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
