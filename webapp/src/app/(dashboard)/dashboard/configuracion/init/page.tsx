"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Construction,
  Eye,
  Loader2,
  Plus,
  Upload,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { useWorkspaceRole } from "@/shared/hooks/useWorkspaceRole";
import {
  BRASS_DOT,
  CARD,
  CARD_HEADER,
  CTA_BRASS,
  CTA_NAVY,
  EYEBROW,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";

/** What /api/organizations/:id/stats returns for the ERP counts. */
interface OrganizationStats {
  totalProducts: number;
  totalClients: number;
  totalSales: number;
}

const STEPS = [
  { id: 1, label: "1. Productos" },
  { id: 2, label: "2. Clientes y cuentas por cobrar" },
  { id: 3, label: "3. Resumen" },
] as const;

/** Roles allowed to load data; everyone else gets a read-only notice. */
const OPERATOR_ROLES = ["OWNER", "ADMIN", "CLINIC_ADMIN"] as const;

/** Local copy of the section chrome used by Configuración. */
function StepPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl overflow-hidden ${CARD}`}>
      <div className={CARD_HEADER}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-[#b2944a]">{icon}</span>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/** Shared card for the steps that later tasks will fill. */
function PendingPanel({ title, description }: { title: string; description: string }) {
  return (
    <StepPanel
      icon={<Construction className="h-5 w-5" />}
      title={title}
      description={description}
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Paso en construcción. Se habilitará en una próxima entrega.
      </p>
    </StepPanel>
  );
}

/**
 * Initial data load for a business workspace: three steps from the incoming
 * feature (products, clients/receivables, summary). Only the shell and the
 * account-state detection exist here; the import and the manual forms land in
 * later tasks, so their actions stay disabled.
 */
export default function InitialLoadPage() {
  const { addToast } = useToastStore();
  const { activeWorkspace, currentRole, orgId } = useWorkspaceRole();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const [step, setStep] = useState<number>(1);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isOrganization = activeWorkspace?.type === "ORGANIZATION";
  const canOperate =
    currentRole !== null &&
    currentRole !== undefined &&
    (OPERATOR_ROLES as readonly string[]).includes(currentRole);

  useEffect(() => {
    if (!canOperate || !isOrganization || !orgId) {
      setStats(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // The page reads the same endpoint as organizationService.getClinicStats,
    // but calls it directly: that service swallows failures and returns zeros,
    // which would show a brand-new account when the request actually failed.
    void apiClient
      .get<OrganizationStats>(`/api/organizations/${orgId}/stats`)
      .then((response) => {
        if (!cancelled) setStats(response.data);
      })
      .catch(() => {
        if (cancelled) return;
        setStats(null);
        setError("No se pudo verificar el estado de la cuenta.");
        addToast({
          type: "error",
          title: "Carga inicial",
          message: "No se pudo verificar el estado de la cuenta.",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [addToast, canOperate, isOrganization, orgId]);

  if (!isOrganization) {
    const organizationWorkspace = workspaces.find(
      (workspace) => workspace.type === "ORGANIZATION",
    );

    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <header className="min-w-0">
          <div className={EYEBROW}>
            <span>Configuración</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Carga inicial</span>
          </div>
          <h1 className={PAGE_TITLE}>Carga inicial</h1>
        </header>

        <section className={`rounded-2xl overflow-hidden ${CARD}`}>
          <div className={CARD_HEADER}>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="shrink-0 text-[#b2944a]">
                <Building2 className="h-5 w-5" />
              </span>
              <h2 className="truncate font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
                Se necesita un espacio de negocio
              </h2>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              La carga inicial escribe datos en el espacio de negocio. El
              espacio personal no admite esta operación.
            </p>
            {organizationWorkspace ? (
              <button
                type="button"
                onClick={() => setActiveWorkspace(organizationWorkspace)}
                className={`h-10 px-4 text-sm ${CTA_BRASS}`}
              >
                Usar espacio de negocio
              </button>
            ) : (
              <Link
                href="/onboarding/business"
                className={`h-10 px-4 text-sm ${CTA_BRASS}`}
              >
                Crear espacio de negocio
              </Link>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (!canOperate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <header className="min-w-0">
          <div className={EYEBROW}>
            <span className="truncate max-w-[180px]">
              {activeWorkspace?.name ?? "Socius ERP"}
            </span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Carga inicial</span>
          </div>
          <h1 className={PAGE_TITLE}>Carga inicial</h1>
        </header>

        <section className={`rounded-2xl overflow-hidden ${CARD}`}>
          <div className={CARD_HEADER}>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="shrink-0 text-[#b2944a]">
                <Eye className="h-5 w-5" />
              </span>
              <h2 className="truncate font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
                Solo lectura
              </h2>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tu rol actual no permite operar la carga inicial. Un propietario o
              administrador del negocio debe realizarla.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const isNewAccount =
    stats !== null &&
    stats.totalProducts === 0 &&
    stats.totalClients === 0 &&
    stats.totalSales === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span className="truncate max-w-[180px]">
              {activeWorkspace?.name ?? "Socius ERP"}
            </span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Configuración</span>
            <span className={BRASS_DOT} aria-hidden />
            <span className="font-mono">3 pasos</span>
          </div>
          <h1 className={PAGE_TITLE}>Carga inicial</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Prepara tu negocio en tres pasos: productos, clientes y un resumen
            final.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando el estado de
          la cuenta…
        </p>
      ) : error ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : isNewAccount ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
          <p className="font-semibold">Cuenta nueva</p>
          <p className="mt-0.5">
            La cuenta todavía no tiene datos. Puedes empezar por el paso 1.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4" /> La cuenta ya tiene datos
          </p>
          <p className="mt-0.5">
            La carga inicial está pensada para comenzar desde cero. Si
            continúas, los registros existentes se combinarán y se depurarán por
            coincidencias.
          </p>
        </div>
      )}

      <nav aria-label="Pasos de la carga inicial" className="flex flex-wrap gap-2">
        {STEPS.map((item) => {
          const isActive = step === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id)}
              aria-current={isActive ? "step" : undefined}
              className={`rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b2944a] ${
                isActive
                  ? "border-[#1a2a46] bg-[#1a2a46] font-semibold text-[#f0ede4]"
                  : "border-[#1a2a46]/15 font-medium text-slate-600 hover:bg-[#1a2a46]/[0.05] dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {step === 1 ? (
        <StepPanel
          icon={<Upload className="h-5 w-5" />}
          title="Productos"
          description="Carga el catálogo con el que vas a operar. Puedes importar una planilla o registrarlos uno por uno."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#1a2a46]/12 p-4 dark:border-white/10">
              <p className="font-semibold text-[#111018] dark:text-slate-100">
                Importar planilla
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Carga masiva desde un archivo compatible.
              </p>
              <button
                type="button"
                disabled
                aria-describedby="import-notice"
                className={`mt-3 h-10 px-4 text-sm ${CTA_NAVY}`}
              >
                <Upload className="h-4 w-4" /> Importar planilla
              </button>
              <p
                id="import-notice"
                className="mt-1.5 text-xs text-slate-500 dark:text-slate-400"
              >
                Disponible en el próximo paso
              </p>
            </div>

            <div className="rounded-xl border border-[#1a2a46]/12 p-4 dark:border-white/10">
              <p className="font-semibold text-[#111018] dark:text-slate-100">
                Alta manual
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Registra cada producto desde el formulario del catálogo.
              </p>
              <button
                type="button"
                disabled
                aria-describedby="manual-notice"
                className={`mt-3 h-10 px-4 text-sm ${CTA_BRASS}`}
              >
                <Plus className="h-4 w-4" /> Alta manual
              </button>
              <p
                id="manual-notice"
                className="mt-1.5 text-xs text-slate-500 dark:text-slate-400"
              >
                Disponible en el próximo paso
              </p>
            </div>
          </div>
        </StepPanel>
      ) : null}

      {step === 2 ? (
        <PendingPanel
          title="Clientes y cuentas por cobrar"
          description="El paso donde se cargan los clientes y su deuda inicial."
        />
      ) : null}

      {step === 3 ? (
        <PendingPanel
          title="Resumen"
          description="El cierre de la carga inicial, con el detalle de lo incorporado."
        />
      ) : null}
    </div>
  );
}
