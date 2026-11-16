"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import { SettingsSurface } from "@/features/settings/components/SettingsSurface";
import type { UserDetailOrganization } from "@/types/backend/user-detail.type";

/**
 * Configuración del cliente dentro de la ficha del usuario (S1).
 *
 * El admin edita al cliente sin cambiar de workspace: la superficie pide todo
 * con el `X-Workspace-Id` de la organización elegida.
 */
export function ClientSettingsTab({
  organizations,
}: {
  organizations: UserDetailOrganization[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    organizations[0]?.id ?? null,
  );

  if (organizations.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1a2a46]/12 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        Este usuario no tiene una organización activa: no hay configuración que
        administrar.
      </div>
    );
  }

  const selected =
    organizations.find((org) => org.id === selectedId) ?? organizations[0];

  return (
    <div className="space-y-4">
      {organizations.length > 1 ? (
        <label className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          <Store className="h-4 w-4 text-[#b2944a]" />
          Configurando
          <select
            value={selected.id}
            onChange={(event) => setSelectedId(event.target.value)}
            className="rounded-xl border border-[#1a2a46]/12 bg-white px-3 py-1.5 text-sm normal-case tracking-normal text-[#111018] focus:outline-none focus:ring-2 focus:ring-[#b2944a]/40 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.role})
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          <Store className="h-4 w-4 text-[#b2944a]" />
          Configurando {selected.name}
        </p>
      )}

      <SettingsSurface
        key={selected.id}
        organizationId={selected.id}
        organizationName={selected.name}
        embedded
      />
    </div>
  );
}
