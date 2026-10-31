'use client';

import { Activity, ExternalLink, Loader2, BarChart3, Users, CreditCard, LogIn, MessageSquare } from 'lucide-react';
import { InternalLink } from '@/shared/components/atoms/InternalLink';
import { Field, SectionCard } from './SectionCard';
import type { IActivityLog } from '@/types/backend/activity.type';
import type { UserDetailStats, UserDetailUser } from '@/types/backend/user-detail.type';

interface StatsTabProps {
  user: UserDetailUser;
  stats: UserDetailStats;
  activityFeed: IActivityLog[];
  activityLoading: boolean;
}

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function MetricCard({
  icon: IconComponent,
  iconClassName,
  value,
  label,
}: {
  icon: typeof Users;
  iconClassName: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-base-300 bg-base-200/40 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${iconClassName}`}>
        <IconComponent size={18} />
      </div>
      <div>
        <p className="text-2xl font-black text-base-content leading-none">{value}</p>
        <p className="text-[11px] text-base-content/50 font-medium mt-1">{label}</p>
      </div>
    </div>
  );
}

export function StatsTab({ user, stats, activityFeed, activityLoading }: StatsTabProps) {
  return (
    <div className="space-y-6">
      <SectionCard title="Estadísticas y Resumen" icon={BarChart3}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            icon={Users}
            iconClassName="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
            value={stats.totalPatients}
            label="Total pacientes"
          />
          <MetricCard
            icon={CreditCard}
            iconClassName="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
            value={stats.totalTransactions}
            label="Total transacciones"
          />
          <MetricCard
            icon={Activity}
            iconClassName="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
            value={stats.totalActivityLogs}
            label="Total activity logs"
          />
          <MetricCard
            icon={LogIn}
            iconClassName="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
            value={stats.totalLogins}
            label="Inicios de sesión"
          />
          <MetricCard
            icon={MessageSquare}
            iconClassName="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
            value={stats.totalReferrals}
            label="Referidos"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-base-300 text-sm">
          <Field label="Último inicio de sesión">
            {stats.lastLogin ? new Date(stats.lastLogin).toLocaleString('es-ES') : 'Nunca'}
          </Field>
          <Field label="Última IP">
            <span className="font-mono">{stats.lastLoginIp || 'N/A'}</span>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Actividad Reciente"
        icon={Activity}
        bodyClassName="p-0"
        actions={
          <InternalLink
            href={`/dashboard/activity?userId=${user.id}`}
            variant="hover"
            className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 no-underline hover:underline"
          >
            Ver toda la actividad
            <ExternalLink size={12} />
          </InternalLink>
        }
      >
        <div className="divide-y divide-base-300">
          {activityLoading ? (
            <div className="p-6 text-center">
              <Loader2 size={20} className="animate-spin text-base-content/50 mx-auto" />
            </div>
          ) : activityFeed.length === 0 ? (
            <div className="p-6 text-center text-base-content/50 text-sm">
              Sin actividad registrada
            </div>
          ) : (
            activityFeed.slice(0, 8).map((log) => (
              <div
                key={log.id}
                className="px-6 py-4 flex items-start gap-3 hover:bg-base-200/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center shrink-0 text-xs font-bold text-base-content/70 uppercase">
                  {log.action.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-base-content truncate">
                    {log.description || log.action}
                  </p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    {relativeTime(log.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
