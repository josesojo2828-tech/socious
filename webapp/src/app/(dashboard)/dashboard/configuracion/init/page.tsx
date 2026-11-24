"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Eye,
  FileSpreadsheet,
  Loader2,
  Plus,
  Upload,
} from "lucide-react";
import { ManualReceivableForm } from "@/features/initial-load/components/ManualReceivableForm";
import { ReceivableImportPanel } from "@/features/initial-load/components/ReceivableImportPanel";
import { sumAging } from "@/features/finanzas/lib/financial-summary";
import { SaleEndpoints } from "@/features/sales/services/sales.endpoints";
import type { SalesReport } from "@/features/sales/types/sale.type";
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

/** One count card of the summary: label plus a number, or an em dash when unknown. */
function SummaryCount({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-[#1a2a46]/12 p-4 dark:border-white/10">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl tabular-nums font-semibold text-[#111018] dark:text-slate-100">
        {value === null ? "—" : value}
      </p>
    </div>
  );
}

/** One checklist line: the item and whether it already has data. */
function SummaryChecklistRow({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-sm font-medium ${
          ready
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {ready ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
        {ready ? "Listo" : "Pendiente"}
      </span>
    </li>
  );
}

/**
 * Step 3: what the merchant actually loaded. Counts come from the stats the
 * page already holds; the open balance comes from the sales report, fetched
 * when this step is reached. A failed report never renders a fake zero.
 */
function SummaryPanel({
  stats,
  report,
  loading,
  error,
}: {
  stats: OrganizationStats | null;
  report: SalesReport | null;
  loading: boolean;
  error: string | null;
}) {
  const products = stats ? stats.totalProducts : null;
  const clients = stats ? stats.totalClients : null;
  const receivables = report ? report.openItemsTotal : null;
  const openBalance = report ? sumAging(report.aging) : null;

  // The first frame of the step runs before the fetch effect, so a report still
  // absent without an error counts as "calculating" instead of "failed".
  const calculating = loading || (report === null && error === null);

  const checklist = [
    { label: "Productos", ready: products !== null && products > 0 },
    { label: "Clientes", ready: clients !== null && clients > 0 },
    {
      label: "Cuentas por cobrar",
      ready: receivables !== null && receivables > 0,
    },
  ];

  return (
    <StepPanel
      icon={<ClipboardCheck className="h-5 w-5" />}
      title="Resumen"
      description="Lo que quedó cargado en el negocio: productos, clientes y cuentas por cobrar."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCount label="Productos" value={products} />
        <SummaryCount label="Clientes" value={clients} />
        <SummaryCount label="Cuentas por cobrar" value={receivables} />
      </div>

      <div className="mt-3 rounded-xl border border-[#1a2a46]/8 px-4 py-3.5 dark:border-white/10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Total por cobrar en USD
        </p>
        {calculating ? (
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando el saldo por
            cobrar…
          </p>
        ) : openBalance === null ? (
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {error ?? "No se pudo calcular el saldo por cobrar."}
          </p>
        ) : (
          <p className="mt-1 font-mono text-2xl tabular-nums font-semibold text-[#8e7538] dark:text-[#d8c084]">
            ${openBalance.toFixed(2)}
          </p>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Estado de la carga
        </p>
        <ul className="mt-1.5 divide-y divide-[#1a2a46]/8 rounded-xl border border-[#1a2a46]/12 px-4 dark:divide-white/10 dark:border-white/10">
          {checklist.map((item) => (
            <SummaryChecklistRow
              key={item.label}
              label={item.label}
              ready={item.ready}
            />
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/dashboard" className={`h-10 px-4 text-sm ${CTA_BRASS}`}>
          Ir al panel
        </Link>
        <Link
          href="/dashboard/cuentas-por-cobrar"
          className={`h-10 px-4 text-sm ${CTA_NAVY}`}
        >
          Ver cuentas por cobrar
        </Link>
      </div>
    </StepPanel>
  );
}

/**
 * Initial data load for a business workspace: three steps from the incoming
 * feature (products, clients/receivables, summary). Step 1 links to the product
 * import page and points the manual form to the products screen; step 2 hosts
 * the receivable import; step 3 summarizes what was loaded.
 */
export default function InitialLoadPage() {
  const { addToast } = useToastStore();
  const { activeWorkspace, currentRole, orgId } = useWorkspaceRole();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const [step, setStep] = useState<number>(1);
  /** Step 2 either imports a CSV or opens the manual form; import by default. */
  const [receivableView, setReceivableView] = useState<"import" | "manual">(
    "import",
  );
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  /** Sales report behind the step-3 open balance; loaded only on step 3. */
  const [report, setReport] = useState<SalesReport | null>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  /** Bumped after an import so the account-state banner reloads in place. */
  const [reloadToken, setReloadToken] = useState<number>(0);

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
  }, [addToast, canOperate, isOrganization, orgId, reloadToken]);

  // The open balance is only needed on step 3, so it is fetched when the user
  // gets there — not on mount. `reloadToken` refreshes it after an import.
  useEffect(() => {
    if (step !== 3 || !canOperate || !isOrganization) return;

    let cancelled = false;
    setReportLoading(true);
    setReportError(null);

    void apiClient
      .get<SalesReport>(SaleEndpoints.report)
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch(() => {
        if (cancelled) return;
        setReport(null);
        setReportError("No se pudo calcular el saldo por cobrar.");
      })
      .finally(() => {
        if (!cancelled) setReportLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canOperate, isOrganization, reloadToken, step, orgId]);

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
          icon={<FileSpreadsheet className="h-5 w-5" />}
          title="Productos y Catálogo"
          description="Carga el catálogo con el que vas a operar en tu negocio. Puedes importar una planilla de Excel (.xlsx, .xls) o CSV, o registrarlos uno a uno."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-dashed border-[#1a2a46]/20 bg-slate-50/60 p-5 dark:border-white/15 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#b2944a]" />
                <p className="font-semibold text-[#111018] dark:text-slate-100">
                  Importar Excel o CSV
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Carga masiva rápida. Sube tu planilla de Excel (.xlsx, .xls) o archivo CSV con tus productos, precios, costos y stock inicial.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard/productos/importar"
                  className={`h-10 px-4 text-sm font-medium ${CTA_NAVY}`}
                >
                  <Upload className="h-4 w-4" /> Importar Excel o CSV
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-[#1a2a46]/12 p-5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#b2944a]" />
                <p className="font-semibold text-[#111018] dark:text-slate-100">
                  Carga manual
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Registra cada producto uno a uno desde el formulario detallado del catálogo.
              </p>
              <Link
                href="/dashboard/productos/nuevo"
                aria-describedby="manual-notice"
                className={`mt-4 h-10 px-4 text-sm ${CTA_BRASS}`}
              >
                <Plus className="h-4 w-4" /> Alta manual
              </Link>
              <p
                id="manual-notice"
                className="mt-1.5 text-xs text-slate-500 dark:text-slate-400"
              >
                El formulario de creación de producto se abre en la pantalla de
                Productos.
              </p>
            </div>
          </div>
        </StepPanel>
      ) : null}

      {step === 2 ? (
        <StepPanel
          icon={<FileSpreadsheet className="h-5 w-5" />}
          title="Clientes y cuentas por cobrar"
          description="Carga los clientes y su deuda inicial desde un archivo CSV o una cuenta a la vez."
        >
          <div
            role="group"
            aria-label="Forma de carga de cuentas por cobrar"
            className="mb-4 inline-flex flex-wrap gap-1 rounded-xl border border-[#1a2a46]/15 p-1 dark:border-white/15"
          >
            <button
              type="button"
              aria-pressed={receivableView === "import"}
              onClick={() => setReceivableView("import")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b2944a] ${
                receivableView === "import"
                  ? "bg-[#1a2a46] font-semibold text-[#f0ede4]"
                  : "font-medium text-slate-600 hover:bg-[#1a2a46]/[0.05] dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              Importar planilla
            </button>
            <button
              type="button"
              aria-pressed={receivableView === "manual"}
              onClick={() => setReceivableView("manual")}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b2944a] ${
                receivableView === "manual"
                  ? "bg-[#1a2a46] font-semibold text-[#f0ede4]"
                  : "font-medium text-slate-600 hover:bg-[#1a2a46]/[0.05] dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              Alta manual
            </button>
          </div>

          {receivableView === "import" ? (
            <ReceivableImportPanel />
          ) : (
            <ManualReceivableForm
              onCreated={() => setReloadToken((token) => token + 1)}
            />
          )}
        </StepPanel>
      ) : null}

      {step === 3 ? (
        <SummaryPanel
          stats={stats}
          report={report}
          loading={reportLoading}
          error={reportError}
        />
      ) : null}
    </div>
  );
}
