import type { ComponentType } from 'react';

/**
 * Scope a module dashboard can be rendered in. Mirrors the backend
 * `ModuleScope` enum (`serverapp/prisma/schema.prisma`) and the scopes declared
 * on each catalog `Module`.
 */
export type ModuleScope = 'TENANT' | 'USER' | 'OPERATOR' | 'ADMIN';

/**
 * Payload returned by `GET /api/modules/:key/dashboard`. The backend provider
 * adapts `data` to the requested scope; the frontend component is the same for
 * every scope and receives the payload as a prop.
 */
export interface ModuleDashboardPayload {
  moduleKey: string;
  scope: ModuleScope;
  kind: string | null;
  data: unknown;
}

/**
 * Props every registered module dashboard component receives from
 * `ModuleDashboardHost`. One component per `Module.key`, adapted by `scope`.
 */
export interface ModuleDashboardProps {
  moduleKey: string;
  scope: ModuleScope;
  /** Only meaningful for the `USER` scope; `null` otherwise. */
  userId: string | null;
  payload: ModuleDashboardPayload;
}

/** A module dashboard component registered under its stable `Module.key`. */
export type ModuleDashboardComponent = ComponentType<ModuleDashboardProps>;
