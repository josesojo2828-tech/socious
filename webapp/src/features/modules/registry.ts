import type { ModuleDashboardComponent } from './types';

/**
 * Frontend counterpart of the backend `ModuleDashboardRegistry`: maps the
 * stable `Module.key` to the component that renders its dashboard.
 *
 * The 12 business modules are out of scope for the framework change, so the
 * registry starts empty — `ModuleDashboardHost` renders `ModuleFallback` for
 * any unregistered key. Each module registers itself by adding an entry here
 * (or via `registerModuleDashboard`) keyed by its machine key.
 */
export const MODULE_DASHBOARDS: Record<string, ModuleDashboardComponent> = {};

/** Resolve the dashboard component for a module key (undefined ⇒ fallback). */
export function getModuleDashboard(
  moduleKey: string,
): ModuleDashboardComponent | undefined {
  return MODULE_DASHBOARDS[moduleKey];
}

/** Register (or replace) the dashboard component for a module key. */
export function registerModuleDashboard(
  moduleKey: string,
  component: ModuleDashboardComponent,
): void {
  MODULE_DASHBOARDS[moduleKey] = component;
}
