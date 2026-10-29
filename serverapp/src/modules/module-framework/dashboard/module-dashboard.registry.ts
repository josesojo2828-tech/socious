import { Inject, Injectable, Optional } from "@nestjs/common";
import { ModuleDashboardProvider } from "./module-dashboard.provider";

/**
 * DI token for the list of dashboard providers. Future module modules add their
 * provider by contributing to this token (multi-provider); the registry
 * flattens them into a `Map<Module.key, provider>`.
 */
export const MODULE_DASHBOARD_PROVIDERS = Symbol("MODULE_DASHBOARD_PROVIDERS");

/**
 * `Map<Module.key, ModuleDashboardProvider>` (design D7). Unregistered keys
 * resolve to `undefined` so the controller can answer 404/fallback instead of
 * crashing.
 */
@Injectable()
export class ModuleDashboardRegistry {
  private readonly providers = new Map<string, ModuleDashboardProvider>();

  constructor(
    @Optional()
    @Inject(MODULE_DASHBOARD_PROVIDERS)
    providers: ModuleDashboardProvider[] = [],
  ) {
    for (const provider of providers) {
      this.register(provider);
    }
  }

  register(provider: ModuleDashboardProvider): void {
    this.providers.set(provider.moduleKey, provider);
  }

  has(key: string): boolean {
    return this.providers.has(key);
  }

  get(key: string): ModuleDashboardProvider | undefined {
    return this.providers.get(key);
  }

  list(): ModuleDashboardProvider[] {
    return [...this.providers.values()];
  }
}
