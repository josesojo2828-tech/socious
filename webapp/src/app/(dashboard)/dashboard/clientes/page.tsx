"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { TablePagination } from "@/shared/components/molecules/TablePagination";
import { ClientEndpoints } from "@/features/clients/services/clients.endpoints";
import type { Client } from "@/features/clients/types/client.type";
import {
  balanceState,
  portfolioSummary,
} from "@/features/clients/lib/client-form";
import { buildListParams } from "@/features/clients/lib/client-list";
import {
  BRASS_DOT,
  CTA_BRASS,
  CARD,
  CARD_HEADER,
  EYEBROW,
  GLASS,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";

interface Paged<T> {
  list: T[];
  total: number;
  totalPages: number;
}

const TONE_CLASS: Record<string, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  attention: "text-amber-600 dark:text-amber-400",
  over: "text-red-600 dark:text-red-400",
};

/** Client CRM list (S1 + S3): Maison table, page-scoped summary, search. */
export default function ClientsPage() {
  const { addToast } = useToastStore();

  const [rows, setRows] = useState<Client[]>([]);
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
        const { data } = await apiClient.get<Paged<Client>>(
          ClientEndpoints.list,
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
            title: "Clientes",
            message: "No se pudo cargar la cartera.",
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
  const summary = portfolioSummary(rows);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Encabezado Maison: eyebrow + título + CTA */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span className="truncate max-w-[180px]">Comercial</span>
            <span className={BRASS_DOT} />
            <span>Clientes</span>
            <span className={BRASS_DOT} />
            <span className="truncate">{total} en cartera</span>
          </div>
          <h1 className={PAGE_TITLE}>Clientes</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Los saldos salen de sus ventas; el detalle vive en cada ficha.
          </p>
        </div>
        <Link
          href="/dashboard/clientes/nuevo"
          className={`${CTA_BRASS} h-11 px-5 text-sm`}
        >
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Link>
      </header>

      {/* Franja de resumen: agregados de las filas de ESTA página (S1) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "En la página", value: String(summary.total) },
          { label: "Activos en página", value: String(summary.active) },
          { label: "Con saldo en página", value: String(summary.withBalance) },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl px-5 py-4 ${GLASS}`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
            <p className="mt-1 font-mono text-2xl tabular-nums text-[#111018] dark:text-slate-100">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className={`rounded-xl ${CARD}`}>
        <div className={CARD_HEADER}>
          <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Cartera
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {rows.length} de {total}
          </span>
        </div>

        {/* Búsqueda (mismo filtro de siempre: nombre, documento, correo, teléfono) */}
        <div className="px-5 py-3 border-b border-[#1b1d21]/12 dark:border-white/10 flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por nombre, documento, correo o teléfono"
            className="w-full bg-transparent text-sm outline-none text-[#111018] dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={TABLE_HEAD}>
                <th className="px-5 py-2.5 font-medium">Cliente</th>
                <th className="px-5 py-2.5 font-medium">Correo</th>
                <th className="px-5 py-2.5 font-medium">Teléfono</th>
                <th className="px-5 py-2.5 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map((client) => {
                const state = balanceState(
                  Number(client.currentBalanceUSD),
                  Number(client.creditLimitUSD),
                );
                return (
                  <tr key={client.id} className={`${TABLE_ROW} cursor-pointer`}>
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/clientes/${client.id}`}
                        className="block min-w-0"
                      >
                        <p className="font-medium text-[#111018] dark:text-slate-100 truncate">
                          {client.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {client.taxId ?? "sin documento"}
                          {!client.isActive ? " · inactivo" : ""}
                        </p>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300 truncate max-w-[220px]">
                      {client.email ?? "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {client.phone ?? "—"}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono text-xs tabular-nums ${TONE_CLASS[state.tone]}`}
                      title={state.label}
                    >
                      {state.label}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    {query.trim()
                      ? "Sin clientes para esa búsqueda."
                      : "Todavía no hay clientes: creá el primero con “Nuevo cliente”."}
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
