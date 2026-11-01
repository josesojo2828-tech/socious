"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import {
  BRASS_DOT,
  CARD,
  CARD_HEADER,
  CTA_BRASS,
  EYEBROW,
  GLASS,
  INPUT,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { OfferEndpoints } from "@/features/offers/services/offers.endpoints";
import { OffersLockedState } from "@/features/offers/components/OffersLockedState";
import { useOffersPlan } from "@/features/offers/hooks/useOffersPlan";
import {
  formatOfferDate,
  offerStatus,
} from "@/features/offers/lib/offer-form";
import type { Offer, OfferStatus } from "@/features/offers/types/offer.type";

const STATUS_TONE: Record<OfferStatus, string> = {
  Activa: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Inactiva: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  Vencida: "bg-red-500/10 text-red-600 border-red-500/20",
};

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Offer register (S9): Maison table + summary strip, dedicated routes for
 * create (/ofertas/nueva) and edit (/ofertas/[id]/editar), row-level delete
 * with confirmation. The whole screen is plan-gated — without the OFFERS
 * module it shows the honest Avanzado empty state instead of rows or CTA.
 */
export default function OffersPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const { checking, allowed } = useOffersPlan();

  const [rows, setRows] = useState<Offer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      // Unlike purchases, GET /api/offers answers a bare array.
      const { data } = await apiClient.get<Offer[]>(OfferEndpoints.list);
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Ofertas",
        message: apiMessage(error, "No se pudieron cargar las ofertas."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (allowed) void fetchList();
  }, [allowed, fetchList]);

  const removeOffer = async (offer: Offer) => {
    const confirmed = window.confirm(
      `¿Eliminar la oferta "${offer.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    setDeletingId(offer.id);
    try {
      await apiClient.delete(OfferEndpoints.detail(offer.id));
      addToast({
        type: "success",
        title: "Ofertas",
        message: "Oferta eliminada.",
      });
      await fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Ofertas",
        message: apiMessage(error, "No se pudo eliminar la oferta."),
      });
    } finally {
      setDeletingId(null);
    }
  };

  // One `now` per render for the badges and the strip, so a row never flips
  // mid-render.
  const now = new Date();
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (offer) =>
        offer.name.toLowerCase().includes(needle) ||
        (offer.slogan ?? "").toLowerCase().includes(needle),
    );
  }, [rows, query]);

  const activeCount = rows.filter((offer) => offerStatus(offer, now) === "Activa").length;
  const expiredCount = rows.filter((offer) => offerStatus(offer, now) === "Vencida").length;

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className={EYEBROW}>
              <span>Ofertas</span>
              <span className={BRASS_DOT} aria-hidden />
              <span>Promociones con fecha</span>
            </div>
            <h1 className={PAGE_TITLE}>Ofertas</h1>
          </div>
        </header>
        <OffersLockedState />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span>Ofertas</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Promociones con fecha</span>
          </div>
          <h1 className={PAGE_TITLE}>Ofertas</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Crea promociones con banner, productos y una fecha de vencimiento.
          </p>
        </div>
        <Link
          href="/dashboard/ofertas/nueva"
          className={`px-4 py-2.5 text-sm ${CTA_BRASS}`}
        >
          <Plus className="h-4 w-4" /> Nueva oferta
        </Link>
      </header>

      {/* Summary strip: real aggregates from the fetched rows. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`rounded-2xl px-5 py-4 ${GLASS}`}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Ofertas
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums font-semibold text-[#111018] dark:text-slate-100">
            {rows.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            en tu catálogo
          </p>
        </div>
        <div className={`rounded-2xl px-5 py-4 ${GLASS}`}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Activas
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums font-semibold text-[#111018] dark:text-slate-100">
            {activeCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            vigentes hoy
          </p>
        </div>
        <div className={`rounded-2xl px-5 py-4 ${GLASS}`}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Vencidas
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums font-semibold text-[#111018] dark:text-slate-100">
            {expiredCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            pasaron su fecha
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o lema…"
          className={`pl-9 pr-3 py-2 ${INPUT}`}
        />
      </div>

      <div className={`rounded-2xl overflow-hidden ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Promociones
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
              ? "Todavía no hay ofertas. Crea la primera con el botón “Nueva oferta”."
              : "Ninguna oferta coincide con la búsqueda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-4 py-2.5 text-left font-medium">Nombre</th>
                  <th className="px-4 py-2.5 text-left font-medium">Slogan</th>
                  <th className="px-4 py-2.5 text-left font-medium">Vence</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Productos
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((offer) => {
                  const status = offerStatus(offer, now);
                  return (
                    <tr key={offer.id} className={TABLE_ROW}>
                      <td className="px-4 py-2.5 font-medium text-[#111018] dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          {offer.name}
                          {(offer.discountPercent ?? 0) > 0 ? (
                            <span className="rounded-full bg-[#b2944a]/15 border border-[#b2944a]/40 px-2 py-0.5 text-[10px] font-bold text-[#8e7538] dark:text-[#d8c084]">
                              −{offer.discountPercent}%
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-2.5 text-slate-500 dark:text-slate-400">
                        {offer.slogan || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                            {formatOfferDate(offer.expiresAt)}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}
                          >
                            {status}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#111018] dark:text-slate-100">
                        {offer.items.length}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            title="Editar oferta"
                            onClick={() =>
                              router.push(`/dashboard/ofertas/${offer.id}/editar`)
                            }
                            className="rounded-lg border border-[#1a2a46]/15 p-1.5 text-[#1a2a46]/70 hover:bg-[#1a2a46]/[0.05] dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Eliminar oferta"
                            disabled={deletingId === offer.id}
                            onClick={() => void removeOffer(offer)}
                            className="rounded-lg border border-[#1a2a46]/15 p-1.5 text-[#1a2a46]/70 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:border-white/15 dark:text-slate-300 dark:hover:bg-red-950/40"
                          >
                            {deletingId === offer.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
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
