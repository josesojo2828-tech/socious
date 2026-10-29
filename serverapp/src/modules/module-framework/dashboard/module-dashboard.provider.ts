import type { ModuleScope } from "@prisma/client";

/**
 * Multi-scope dashboard contract (design D7).
 *
 * Each module registers ONE provider keyed by its stable `Module.key`. The same
 * provider serves every scope the module declares, adapting its payload by the
 * `scope` prop — the frontend resolves the matching component from the same key.
 */
export interface ModuleDashboardContext {
  moduleKey: string;
  scope: ModuleScope;
  userId: string | null;
  organizationId: string | null;
}

export interface ModuleDashboardPayload {
  moduleKey: string;
  scope: ModuleScope;
  kind: string | null;
  data: unknown;
}

export interface ModuleDashboardProvider {
  /** Stable `Module.key` this provider serves. */
  readonly moduleKey: string;
  /** Optional declaration of supported scopes; defaults to the module's scopes. */
  readonly scopes?: ModuleScope[];
  load(
    context: ModuleDashboardContext,
  ): Promise<ModuleDashboardPayload> | ModuleDashboardPayload;
}
