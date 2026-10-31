"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/context/i18n.context";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { apiClient } from "@/shared/api/api.client";
import { DashboardEndpoints } from "@/features/dashboard/service/dashboard.endpoints";
import { useActivityFeed } from "@/features/dashboard/hooks/useActivityFeed";
import { useActivityStats } from "@/features/dashboard/hooks/useActivityStats";
import { LineChart } from "@/shared/components/molecules/Charts/LineChart";
import { PieChart } from "@/shared/components/molecules/Charts/PieChart";
import {
  getActionConfig,
  formatRelativeTime,
  getUserFullName,
  getUserInitials,
} from "@/shared/lib/activity.mapper";
import type { RenderPieChart } from "@/types/backend/dashboard.type";
import type { IActivityLog } from "@/types/backend/activity.type";
import {
  Activity,
  Users,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export type ActivityScope = "SELF" | "GLOBAL" | "CLINIC";

export interface ActivityDashboardProps {
  /**
   * SELF: actividad del nutricionista autenticado (feed + stats filtradas por userId).
   * GLOBAL: actividad de todos los nutricionistas, con filtro por usuario.
   * CLINIC: reservado para un rol futuro; por ahora se renderiza igual que GLOBAL.
   */
  scope: ActivityScope;
  /** Id del usuario actual cuando scope === "SELF" (fallback: auth store). */
  userId?: string;
  /** Título opcional para la sección. */
  title?: string;
}

interface NutritionistOption {
  id: string;
  name: string;
}

function ActivityFeedItem({ log }: { log: IActivityLog }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const actionCfg = getActionConfig(log.action, t);
  const hasDetails = Boolean(log.ipAddress || log.userAgent || log.metadata);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
      <div className="p-4 sm:p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-sm shrink-0">
          {getUserInitials(log)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
              {getUserFullName(log)}
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
          {log.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{log.description}</p>}
        </div>
        {hasDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn btn-ghost btn-xs btn-square text-slate-400 dark:text-slate-500 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Ver detalles"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
      {expanded && hasDetails && (
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

export default function ActivityDashboard({ scope, userId, title }: ActivityDashboardProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);

  const isGlobalScope = scope === "GLOBAL" || scope === "CLINIC";
  const isSelfScope = scope === "SELF";

  const [selectedNutritionistId, setSelectedNutritionistId] = useState("");
  const [nutritionists, setNutritionists] = useState<NutritionistOption[]>([]);

  // El filtro efectivo: SELF siempre filtra por el usuario actual; GLOBAL/CLINIC
  // lo hace por el nutricionista seleccionado en el dropdown (vacío = todos).
  const feedUserId = useMemo(() => {
    if (isSelfScope) return userId || currentUser?.id || undefined;
    return selectedNutritionistId || undefined;
  }, [isSelfScope, userId, currentUser?.id, selectedNutritionistId]);

  // Carga la lista de nutricionistas para el dropdown en scope global.
  useEffect(() => {
    if (!isGlobalScope) return;
    let mounted = true;
    apiClient
      .get(DashboardEndpoints.api.users, { params: { page: 1, limit: 100 } })
      .then((res) => {
        if (!mounted) return;
        const list = res.data?.list || [];
        setNutritionists(
          list
            .map((item: any) => ({
              id: item.id,
              name:
                item.fullName ||
                (item.firstName && item.lastName
                  ? `${item.firstName} ${item.lastName}`
                  : item.email) ||
                item.id,
            }))
            .filter((item: NutritionistOption) => item.id && item.name),
        );
      })
      .catch(() => {
        if (mounted) setNutritionists([]);
      });
    return () => {
      mounted = false;
    };
  }, [isGlobalScope]);

  const {
    data: feed,
    loading,
    loadingMore,
    error: feedError,
    nextCursor,
    setFilters,
    loadMore,
    refetch: refetchFeed,
  } = useActivityFeed();

  // Refetch del feed cuando cambia el usuario filtrado.
  useEffect(() => {
    setFilters({ userId: feedUserId });
  }, [setFilters, feedUserId]);

  const {
    stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useActivityStats({ userId: feedUserId });

  const handleRefresh = useCallback(() => {
    refetchFeed();
    refetchStats();
  }, [refetchFeed, refetchStats]);

  const dailyTrend = stats?.dailyTrend || [];
  const lastDayCount = dailyTrend.length > 0 ? dailyTrend[dailyTrend.length - 1].count : 0;

  const lineLabels = useMemo(() => dailyTrend.map((d) => d.date), [dailyTrend]);
  const lineValues = useMemo(() => dailyTrend.map((d) => d.count), [dailyTrend]);

  const pieConfig: RenderPieChart = useMemo(() => {
    const data = (stats?.actionsByType || []).map((d) => ({
      label: getActionConfig(d.action, t).label,
      count: d.count,
    }));
    return {
      id: "activity-actions-by-type",
      title: t("dashboard.activity.actions_by_type"),
      data,
      keyLabel: "label",
      keyValue: "count",
      type: "doughnut" as const,
    };
  }, [stats, t]);

  const actionsPerUser =
    stats && stats.topUsers.length > 0
      ? Math.round(stats.totalActions / stats.topUsers.length)
      : stats?.totalActions || 0;

  const hasStats = stats && !statsLoading && !statsError;

  return (
    <section className="w-full space-y-6 font-sans text-slate-800 dark:text-slate-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Activity className="text-primary" size={22} />
            {title || t("dashboard.activity.title")}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">{t("dashboard.activity.subtitle")}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="btn btn-outline btn-sm rounded-xl flex items-center gap-2 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {t("dashboard.activity.refresh")}
        </button>
      </div>

      {/* FILTRO DE NUTRICIONISTA (solo scope global) */}
      {isGlobalScope && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs p-4 sm:p-5">
          <div className="form-control w-full sm:w-auto min-w-[220px]">
            <label className="label py-1">
              <span className="label-text text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Users size={12} /> {t("dashboard.activity.filter_user")}
              </span>
            </label>
            <select
              className="select select-bordered select-sm rounded-xl text-sm w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
              value={selectedNutritionistId}
              onChange={(e) => setSelectedNutritionistId(e.target.value)}
            >
              <option value="" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                {t("dashboard.activity.all_users")}
              </option>
              {nutritionists.map((n) => (
                <option key={n.id} value={n.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      {hasStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                {t("dashboard.activity.total_actions")}
              </p>
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
              <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                {t("dashboard.activity.actions_today")}
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {lastDayCount.toLocaleString("es-ES")}
              </h3>
            </div>
          </div>
          {isGlobalScope ? (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Users size={22} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                  {t("dashboard.activity.active_users")}
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats!.topUsers.length || 0}
                </h3>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Users size={22} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                  {t("dashboard.activity.actions_per_day")}
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {actionsPerUser.toLocaleString("es-ES")}
                </h3>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GRÁFICOS */}
      {hasStats && dailyTrend.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">
              {t("dashboard.activity.daily_trend")}
            </h3>
            <div className="h-72">
              <LineChart
                title={t("dashboard.activity.actions_by_type")}
                labels={lineLabels}
                data={lineValues}
                labelName={t("dashboard.activity.total_actions")}
                className="h-full"
              />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">
              {t("dashboard.activity.actions_by_type")}
            </h3>
            <div className="h-72 flex items-center justify-center">
              <PieChart config={pieConfig} className="h-full" />
            </div>
          </div>
        </div>
      )}

      {/* FEED */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Activity size={18} className="text-slate-400 dark:text-slate-500" />
          {t("dashboard.activity.recent_activity")}
        </h3>

        {loading && feed.length === 0 && (
          <div className="min-h-[30vh] w-full flex flex-col items-center justify-center bg-transparent">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
              {t("dashboard.activity.loading")}
            </p>
          </div>
        )}

        {!loading && feedError && (
          <div className="card bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-6 rounded-2xl shadow-sm text-center">
            <div className="flex justify-center mb-4 text-red-500 dark:text-red-400">
              <AlertCircle size={40} />
            </div>
            <h4 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">
              {t("dashboard.activity.error_title")}
            </h4>
            <p className="text-red-600 dark:text-red-400 mb-4">{feedError}</p>
            <button
              onClick={handleRefresh}
              className="btn btn-error text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={16} />
              {t("dashboard.activity.retry")}
            </button>
          </div>
        )}

        {!loading && !feedError && feed.length === 0 && (
          <div className="min-h-[30vh] w-full flex flex-col items-center justify-center bg-transparent">
            <Activity className="h-14 w-14 text-slate-300 dark:text-slate-600 mb-4" />
            <h4 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-1">
              {t("dashboard.activity.empty")}
            </h4>
            <p className="text-slate-400 dark:text-slate-500 text-sm">{t("dashboard.activity.empty_description")}</p>
          </div>
        )}

        {!loading && !feedError && feed.length > 0 && (
          <>
            <div className="space-y-3">
              {feed.map((log) => (
                <ActivityFeedItem key={log.id} log={log} />
              ))}
            </div>
            {nextCursor && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn btn-outline rounded-xl px-8 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t("dashboard.activity.loading")}
                    </>
                  ) : (
                    t("dashboard.activity.load_more")
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
