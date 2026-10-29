'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { ModuleScope } from '../types';

const SCOPE_LABELS: Record<ModuleScope, string> = {
  TENANT: 'Clínica',
  USER: 'Usuario',
  OPERATOR: 'Operador',
  ADMIN: 'Administrador',
};

const SCOPE_CLASSES: Record<ModuleScope, string> = {
  TENANT: 'bg-primary/10 text-primary',
  USER: 'bg-info/10 text-info',
  OPERATOR: 'bg-warning/10 text-warning',
  ADMIN: 'bg-error/10 text-error',
};

interface ModuleShellProps {
  title: string;
  scope: ModuleScope;
  icon?: LucideIcon;
  description?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Common chrome for every module dashboard: header (title/icon + scope badge),
 * plus the loading/error states. The registered component renders inside.
 */
export function ModuleShell({
  title,
  scope,
  icon: IconComponent,
  description,
  loading = false,
  error = null,
  onRetry,
  actions,
  children,
}: ModuleShellProps) {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {IconComponent && (
            <div className="p-2.5 rounded-xl bg-base-200 text-base-content/70 shrink-0">
              <IconComponent size={20} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-base-content tracking-tight truncate">
                {title}
              </h1>
              <span
                className={cn(
                  'badge badge-sm border-none px-2.5 py-1 font-bold',
                  SCOPE_CLASSES[scope],
                )}
              >
                {SCOPE_LABELS[scope]}
              </span>
            </div>
            {description && (
              <p className="text-xs text-base-content/60 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 p-6 text-base-content/60">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando panel del módulo...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-medium flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-xs btn-outline border-error/40 text-error hover:bg-error hover:text-error-content"
            >
              <RotateCcw size={13} /> Reintentar
            </button>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
