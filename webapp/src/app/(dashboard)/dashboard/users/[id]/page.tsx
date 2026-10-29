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

function getInitials(firstName?: string | null, lastName?: string | null, email?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (lastName) return lastName[0].toUpperCase();
  return (email?.[0] || "?").toUpperCase();
}

function getStatusBadgeClass(status: string): string {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (status === "SUSPENDED") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300";
  return "bg-base-200 text-base-content/70";
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
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-base-content/70 font-medium animate-pulse">
          Cargando ficha del usuario...
        </p>
      </div>
    );
  }

  if (error || !userDetail) {
    return (
      <div className="card bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-6 rounded-2xl max-w-2xl mx-auto my-12 shadow-sm text-center">
        <div className="flex justify-center mb-4 text-red-500">
          <AlertCircle size={48} />
        </div>
        <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">Error al cargar datos</h3>
        <p className="text-red-600 dark:text-red-400 mb-6">
          {error || "No se pudo establecer conexión con el backend."}
        </p>
        <button
          onClick={refetch}
          className="btn btn-error text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 mx-auto"
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
        <User className="h-16 w-16 text-base-content/30 mb-4" />
        <h3 className="text-lg font-bold text-base-content">Usuario no encontrado</h3>
        <p className="text-base-content/70 mt-1">
          El usuario solicitado no existe o ha sido eliminado.
        </p>
        <InternalLink
          href="/dashboard/users"
          className="mt-4 text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
    <div className="w-full space-y-6 font-sans text-base-content pb-16 animate-fade-in">
      {/* Back button */}
      <InternalLink
        href="/dashboard/users"
        variant="hover"
        className="text-sm text-base-content/70 hover:text-base-content flex items-center gap-1.5 no-underline hover:underline"
      >
        <ArrowLeft size={16} />
        Volver a usuarios
      </InternalLink>

      {/* Header Section */}
      <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0">
          {getInitials(user.firstName, user.lastName, user.email)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-base-content truncate">{name}</h1>
            <span className={`badge badge-sm border-none px-2.5 py-1 font-bold ${getStatusBadgeClass(user.status)}`}>
              {user.status}
            </span>
            <span className="badge badge-sm border-none px-2.5 py-1 font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
              {user.permitName}
            </span>
          </div>
          <p className="text-base-content/70 text-sm">{user.email}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-base-content/50">
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
