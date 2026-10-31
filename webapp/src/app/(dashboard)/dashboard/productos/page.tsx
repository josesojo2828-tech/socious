"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Layers,
  Loader2,
  Package,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import {
  BRASS_DOT,
  CARD,
  CTA_BRASS,
  EYEBROW,
  GLASS,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type {
  Product,
  ProductStatus,
} from "@/features/products/types/product.type";
import {
  PRODUCT_STATUS_OPTIONS,
  buildStockPayload,
  isLowStock,
  stockAfter,
  type StockAdjustType,
} from "@/features/products/lib/product-form";
import { summarizeProducts } from "@/features/products/lib/product-summary";

interface Paged<T> {
  list: T[];
  total: number;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

function statusBadge(status: ProductStatus): { label: string; className: string } {
  const label =
    PRODUCT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status;
  if (status === "ACTIVE") {
    return {
      label,
      className:
        "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300",
    };
  }
  if (status === "ON_SALE") {
    return {
      label,
      className:
        "rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300",
    };
  }
  if (status === "OUT_OF_STOCK") {
    return {
      label,
      className:
        "rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700 dark:text-red-300",
    };
  }
  return {
    label,
    className:
      "rounded-full border border-slate-300 dark:border-slate-600 bg-white/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400",
  };
}

/** Catalog list (S1/S7): Maison table + summary strip; forms live on routes. */
export default function ProductsPage() {
  const { addToast } = useToastStore();
  const router = useRouter();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<StockAdjustType>("IN");
  const [adjustQty, setAdjustQty] = useState<string>("0");
  const [adjustReference, setAdjustReference] = useState<string>("");

  const load = useCallback(async () => {
    const { data } = await apiClient.get<Paged<Product>>(ProductEndpoints.list, {
      params: { limit: 100 },
    });
    setRows(data.list);
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      await load();
    } catch {
      addToast({
        type: "error",
        title: "Inventario",
        message: "No se pudo cargar el catálogo.",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, load]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((product) => {
      if (statusFilter && product.status !== statusFilter) return false;
      if (!term) return true;
      return [product.name, product.sku, product.barcode ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [rows, query, statusFilter]);

  const summary = useMemo(() => summarizeProducts(rows), [rows]);

  const submitAdjust = async (product: Product): Promise<void> => {
    const input = {
      type: adjustType,
      quantity: Number(adjustQty),
      reference: adjustReference,
    };
    const next = stockAfter(Number(product.stock), input);
    if (next === null) {
      addToast({
        type: "warning",
        title: "Stock",
        message: "El movimiento dejaría el stock en negativo.",
      });
      return;
    }

    setBusy(true);
    try {
      await apiClient.post(
        ProductEndpoints.stock(product.id),
        buildStockPayload(input),
      );
      addToast({
        type: "success",
        title: "Stock",
        message: `"${product.name}": ${Number(product.stock)} → ${next}.`,
      });
      setAdjustingId(null);
      setAdjustQty("0");
      setAdjustReference("");
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Stock",
        message: apiMessage(error, "No se pudo registrar el movimiento."),
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const stats = [
    {
      label: "Total productos",
      value: summary.total,
      icon: Package,
      tone: "text-[#111018] dark:text-slate-100",
    },
    {
      label: "Activos",
      value: summary.active,
      icon: ShieldCheck,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Stock bajo",
      value: summary.lowStock,
      icon: Layers,
      tone:
        summary.lowStock > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-[#111018] dark:text-slate-100",
    },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span className="truncate max-w-[180px]">
              {activeWorkspace?.name ?? "Socius ERP"}
            </span>
            <span className={BRASS_DOT} />
            <span>Catálogo</span>
            <span className={BRASS_DOT} />
            <span className="font-mono">{rows.length} en total</span>
          </div>
          <h1 className={PAGE_TITLE}>Productos y servicios</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Los cambios de stock quedan registrados en el kardex.
          </p>
        </div>
        <Link
          href="/dashboard/productos/nuevo"
          className={`h-11 px-5 text-sm ${CTA_BRASS}`}
        >
          <Plus className="h-4 w-4" /> Nuevo producto
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-2xl p-4 ${GLASS}`}>
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <stat.icon className="h-3.5 w-3.5 text-[#b2944a]" />
              {stat.label}
            </p>
            <p
              className={`mt-2 font-mono text-2xl tabular-nums font-medium ${stat.tone}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className={`flex flex-wrap items-center gap-3 rounded-2xl p-4 ${GLASS}`}>
        <div className="flex items-center gap-2 rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-2 py-1.5">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, SKU o código"
            className="w-56 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className={`w-auto ${INPUT}`}
        >
          <option value="">Todos los estados</option>
          {PRODUCT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={`overflow-x-auto ${CARD}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={`${TABLE_HEAD} text-left`}>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium text-right">Precio</th>
              <th className="px-4 py-3 font-medium text-right">Stock</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const low = isLowStock(product);
              const badge = statusBadge(product.status);
              return (
                <Fragment key={product.id}>
                  <tr
                    className={`${TABLE_ROW} cursor-pointer align-middle`}
                    onClick={() => router.push(`/dashboard/productos/${product.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#111018] dark:text-slate-100">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {product.isService
                          ? "servicio"
                          : product.isPublic
                            ? "en tienda"
                            : "solo mostrador"}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#111018] dark:text-slate-100">
                      ${Number(product.salePriceUSD).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          low
                            ? "inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400"
                            : "text-[#111018] dark:text-slate-100"
                        }
                      >
                        {low ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
                        {Number(product.stock)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={badge.className}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        aria-label="Ajustar stock"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAdjustingId(
                            adjustingId === product.id ? null : product.id,
                          );
                        }}
                        className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-[#1a2a46]/[0.05] dark:hover:bg-white/5 transition-colors"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  {adjustingId === product.id ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="bg-[#1a2a46]/[0.03] px-4 py-3 dark:bg-white/5"
                      >
                        <div className="flex flex-wrap items-end gap-3">
                          <label className={LABEL_SM}>
                            Tipo
                            <select
                              className={`mt-1 w-auto ${INPUT}`}
                              value={adjustType}
                              onChange={(event) =>
                                setAdjustType(
                                  event.target.value as StockAdjustType,
                                )
                              }
                            >
                              <option value="IN">Entrada (+)</option>
                              <option value="OUT">Salida (−)</option>
                              <option value="ADJUSTMENT">Ajuste (=)</option>
                            </select>
                          </label>
                          <label className={LABEL_SM}>
                            {adjustType === "ADJUSTMENT"
                              ? "Stock final"
                              : "Cantidad"}
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              className={`mt-1 w-28 font-mono tabular-nums ${INPUT}`}
                              value={adjustQty}
                              onChange={(event) =>
                                setAdjustQty(event.target.value)
                              }
                            />
                          </label>
                          <label className={LABEL_SM}>
                            Referencia
                            <input
                              className={`mt-1 w-40 ${INPUT}`}
                              value={adjustReference}
                              placeholder="COM-001, CONTEO…"
                              onChange={(event) =>
                                setAdjustReference(event.target.value)
                              }
                            />
                          </label>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void submitAdjust(product)}
                            className={`h-10 px-4 text-sm ${CTA_BRASS}`}
                          >
                            Registrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}

            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                >
                  Sin productos para ese filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Archive className="h-3.5 w-3.5" /> El estado «Inactivo» oculta el
        producto sin borrar su historial; para eliminarlo, ábrelo en su ficha.
      </p>
    </div>
  );
}
