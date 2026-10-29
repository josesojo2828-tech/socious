"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/context/i18n.context";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { RenderPieChart } from "@/types/backend/dashboard.type";
import { LineChart } from "@/shared/components/molecules/Charts/LineChart";
import { BarChart } from "@/shared/components/molecules/Charts/BarChart";
import { PieChart } from "@/shared/components/molecules/Charts/PieChart";
import { MultyLineChart } from "@/shared/components/molecules/Charts/MultiLineChart";
import {
  useAdoptionAnalytics,
  type AdoptionScope,
  type CohortGranularity,
} from "@/features/dashboard/hooks/useAdoptionAnalytics";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  Calculator,
  Filter,
  Globe,
  Loader2,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UserMinus,
  Users,
} from "lucide-react";

const DEFAULT_ADOPTION_TZ = "America/Caracas";

const TZ_OPTIONS = [
  { value: "America/Caracas", label: "America/Caracas (UTC-4)" },
  { value: "America/Bogota", label: "America/Bogota (UTC-5)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
  { value: "America/Mexico_City", label: "America/Mexico_City (UTC-6)" },
  { value: "America/Santiago", label: "America/Santiago (UTC-4/-3)" },
  { value: "UTC", label: "UTC" },
];

const COHORT_COLORS = [
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdoptionPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();

  const permitName = user?.permits?.name;
  const permitList = user?.permits?.list ?? [];
  const isGlobalRole = permitName === "ADMIN" || permitName === "SUPERADMIN";
  const hasDashboardPermit = permitList.includes("PERMIT_DASHBOARD");
  const isOrgWorkspace = activeWorkspace?.type === "ORGANIZATION";

  const canOrg = hasDashboardPermit && isOrgWorkspace;
  const canGlobal = isGlobalRole;
  const hasAccess = canOrg || canGlobal;

  const [scope, setScope] = useState<AdoptionScope>(canOrg ? "org" : "global");
  const [tz, setTz] = useState<string>(DEFAULT_ADOPTION_TZ);
  const [granularity, setGranularity] = useState<CohortGranularity>("week");

  const { activeUsers, dormant, cohorts, funnel, depth, loading, error, refetch } =
    useAdoptionAnalytics({
      scope,
      tz,
      cohortGranularity: granularity,
      enabled: hasAccess,
    });

  const dauWauMauValues = useMemo(
    () => (activeUsers ? [activeUsers.dau, activeUsers.wau, activeUsers.mau] : []),
    [activeUsers],
  );

  const cohortLabels = useMemo(() => {
    const first = cohorts?.cohorts?.[0];
    if (!first) return [];
    return first.retention.map((_, idx) => `+${idx}`);
  }, [cohorts]);

  const cohortDatasets = useMemo(
    () =>
      (cohorts?.cohorts ?? []).map((cohort, idx) => ({
        label: `${cohort.cohort} (n=${cohort.size})`,
        data: cohort.retention,
        color: COHORT_COLORS[idx % COHORT_COLORS.length],
        fill: false,
      })),
    [cohorts],
  );

  const funnelStages = funnel?.stages ?? [];
  const funnelLabels = funnelStages.map((stage) => t(`dashboard.adoption.funnel.${stage.key}`));
  const funnelValues = funnelStages.map((stage) => stage.count);

  const depthConfig: RenderPieChart = {
    id: "adoption-depth",
    title: t("dashboard.adoption.depth.title"),
    data: [
      { label: t("dashboard.adoption.depth.calculators"), value: depth?.calculators ?? 0 },
      { label: t("dashboard.adoption.depth.menus"), value: depth?.menus ?? 0 },
      { label: t("dashboard.adoption.depth.exchange_lists"), value: depth?.exchangeLists ?? 0 },
    ],
    keyLabel: "label",
    keyValue: "value",
    type: "doughnut",
  };

  if (!hasAccess) {
    return (
      <div className="card bg-base-100 border border-base-300 p-10 rounded-2xl max-w-2xl mx-auto my-12 shadow-sm text-center">
        <div className="flex justify-center mb-4 text-amber-500">
          <ShieldAlert size={48} />
        </div>
        <h3 className="text-lg font-bold text-base-content mb-2">
          {t("dashboard.adoption.no_access_title")}
        </h3>
        <p className="text-base-content/70">
          {t("dashboard.adoption.no_access_body")}
        </p>
      </div>
    );
  }

  if (loading && !activeUsers) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center bg-transparent">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-base-content/60 font-medium animate-pulse">
          {t("dashboard.adoption.loading")}
        </p>
      </div>
    );
  }

  if (error && !activeUsers) {
    return (
      <div className="card bg-red-50 border border-red-200 p-6 rounded-2xl max-w-2xl mx-auto my-12 shadow-sm text-center">
        <div className="flex justify-center mb-4 text-red-500">
          <AlertCircle size={48} />
        </div>
        <h3 className="text-lg font-bold text-red-800 mb-2">
          {t("dashboard.adoption.error_title")}
        </h3>
        <p className="text-red-600 mb-6">{error}</p>
        <button
          onClick={refetch}
          className="btn btn-error text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={16} />
          {t("dashboard.adoption.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-fade-in font-sans text-base-content pb-16">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-base-200">
        <div>
          <h1 className="text-3xl font-black text-base-content tracking-tight flex items-center gap-2">
            <TrendingUp className="text-primary" size={28} />
            {t("dashboard.adoption.title")}
          </h1>
          <p className="text-base-content/70 mt-1 text-sm">
            {t("dashboard.adoption.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Scope switch */}
          <div className="flex items-center gap-1 bg-base-200/80 p-1 rounded-xl border border-base-300/40">
            {canOrg && (
              <button
                onClick={() => setScope("org")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  scope === "org" ? "bg-primary text-white shadow-xs" : "text-base-content/70"
                }`}
              >
                {t("dashboard.adoption.scope.org")}
              </button>
            )}
            {canGlobal && (
              <button
                onClick={() => setScope("global")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                  scope === "global" ? "bg-primary text-white shadow-xs" : "text-base-content/70"
                }`}
              >
                <Globe size={13} />
                {t("dashboard.adoption.scope.global")}
              </button>
            )}
          </div>

          {/* Timezone */}
          <label className="flex items-center gap-2 text-xs font-semibold text-base-content/70">
            <Filter size={14} />
            {t("dashboard.adoption.timezone")}
            <select
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="select select-bordered select-xs rounded-lg"
            >
              {TZ_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={refetch}
            className="btn btn-outline btn-sm rounded-xl flex items-center gap-2"
          >
            <RefreshCw size={14} />
            {t("dashboard.adoption.refresh")}
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-base-content/60 uppercase tracking-wider">
              {t("dashboard.adoption.metrics.dau")}
            </p>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
              <Users size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-base-content mt-3">
            {activeUsers?.dau ?? 0}
          </h3>
          <p className="text-[11px] text-base-content/70 mt-0.5">
            {t("dashboard.adoption.metrics.dau_help")}
          </p>
        </div>

        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-base-content/60 uppercase tracking-wider">
              {t("dashboard.adoption.metrics.wau")}
            </p>
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
              <CalendarDays size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-base-content mt-3">
            {activeUsers?.wau ?? 0}
          </h3>
          <p className="text-[11px] text-base-content/70 mt-0.5">
            {t("dashboard.adoption.metrics.wau_help")}
          </p>
        </div>

        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-base-content/60 uppercase tracking-wider">
              {t("dashboard.adoption.metrics.mau")}
            </p>
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500">
              <Activity size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-base-content mt-3">
            {activeUsers?.mau ?? 0}
          </h3>
          <p className="text-[11px] text-base-content/70 mt-0.5">
            {t("dashboard.adoption.metrics.mau_help")}
          </p>
        </div>

        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-base-content/60 uppercase tracking-wider">
              {t("dashboard.adoption.metrics.dormant")}
            </p>
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
              <UserMinus size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-base-content mt-3">
            {dormant?.count ?? 0}
          </h3>
          <p className="text-[11px] text-base-content/70 mt-0.5">
            {t("dashboard.adoption.metrics.dormant_help", { days: dormant?.days ?? 30 })}
          </p>
        </div>
      </div>

      <p className="text-xs text-base-content/50 -mt-4">
        {t("dashboard.adoption.as_of", { date: formatDateTime(activeUsers?.asOf ?? null) })} ·{" "}
        {activeUsers?.tz ?? tz}
      </p>

      {/* ACTIVE USERS + DEPTH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-lg text-base-content flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            {t("dashboard.adoption.metrics.active_users")}
          </h3>
          <div className="mt-4">
            <LineChart
              title={t("dashboard.adoption.metrics.active_users")}
              labels={["DAU", "WAU", "MAU"]}
              data={dauWauMauValues}
              labelName={t("dashboard.adoption.metrics.active_users")}
            />
          </div>
        </div>

        <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg text-base-content flex items-center gap-2">
            <Calculator size={20} className="text-primary" />
            {t("dashboard.adoption.depth.title")}
          </h3>
          <div className="h-64 mt-4 flex items-center justify-center">
            <PieChart config={depthConfig} className="h-full" />
          </div>
        </div>
      </div>

      {/* COHORTS */}
      <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-lg text-base-content flex items-center gap-2">
            <CalendarDays size={20} className="text-primary" />
            {t("dashboard.adoption.cohorts.title")}
          </h3>
          <div className="flex items-center gap-1 bg-base-200/80 p-1 rounded-xl border border-base-300/40">
            {(["week", "month"] as CohortGranularity[]).map((option) => (
              <button
                key={option}
                onClick={() => setGranularity(option)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  granularity === option ? "bg-primary text-white shadow-xs" : "text-base-content/70"
                }`}
              >
                {t(`dashboard.adoption.cohorts.${option}`)}
              </button>
            ))}
          </div>
        </div>

        {cohortDatasets.length === 0 ? (
          <p className="text-sm text-base-content/60 py-10 text-center">
            {t("dashboard.adoption.cohorts.empty")}
          </p>
        ) : (
          <div className="h-80">
            <MultyLineChart
              title=""
              labels={cohortLabels}
              datasets={cohortDatasets}
            />
          </div>
        )}
      </div>

      {/* FUNNEL + DORMANT */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm xl:col-span-2">
          <h3 className="font-bold text-lg text-base-content flex items-center gap-2 mb-4">
            <Filter size={20} className="text-primary" />
            {t("dashboard.adoption.funnel.title")}
          </h3>

          <div className="h-64">
            <BarChart
              title={t("dashboard.adoption.funnel.title")}
              labels={funnelLabels}
              values={funnelValues}
            />
          </div>

          {funnelStages.length > 0 && (
            <div className="overflow-x-auto mt-6">
              <table className="table w-full text-left border-collapse">
                <thead>
                  <tr className="bg-base-200 border-b border-base-300 text-xs font-bold text-base-content/70 uppercase tracking-wider">
                    <th className="px-4 py-3">{t("dashboard.adoption.funnel.stage")}</th>
                    <th className="px-4 py-3">{t("dashboard.adoption.funnel.count")}</th>
                    <th className="px-4 py-3">{t("dashboard.adoption.funnel.conversion_previous")}</th>
                    <th className="px-4 py-3">{t("dashboard.adoption.funnel.conversion_first")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200 text-sm">
                  {funnelStages.map((stage) => (
                    <tr key={stage.key} className="hover:bg-base-200/50 transition-colors">
                      <td className="px-4 py-3 font-semibold">
                        {t(`dashboard.adoption.funnel.${stage.key}`)}
                      </td>
                      <td className="px-4 py-3 font-bold">{stage.count}</td>
                      <td className="px-4 py-3">{stage.conversionFromPrevious}%</td>
                      <td className="px-4 py-3">{stage.conversionFromFirst}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm">
          <h3 className="font-bold text-lg text-base-content flex items-center gap-2 mb-4">
            <UserMinus size={20} className="text-primary" />
            {t("dashboard.adoption.dormant.title")}
          </h3>

          {!dormant || dormant.users.length === 0 ? (
            <p className="text-sm text-base-content/60 py-10 text-center">
              {t("dashboard.adoption.dormant.empty")}
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {dormant.users.map((dormantUser) => (
                <div
                  key={dormantUser.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-base-200 hover:bg-base-200/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-base-content truncate">
                      {dormantUser.name}
                    </p>
                    <p className="text-[11px] text-base-content/60">
                      {t("dashboard.adoption.dormant.last_seen")}:{" "}
                      {formatDateTime(dormantUser.lastSeenAt)}
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    {dormantUser.logins} {t("dashboard.adoption.dormant.logins")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
