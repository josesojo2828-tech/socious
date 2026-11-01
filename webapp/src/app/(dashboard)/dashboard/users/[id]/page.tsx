"use client";

import { useUserDetail } from "@/features/dashboard/hooks/useUserDetail";
import { InternalLink } from "@/shared/components/atoms/InternalLink";
import { apiClient } from "@/shared/api/api.client";
import { useParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import type { IActivityLog } from "@/types/backend/activity.type";
import {
  ArrowLeft,
  User,
  Wallet,
  Calendar,
  Loader2,
  AlertCircle,
  UtensilsCrossed,
  Package,
  BarChart3,
} from "lucide-react";
import { Tabs } from "@/shared/components/organisms/Tabs";
import type { TabEntry } from "@/shared/components/organisms/Tabs/Tabs.types";
import { GeneralTab } from "@/features/dashboard/components/user-detail/GeneralTab";
import { NutritionalTab } from "@/features/dashboard/components/user-detail/NutritionalTab";
import { ModulesTab } from "@/features/dashboard/components/user-detail/ModulesTab";
import { BillingTab } from "@/features/dashboard/components/user-detail/BillingTab";
import { StatsTab } from "@/features/dashboard/components/user-detail/StatsTab";
import {
  BRASS_DOT,
  EYEBROW,
  GLASS,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";

function getInitials(firstName?: string | null, lastName?: string | null, email?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (lastName) return lastName[0].toUpperCase();
  return (email?.[0] || "?").toUpperCase();
}

function getStatusBadgeClass(status: string): string {
  if (status === "ACTIVE") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (status === "SUSPENDED") return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "border-slate-500/30 bg-slate-500/10 text-slate-500 dark:text-slate-400";
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params?.id as string | undefined;

  const { userDetail, loading, error, refetch } = useUserDetail(userId);

  const [activityFeed, setActivityFeed] = useState<IActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const run = async () => {
      setActivityLoading(true);
      try {
        const res = await apiClient.get<{ data: IActivityLog[] }>(
          "/api/dashboard/activity/feed",
          { params: { userId, limit: 10 } },
        );
        if (!cancelled) setActivityFeed(res.data.data || []);
      } catch {
        if (!cancelled) setActivityFeed([]);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const items = useMemo<TabEntry[]>(() => {
    if (!userDetail?.user) return [];
    const { user, wallet, subscription, stats } = userDetail;

    return [
      {
        label: "General",
        value: "general",
        icon: User,
        content: (
          <GeneralTab
            user={user}
            wallet={wallet}
            subscription={subscription}
            stats={stats}
          />
        ),
      },
      {
        label: "Nutricional",
        value: "nutritional",
        icon: UtensilsCrossed,
        content: (
          <NutritionalTab user={user} stats={stats} onRefetch={refetch} />
        ),
      },
      {
        label: "Módulos",
        value: "modules",
        icon: Package,
        content: <ModulesTab userId={user.id} onUpdated={refetch} />,
      },
      {
        label: "Suscripción y pagos",
        value: "billing",
        icon: Wallet,
        content: (
          <BillingTab
            user={user}
            wallet={wallet}
            subscription={subscription}
            onRefetch={refetch}
          />
        ),
      },
      {
        label: "Estadísticas y resumen",
        value: "stats",
        icon: BarChart3,
        content: (
          <StatsTab
            user={user}
            stats={stats}
            activityFeed={activityFeed}
            activityLoading={activityLoading}
          />
        ),
      },
    ];
  }, [userDetail, refetch, activityFeed, activityLoading]);

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center bg-transparent">
        <Loader2 className="h-12 w-12 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
          Cargando ficha del usuario...
        </p>
      </div>
    );
  }

  if (error || !userDetail) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 max-w-2xl mx-auto my-12 shadow-sm text-center dark:border-red-900/40 dark:bg-red-950/40">
        <div className="flex justify-center mb-4 text-red-500">
          <AlertCircle size={48} />
        </div>
        <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">Error al cargar datos</h3>
        <p className="text-red-600 dark:text-red-400 mb-6">
          {error || "No se pudo establecer conexión con el backend."}
        </p>
        <button
          onClick={refetch}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-6 py-2 text-sm font-semibold text-white transition-colors mx-auto"
        >
          <Loader2 size={16} />
          Intentar de nuevo
        </button>
      </div>
    );
  }

  if (!userDetail.user) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center bg-transparent">
        <User className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-bold text-[#111018] dark:text-slate-100">Usuario no encontrado</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          El usuario solicitado no existe o ha sido eliminado.
        </p>
        <InternalLink
          href="/dashboard/users"
          className="mt-4 inline-flex items-center gap-1 text-sm text-[#1a2a46]/80 hover:underline dark:text-slate-300"
        >
          <ArrowLeft size={16} />
          Volver a usuarios
        </InternalLink>
      </div>
    );
  }

  const { user } = userDetail;
  const name = user.fullName || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Back button */}
      <InternalLink
        href="/dashboard/users"
        variant="hover"
        className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#111018] dark:hover:text-slate-100 flex items-center gap-1.5 no-underline hover:underline w-fit"
      >
        <ArrowLeft size={16} />
        Volver a usuarios
      </InternalLink>

      {/* Header Section */}
      <div className={`rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 ${GLASS}`}>
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1a2a46] to-[#2f4a78] flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0">
          {getInitials(user.firstName, user.lastName, user.email)}
        </div>
        <div className="flex-1 min-w-0">
          <div className={EYEBROW}>
            <span>Usuarios</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Ficha</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className={`${PAGE_TITLE} truncate`}>{name}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${getStatusBadgeClass(user.status)}`}>
              {user.status}
            </span>
            <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
              {user.permitName}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
            {user.username && (
              <span className="font-mono">@{user.username}</span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Miembro desde {new Date(user.createdAt).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Tabbed ficha */}
      <Tabs items={items} defaultValue="general" variant="lifted" />
    </div>
  );
}
