"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { InternalLink } from "@/shared/components/atoms/InternalLink";
import { TablePagination } from "@/shared/components/molecules/TablePagination";
import {
  BRASS_DOT,
  CARD,
  CARD_HEADER,
  CTA_BRASS,
  EYEBROW,
  GLASS,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { SupplierEndpoints } from "@/features/suppliers/services/suppliers.endpoints";
import {
  buildListParams,
  sumPendingBalance,
} from "@/features/suppliers/lib/supplier-list";
import type { Supplier } from "@/features/suppliers/types/supplier.type";

interface Paged<T> {
  list: T[];
  total: number;
  totalPages: number;
}

function formatUSD(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Supplier directory (makeover S1): Maison table + page-scoped summary +
 * search. The create/edit form and the detail drawer moved to their own
 * routes: `/proveedores/nuevo` and `/proveedores/[id]`.
 */
export default function SuppliersPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  /** Real pagination: the backend pages with `page`+`limit:25`. */
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  /** `searchInput` paints the box instantly; `query` commits after 300ms. */
  const [searchInput, setSearchInput] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  // Debounce the search term; every commit restarts the list at page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Server-side list: the `q` search travels in the request, not a useMemo.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await apiClient.get<Paged<Supplier>>(
          SupplierEndpoints.list,
          { params: buildListParams({ page, q: query }) },
        );
        if (cancelled) return;
        setRows(data.list ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
      } catch {
        if (!cancelled) {
          addToast({
            type: "error",
            title: "Proveedores",
            message: "No se pudo cargar el directorio.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast, page, query]);

  // Summary strip aggregates, computed only from the rows on this page.
  const totalPending = sumPendingBalance(rows);
  const activeCount = rows.filter((supplier) => supplier.isActive).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* ===== Encabezado estilo mockup: eyebrow + título + CTA ===== */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span className="truncate max-w-[180px]">
              {activeWorkspace?.name ?? "Socius ERP"}
            </span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Directorio</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>{total} proveedor{total === 1 ? "" : "es"}</span>
          </div>
          <h1 className={PAGE_TITLE}>Proveedores</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Contacto, saldo por pagar y ubicaciones en un solo lugar.
          </p>
        </div>

        <InternalLink
          href="/dashboard/proveedores/nuevo"
          className={`${CTA_BRASS} px-4 py-2.5 text-sm no-underline`}
        >
          <Plus className="h-4 w-4" /> Nuevo proveedor
        </InternalLink>
      </header>

      {/* ===== Franja de resumen: agregados de las filas de ESTA página ===== */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`rounded-3xl p-5 ${GLASS}`}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            En la página
          </p>
          <p className="mt-2 font-mono text-2xl tabular-nums text-[#111018] dark:text-slate-100">
            {rows.length}
          </p>
        </div>
        <div className={`rounded-3xl p-5 ${GLASS}`}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Activos en página
          </p>
          <p className="mt-2 font-mono text-2xl tabular-nums text-[#111018] dark:text-slate-100">
            {activeCount}
          </p>
        </div>
        <div className={`rounded-3xl p-5 ${GLASS}`}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Por pagar (página)
          </p>
          <p className="mt-2 font-mono text-2xl tabular-nums text-amber-600 dark:text-amber-400">
            {formatUSD(totalPending)}
          </p>
        </div>
      </div>

      {/* ===== Búsqueda ===== */}
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${GLASS}`}>
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por nombre, contacto o documento"
          className="w-full bg-transparent text-sm outline-none text-[#111018] dark:text-slate-100 placeholder:text-slate-400"
        />
      </div>

      {/* ===== Tabla Maison ===== */}
      <div className={`rounded-xl overflow-hidden ${CARD}`}>
        <div className={CARD_HEADER}>
          <h3 className="font-semibold text-[15px] tracking-tight text-[#111018] dark:text-slate-100">
            Directorio
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {rows.length} de {total}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={TABLE_HEAD}>
                <th className="px-5 py-3 font-medium">Proveedor</th>
                <th className="px-5 py-3 font-medium">Contacto</th>
                <th className="px-5 py-3 font-medium">Correo</th>
                <th className="px-5 py-3 font-medium">Teléfono</th>
                <th className="px-5 py-3 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map((supplier) => {
                const pending = Number(supplier.currentBalanceUSD ?? 0);
                return (
                  <tr
                    key={supplier.id}
                    className={`${TABLE_ROW} cursor-pointer`}
                    onClick={() => router.push(`/dashboard/proveedores/${supplier.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        router.push(`/dashboard/proveedores/${supplier.id}`);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#111018] dark:text-slate-100">
                        {supplier.name}
                      </p>
                      {!supplier.isActive ? (
                        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                          inactivo
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {supplier.contactName ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {supplier.email ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {supplier.phone ?? "—"}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono text-xs tabular-nums font-medium ${
                        pending > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {formatUSD(pending)}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr className={TABLE_ROW}>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    {query.trim()
                      ? "Sin proveedores para esa búsqueda."
                      : "Todavía no hay proveedores: cree el primero desde el botón superior."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
