"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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

function ActivityItem({ log }: { log: IActivityLog }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const actionCfg = getActionConfig(log.action, t);
  const initials = useMemo(() => getUserInitials(log), [log]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
      <div className="p-4 sm:p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
              {log.user?.fullName || log.user?.email || "Usuario desconocido"}
            </span>
            {log.user?.email && log.user?.fullName && (
              <span className="text-xs text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                {log.user.email}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`badge badge-sm border-none px-2.5 py-1 font-bold ${actionCfg.badgeClass}`}>
              {actionCfg.label}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(log.createdAt)}</span>
          </div>
          {log.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{log.description}</p>
          )}
        </div>
        {(log.ipAddress || log.userAgent || log.metadata) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn btn-ghost btn-xs btn-square text-slate-400 dark:text-slate-500 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800"
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
  const { t } = useTranslation();
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
    <div className="w-full space-y-8 animate-fade-in font-sans text-slate-800 dark:text-slate-200 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Activity className="text-primary" size={28} />
            Feed de Actividad
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Historial de acciones y eventos registrados en el sistema.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="btn btn-outline btn-sm rounded-xl flex items-center gap-2 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refrescar
        </button>
      </div>

      {hasStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Total Acciones</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {stats!.totalActions.toLocaleString("es-ES")}
              </h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Calendar size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Acciones Hoy</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {stats!.dailyTrend?.length > 0
                  ? stats!.dailyTrend[stats!.dailyTrend.length - 1].count.toLocaleString("es-ES")
                  : 0}
              </h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400">
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Usuarios Activos</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {stats!.topUsers?.length || 0}
              </h3>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="form-control w-full sm:w-auto min-w-[160px]">
            <label className="label py-1">
              <span className="label-text text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Filter size={12} /> Acción
              </span>
            </label>
            <select
              className="select select-bordered select-sm rounded-xl text-sm w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
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

          <div className="form-control w-full sm:w-auto min-w-[180px]">
            <label className="label py-1">
              <span className="label-text text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Search size={12} /> Usuario ID
              </span>
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                className="input input-bordered input-sm rounded-xl text-sm w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="Buscar por ID..."
                value={localUserId}
                onChange={e => setLocalUserId(e.target.value)}
                onKeyDown={handleUserIdKeyDown}
              />
              <button
                onClick={handleUserIdSearch}
                className="btn btn-primary btn-sm rounded-xl"
              >
                <Search size={14} />
              </button>
            </div>
          </div>

          <div className="form-control w-full sm:w-auto min-w-[140px]">
            <label className="label py-1">
              <span className="label-text text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Desde
              </span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm rounded-xl text-sm w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
              value={filters.fromDate || ""}
              onChange={handleFromDateChange}
            />
          </div>

          <div className="form-control w-full sm:w-auto min-w-[140px]">
            <label className="label py-1">
              <span className="label-text text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Hasta
              </span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm rounded-xl text-sm w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
              value={filters.toDate || ""}
              onChange={handleToDateChange}
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn btn-ghost btn-sm rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1"
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
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
              Cargando feed de actividad...
            </p>
          </div>
        )}

        {!loading && feedError && (
          <div className="card bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-6 rounded-2xl max-w-2xl mx-auto my-8 shadow-sm text-center">
            <div className="flex justify-center mb-4 text-red-500 dark:text-red-400">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">Error al cargar actividad</h3>
            <p className="text-red-600 dark:text-red-400 mb-6">{feedError}</p>
            <button
              onClick={handleRefresh}
              className="btn btn-error text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 mx-auto"
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
                  className="btn btn-outline rounded-xl px-8 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
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
