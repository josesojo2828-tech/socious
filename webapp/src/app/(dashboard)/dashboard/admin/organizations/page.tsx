"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, Search } from "lucide-react";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import {
  BRASS_DOT,
  CARD,
  CARD_HEADER,
  EYEBROW,
  GLASS,
  INPUT,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { organizationsService } from "@/features/organizations/service/organizations.service";
import {
  BRANCHES_MODULE_KEY,
  hasActiveBranchesGrant,
  otherActiveGrantChips,
} from "@/features/organizations/lib/branches-grant";
import type { AdminOrganization } from "@/features/organizations/types/organization-admin.type";

/** Local pattern shared by every CRUD screen: surface the backend message. */
function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

/**
 * Platform admin: assign the BRANCHES module grant per organization.
 *
 * The backend `POST/DELETE /api/modules/grants` already existed; this screen
 * is the admin surface for it. `GET /api/organizations` is the matching
 * global-roles-only list. The toggle is optimistic with rollback; the 403
 * from the backend remains the authority — the client gate only avoids a
 * confusing dead-end for tenant users who reach the URL.
 */
export default function AdminOrganizationsPage() {
  const user = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

  const permitsName = user?.permits?.name;
  const isGlobalRole =
    permitsName === "ADMIN" || permitsName === "SUPERADMIN";

  const [rows, setRows] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await organizationsService.listAll();
      setRows(list);
    } catch (error) {
      addToast({
        type: "error",
        title: "Organizaciones",
        message: apiMessage(error, "No se pudieron cargar las organizaciones."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isGlobalRole) void fetchList();
  }, [isGlobalRole, fetchList]);

  /**
   * Optimistic BRANCHES toggle: flip the row immediately, call the grant
   * endpoint, and roll the row back if the backend refuses.
   */
  const toggleBranches = async (org: AdminOrganization) => {
    const wasOn = hasActiveBranchesGrant(org.grants);
    const nextGrants = wasOn
      ? org.grants.filter((row) => row.moduleKey !== BRANCHES_MODULE_KEY)
      : [
          ...org.grants,
          // Optimistic placeholder; replaced by the server row on success.
          { id: `optimistic-${org.id}`, moduleKey: BRANCHES_MODULE_KEY, status: "ACTIVE" },
        ];

    setTogglingId(org.id);
    setRows((prev) =>
      prev.map((row) =>
        row.id === org.id ? { ...row, grants: nextGrants } : row,
      ),
    );

    try {
      await organizationsService.setBranchesGrant(
        org.id,
        !wasOn,
        org.grants,
      );
      addToast({
        type: "success",
        title: "Organizaciones",
        message: wasOn
          ? `Permiso de sucursales deshabilitado en "${org.name}".`
          : `Permiso de sucursales habilitado en "${org.name}".`,
      });
      // Re-fetch so every row (id, status) reflects the server's truth.
      await fetchList();
    } catch (error) {
      // Rollback: restore the pre-toggle grants.
      setRows((prev) =>
        prev.map((row) => (row.id === org.id ? { ...row, grants: org.grants } : row)),
      );
      addToast({
        type: "error",
        title: "Organizaciones",
        message: apiMessage(
          error,
          wasOn
            ? "No se pudo deshabilitar el permiso de sucursales."
            : "No se pudo habilitar el permiso de sucursales.",
        ),
      });
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = (() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (org) =>
        org.name.toLowerCase().includes(needle) ||
        (org.slug ?? "").toLowerCase().includes(needle),
    );
  })();

  // Client-side gate: honest state, not a broken screen. The backend 403
  // remains the real authority.
  if (!isGlobalRole) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className={EYEBROW}>
              <span>Plataforma</span>
              <span className={BRASS_DOT} aria-hidden />
              <span>Acceso restringido</span>
            </div>
            <h1 className={PAGE_TITLE}>Organizaciones</h1>
          </div>
        </header>
        <div className={`rounded-2xl px-6 py-10 text-center ${GLASS}`}>
          <Building2 className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
          <p className="mt-3 font-semibold text-[#111018] dark:text-slate-100">
            Solo roles globales
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Esta pantalla administra permisos de plataforma (ADMIN/SUPERADMIN).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span>Plataforma</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Permisos de módulos</span>
          </div>
          <h1 className={PAGE_TITLE}>Organizaciones</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Habilita o deshabilita el módulo de sucursales (BRANCHES) por
            organización.
          </p>
        </div>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o slug…"
          className={`pl-9 pr-3 py-2 ${INPUT}`}
        />
      </div>

      <div className={`rounded-2xl overflow-hidden ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Organizaciones
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {filtered.length} en pantalla
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            {rows.length === 0
              ? "Todavía no hay organizaciones registradas."
              : "Ninguna organización coincide con la búsqueda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-4 py-2.5 text-left font-medium">Nombre</th>
                  <th className="px-4 py-2.5 text-left font-medium">Slug</th>
                  <th className="px-4 py-2.5 text-left font-medium">Plan</th>
                  <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Otros módulos
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Sucursales
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((org) => {
                  const branchesOn = hasActiveBranchesGrant(org.grants);
                  const chips = otherActiveGrantChips(org.grants);
                  const busy = togglingId === org.id;
                  return (
                    <tr key={org.id} className={TABLE_ROW}>
                      <td className="px-4 py-2.5 font-medium text-[#111018] dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" aria-hidden />
                          {org.name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {org.slug ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {org.plan?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                            STATUS_TONE[org.status] ??
                            "bg-slate-500/10 text-slate-500 border-slate-500/20"
                          }`}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {chips.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {chips.map((chip) => (
                              <span
                                key={chip.id}
                                title="Módulo activo (solo lectura)"
                                className="inline-flex rounded-full border border-[#1a2a46]/15 bg-[#1a2a46]/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#1a2a46]/70 dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
                              >
                                {chip.moduleKey}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center justify-end">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={branchesOn}
                            aria-label={`Sucursales en ${org.name}`}
                            disabled={busy}
                            onClick={() => void toggleBranches(org)}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                              branchesOn
                                ? "bg-[#b2944a]"
                                : "bg-slate-300 dark:bg-slate-700"
                            }`}
                          >
                            {busy ? (
                              <Loader2 className="ml-1.5 h-4 w-4 animate-spin text-white" />
                            ) : (
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                  branchesOn ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            )}
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
