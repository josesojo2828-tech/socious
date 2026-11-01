"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  BRASS_DOT,
  BTN_GHOST,
  EYEBROW,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { OfferFormCard } from "@/features/offers/components/OfferFormCard";
import { OffersLockedState } from "@/features/offers/components/OffersLockedState";
import { useOffersPlan } from "@/features/offers/hooks/useOffersPlan";

/**
 * Create offer (S9): the form lives on its own route; the plan gate runs
 * first so a Básico tenant sees the honest empty state instead of a form
 * whose POST would answer 403.
 */
export default function NewOfferPage() {
  const { checking, allowed } = useOffersPlan();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span>Ofertas</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Nueva promoción</span>
          </div>
          <h1 className={PAGE_TITLE}>Nueva oferta</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Define el nombre, el banner, la fecha de vencimiento y los
            productos que aplican.
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
      ) : allowed ? (
        <OfferFormCard />
      ) : (
        <OffersLockedState />
      )}
    </div>
  );
}
