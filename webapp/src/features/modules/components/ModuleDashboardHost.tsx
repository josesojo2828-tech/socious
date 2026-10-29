'use client';

import type { LucideIcon } from 'lucide-react';
import { getModuleDashboard } from '../registry';
import { useModuleDashboard } from '../hooks/useModuleDashboard';
import type { ModuleScope } from '../types';
import { ModuleFallback } from './ModuleFallback';
import { ModuleShell } from './ModuleShell';

interface ModuleDashboardHostProps {
  moduleKey: string;
  scope: ModuleScope;
  /** Only meaningful for the `USER` scope. */
  userId?: string | null;
  /** Optional header overrides; defaults to a humanized module key. */
  title?: string;
  description?: string;
  icon?: LucideIcon;
}

function humanizeKey(key: string): string {
  return key
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Resolves the dashboard component registered for `moduleKey` and renders it
 * inside `ModuleShell`. Unknown keys render `ModuleFallback`; registered keys
 * fetch their scope-adapted payload via `useModuleDashboard`.
 */
export function ModuleDashboardHost({
  moduleKey,
  scope,
  userId = null,
  title,
  description,
  icon,
}: ModuleDashboardHostProps) {
  const Component = getModuleDashboard(moduleKey);
  const { payload, loading, error, refetch } = useModuleDashboard({
    moduleKey,
    scope,
    userId,
    enabled: Boolean(Component),
  });

  return (
    <ModuleShell
      title={title ?? humanizeKey(moduleKey)}
      scope={scope}
      icon={icon}
      description={description}
      loading={loading}
      error={error}
      onRetry={refetch}
    >
      {!Component ? (
        <ModuleFallback moduleKey={moduleKey} />
      ) : payload ? (
        <Component
          moduleKey={moduleKey}
          scope={scope}
          userId={userId}
          payload={payload}
        />
      ) : null}
    </ModuleShell>
  );
}
