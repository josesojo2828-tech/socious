"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import {
  BRASS_DOT,
  BTN_GHOST,
  EYEBROW,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { OfferFormCard } from "@/features/offers/components/OfferFormCard";
import { OffersLockedState } from "@/features/offers/components/OffersLockedState";
import { useOffersPlan } from "@/features/offers/hooks/useOffersPlan";
import { OfferEndpoints } from "@/features/offers/services/offers.endpoints";
import type { Offer } from "@/features/offers/types/offer.type";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Edit offer (S9): loads GET /api/offers/:id, prefills the shared form
 * (banner key and product set included) and PATCHes it back. The plan gate
 * runs before the fetch so a non-Avanzado tenant never even asks for rows.
 */
export default function EditOfferPage() {
  const params = useParams();
  const offerId = params?.id as string | undefined;
  const { checking, allowed } = useOffersPlan();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    if (!offerId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<Offer>(
        OfferEndpoints.detail(offerId),
      );
      setOffer(data);
    } catch (loadError) {
      setError(apiMessage(loadError, "No se pudo cargar la oferta."));
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (allowed && offerId) void bootstrap();
  }, [allowed, offerId, bootstrap]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span>Ofertas</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Editar promoción</span>
          </div>
          <h1 className={PAGE_TITLE}>Editar oferta</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Ajusta los datos de la promoción. Los productos se reemplazan
            según la selección actual.
          </p>
        </div>
        <Link href="/dashboard/ofertas" className={BTN_GHOST}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </header>

      {checking ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : !allowed ? (
        <OffersLockedState />
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : error || !offer ? (
        <div className="max-w-2xl mx-auto my-12 space-y-4 text-center">
          <div className="flex justify-center text-red-500">
            <AlertCircle size={48} />
          </div>
          <h3 className="text-lg font-bold text-red-800 dark:text-red-300">
            No se pudo cargar la oferta
          </h3>
          <p className="text-red-600 dark:text-red-400">
            {error || "Oferta no encontrada."}
          </p>
          <Link
            href="/dashboard/ofertas"
            className="text-sm text-slate-500 hover:text-[#111018] dark:hover:text-slate-100 inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={16} />
            Volver a ofertas
          </Link>
        </div>
      ) : (
        <OfferFormCard offer={offer} />
      )}
    </div>
  );
}
