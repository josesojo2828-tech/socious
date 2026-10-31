"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  StickyNote,
  Trash2,
  User,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { InternalLink } from "@/shared/components/atoms/InternalLink";
import {
  BRASS_DOT,
  BTN_GHOST,
  CARD,
  CARD_HEADER,
  EYEBROW,
  GLASS,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { SupplierEndpoints } from "@/features/suppliers/services/suppliers.endpoints";
import { SupplierLocationsCard } from "@/features/suppliers/components/SupplierLocationsCard";
import type {
  Supplier,
  SupplierBalance,
} from "@/features/suppliers/types/supplier.type";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

function formatUSD(value: number): string {
  return `$${value.toFixed(2)}`;
}

function IdentityRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 shrink-0 text-slate-400" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="text-sm text-[#111018] dark:text-slate-100 break-words">
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * Supplier ficha (makeover S1 + S3): identity, payable balance, map
 * locations and the delete action with confirmation — the backend rejects
 * suppliers with purchases, and that message is surfaced via toast.
 */
export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = params?.id as string | undefined;
  const router = useRouter();
  const { addToast } = useToastStore();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [balance, setBalance] = useState<SupplierBalance | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const bootstrap = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<Supplier>(
        SupplierEndpoints.detail(supplierId),
      );
      setSupplier(data);
      try {
        const { data: balanceData } = await apiClient.get<SupplierBalance>(
          SupplierEndpoints.balance(supplierId),
        );
        setBalance(balanceData);
      } catch {
        setBalance(null);
      }
    } catch (loadError) {
      setError(apiMessage(loadError, "No se pudo cargar el proveedor."));
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const handleDelete = () => {
    if (!supplier) return;
    setBusy(true);
    void (async () => {
      const confirmed = window.confirm(
        `¿Eliminar ${supplier.name}? Si tiene compras el backend lo va a negar.`,
      );
      if (!confirmed) {
        setBusy(false);
        return;
      }
      try {
        await apiClient.delete(SupplierEndpoints.detail(supplier.id));
        addToast({
          type: "success",
          title: "Proveedores",
          message: "Proveedor eliminado.",
        });
        router.push("/dashboard/proveedores");
      } catch (deleteError) {
        addToast({
          type: "error",
          title: "Proveedores",
          message: apiMessage(deleteError, "No se pudo eliminar."),
        });
        setBusy(false);
      }
    })();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="max-w-2xl mx-auto my-12 space-y-4 text-center">
        <div className="flex justify-center text-red-500">
          <AlertCircle size={48} />
        </div>
        <h3 className="text-lg font-bold text-red-800 dark:text-red-300">
          No se pudo cargar el proveedor
        </h3>
        <p className="text-red-600 dark:text-red-400">
          {error || "Proveedor no encontrado."}
        </p>
        <InternalLink
          href="/dashboard/proveedores"
          variant="hover"
          className="text-sm text-slate-500 hover:text-[#111018] dark:hover:text-slate-100 inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          Volver a proveedores
        </InternalLink>
      </div>
    );
  }

  const addressLine = [supplier.address, supplier.city, supplier.state]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <InternalLink
        href="/dashboard/proveedores"
        variant="hover"
        className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#111018] dark:hover:text-slate-100 flex items-center gap-1.5 no-underline hover:underline w-fit"
      >
        <ArrowLeft size={16} />
        Volver a proveedores
      </InternalLink>

      {/* ===== Encabezado de la ficha ===== */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span>Proveedores</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Ficha</span>
            <span className={BRASS_DOT} aria-hidden />
            <span
              className={
                supplier.isActive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400"
              }
            >
              {supplier.isActive ? "Activo" : "Inactivo"}
            </span>
          </div>
          <h1 className={`${PAGE_TITLE} break-words`}>{supplier.name}</h1>
          {supplier.taxId ? (
            <p className="mt-2 font-mono text-sm text-slate-500 dark:text-slate-400">
              RIF / Documento: {supplier.taxId}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <InternalLink
            href={`/dashboard/proveedores/${supplier.id}/editar`}
            className={`${BTN_GHOST} no-underline`}
          >
            <Pencil className="h-4 w-4" /> Editar
          </InternalLink>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/70 dark:border-red-500/30 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        </div>
      </header>

      {/* ===== Identidad + saldo ===== */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className={`rounded-xl ${CARD}`}>
          <div className={CARD_HEADER}>
            <h3 className="font-semibold text-[15px] tracking-tight text-[#111018] dark:text-slate-100">
              Datos de contacto
            </h3>
          </div>
          <div className="px-5 py-2 divide-y divide-[#1a2a46]/8 dark:divide-white/5">
            <IdentityRow
              icon={<User className="h-4 w-4" />}
              label="Contacto"
              value={supplier.contactName ?? "—"}
            />
            <IdentityRow
              icon={<Mail className="h-4 w-4" />}
              label="Correo"
              value={supplier.email ?? "—"}
            />
            <IdentityRow
              icon={<Phone className="h-4 w-4" />}
              label="Teléfono"
              value={supplier.phone ?? "—"}
            />
            <IdentityRow
              icon={<MapPin className="h-4 w-4" />}
              label="Dirección"
              value={addressLine || "—"}
            />
          </div>
          {supplier.notes ? (
            <div className="px-5 py-3 border-t border-[#1b1d21]/12 dark:border-white/10">
              <IdentityRow
                icon={<StickyNote className="h-4 w-4" />}
                label="Notas"
                value={supplier.notes}
              />
            </div>
          ) : null}
        </div>

        <div className={`rounded-xl ${CARD}`}>
          <div className={CARD_HEADER}>
            <h3 className="font-semibold text-[15px] tracking-tight text-[#111018] dark:text-slate-100">
              Cuenta por pagar
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              USD
            </span>
          </div>
          {balance ? (
            <div className="px-5 py-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">
                  Total comprado
                </span>
                <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                  {formatUSD(Number(balance.totalUSD))}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">
                  Pagado
                </span>
                <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                  {formatUSD(Number(balance.paidUSD))}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-[#1a2a46]/10 dark:border-white/10 pt-2">
                <span className="font-medium text-[#111018] dark:text-slate-100">
                  Pendiente
                </span>
                <span className="font-mono tabular-nums text-base font-semibold text-amber-600 dark:text-amber-400">
                  {formatUSD(Number(balance.currentBalanceUSD))}
                </span>
              </div>
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
              Sin saldo cargado.
            </p>
          )}
        </div>
      </div>

      {/* ===== Ubicaciones en el mapa (componente existente) ===== */}
      <SupplierLocationsCard supplierId={supplier.id} />

      {/* ===== Panel de cristal decorativo del patrón Maison ===== */}
      <div className={`rounded-3xl px-5 py-4 ${GLASS}`}>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Las compras de este proveedor viven en el módulo de compras · la
          deuda se calcula desde sus facturas y pagos
        </p>
      </div>
    </div>
  );
}
