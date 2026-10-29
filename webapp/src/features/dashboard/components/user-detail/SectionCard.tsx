'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  /** Right-aligned header content (badges, actions, links). */
  actions?: ReactNode;
  children: ReactNode;
  /** Remove inner padding (e.g. for tables/lists that manage their own). */
  bodyClassName?: string;
  className?: string;
}

/** Consistent card shell used by every tab of the user detail ficha. */
export function SectionCard({
  title,
  icon: IconComponent,
  iconClassName,
  actions,
  children,
  bodyClassName,
  className,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        'bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden',
        className,
      )}
    >
      <div className="px-6 py-4 border-b border-base-300 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {IconComponent && (
            <IconComponent size={18} className={cn('text-base-content/50 shrink-0', iconClassName)} />
          )}
          <h3 className="font-bold text-base-content truncate">{title}</h3>
        </div>
        {actions}
      </div>
      <div className={cn('p-6', bodyClassName)}>{children}</div>
    </div>
  );
}

/** Small labelled value used across the ficha grids. */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
        {label}
      </p>
      <div className="mt-1 font-medium text-base-content">{children}</div>
    </div>
  );
}

/** Status pill shared by status-like strings (ACTIVE, PAID, ...). */
export function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE' || status === 'PAID' || status === 'SUCCESS'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
      : status === 'SUSPENDED' || status === 'PENDING' || status === 'ISSUED'
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300'
        : status === 'FAILED' || status === 'CANCELED' || status === 'VOID' || status === 'EXPIRED'
          ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
          : 'bg-base-200 text-base-content/70';

  return (
    <span className={cn('badge badge-sm border-none px-2.5 py-1 font-bold', cls)}>
      {status}
    </span>
  );
}
