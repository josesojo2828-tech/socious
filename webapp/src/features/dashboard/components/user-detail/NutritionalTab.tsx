'use client';

import {
  Activity,
  UtensilsCrossed,
  ListChecks,
  Users,
  ArrowRight,
} from 'lucide-react';
import { InternalLink } from '@/shared/components/atoms/InternalLink';
import { SectionCard } from './SectionCard';
import { AccreditationAuditCard } from '@/features/dashboard/components/AccreditationAuditCard';
import type { UserDetailStats, UserDetailUser } from '@/types/backend/user-detail.type';

interface NutritionalTabProps {
  user: UserDetailUser;
  stats: UserDetailStats;
  /** Refetch the user detail after an accreditation review. */
  onRefetch?: () => void;
}

function ResourceCard({
  icon: IconComponent,
  iconClassName,
  title,
  description,
  href,
  metric,
}: {
  icon: typeof Users;
  iconClassName: string;
  title: string;
  description: string;
  href: string;
  metric?: string;
}) {
  return (
    <InternalLink
      href={href}
      variant="hover"
      className="group bg-base-100 p-5 rounded-2xl border border-base-300 shadow-xs flex items-center gap-4 hover:shadow-md hover:border-primary/40 transition-all no-underline"
    >
      <div className={`p-3 rounded-xl ${iconClassName}`}>
        <IconComponent size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-base-content">{title}</h4>
          {metric && (
            <span className="badge badge-sm border-none px-2 py-0.5 font-bold bg-base-200 text-base-content/70">
              {metric}
            </span>
          )}
        </div>
        <p className="text-xs text-base-content/60 mt-0.5">{description}</p>
      </div>
      <ArrowRight
        size={16}
        className="text-base-content/30 group-hover:text-primary transition-colors shrink-0"
      />
    </InternalLink>
  );
}

export function NutritionalTab({ user, stats, onRefetch }: NutritionalTabProps) {
  return (
    <div className="space-y-6">
      {/* Resumen operativo */}
      <SectionCard title="Resumen Operativo" icon={Activity}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ResourceCard
            icon={Users}
            iconClassName="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
            title="Pacientes"
            description="Pacientes registrados por este profesional."
            href="/dashboard/patients"
            metric={String(stats.totalPatients)}
          />
          <ResourceCard
            icon={UtensilsCrossed}
            iconClassName="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
            title="Menús"
            description="Planes de menús y dietas creados en la plataforma."
            href="/dashboard/menu"
          />
          <ResourceCard
            icon={ListChecks}
            iconClassName="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
            title="Listas de intercambio"
            description="Listas de equivalentes y grupos de alimentos."
            href="/dashboard/exchange-list"
          />
        </div>
      </SectionCard>

      {/* Acreditación profesional (funcionalidad preservada) */}
      <AccreditationAuditCard
        userId={user.id}
        username={user.username}
        onStatusUpdated={onRefetch}
      />
    </div>
  );
}
