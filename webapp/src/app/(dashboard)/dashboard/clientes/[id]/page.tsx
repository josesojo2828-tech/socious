"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  UserRound,
  Contact,
  Wallet,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { ClientEndpoints } from "@/features/clients/services/clients.endpoints";
import type { Client, ClientBalance } from "@/features/clients/types/client.type";
import { balanceState } from "@/features/clients/lib/client-form";
import { clientSections } from "@/features/clients/lib/client-detail";
import {
  BRASS_DOT,
  BTN_GHOST,
  CARD,
  CARD_HEADER,
  CTA_NAVY,
  EYEBROW,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

const SECTION_ICON: Record<string, LucideIcon> = {
  identity: UserRound,
  contact: Contact,
  credit: Wallet,
  notes: StickyNote,
};

/**
 * Client ficha (S1 + S3): its own route with identity, contact, credit
 * (limit + outstanding balance) and notes, plus Editar / Eliminar actions.
 */
export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string | undefined;
  const { addToast } = useToastStore();

  const [client, setClient] = useState<Client | null>(null);
  const [balance, setBalance] = useState<ClientBalance | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<Client>(
        ClientEndpoints.detail(clientId),
      );
      setClient(data);
      try {
        const balanceResponse = await apiClient.get<ClientBalance>(
          ClientEndpoints.balance(clientId),
        );
        setBalance(balanceResponse.data);
      } catch {
        setBalance(null);
      }
    } catch {
      setError("No se pudo cargar el cliente.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (): Promise<void> => {
    if (!client) return;
    const confirmed = window.confirm(
      `¿Eliminar ${client.name}? Si tiene ventas el backend lo va a negar.`,
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await apiClient.delete(ClientEndpoints.detail(client.id));
      addToast({
        type: "success",
        title: "Clientes",
        message: "Cliente eliminado.",
      });
      router.push("/dashboard/clientes");
    } catch (error) {
      addToast({
        type: "error",
        title: "Clientes",
        message: apiMessage(error, "No se pudo eliminar."),
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

  if (error || !client) {
    return (
      <div className="max-w-lg mx-auto my-12 text-center">
        <div className="flex justify-center mb-4 text-red-500">
          <AlertCircle size={40} />
        </div>
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          {error ?? "Cliente no encontrado"}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          El cliente solicitado no existe o no pertenece a esta organización.
        </p>
        <button
          type="button"
          className={BTN_GHOST}
          onClick={() => router.push("/dashboard/clientes")}
        >
          <ArrowLeft className="h-4 w-4" /> Volver a clientes
        </button>
      </div>
    );
  }

  const sections = clientSections(client, balance);
  const state = balanceState(
    Number(client.currentBalanceUSD),
    Number(client.creditLimitUSD),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <button
        type="button"
        className={`${BTN_GHOST} self-start`}
        onClick={() => router.push("/dashboard/clientes")}
      >
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </button>

      {/* Encabezado Maison: eyebrow + identidad + acciones */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span className="truncate max-w-[180px]">Clientes</span>
            <span className={BRASS_DOT} />
            <span>Ficha</span>
            {!client.isActive ? (
              <>
                <span className={BRASS_DOT} />
                <span className="text-amber-600 dark:text-amber-400">
                  Inactivo
                </span>
              </>
            ) : null}
          </div>
          <h1 className={`${PAGE_TITLE} truncate`}>{client.name}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-mono">
            {client.taxId ?? "sin documento"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={CTA_NAVY + " h-11 px-4 text-sm"}
            onClick={() => router.push(`/dashboard/clientes/${client.id}/editar`)}
          >
            <Pencil className="h-4 w-4" /> Editar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300/60 dark:border-red-500/40 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        </div>
      </header>

      {/* Saldo como héroe (S3: énfasis en crédito) */}
      <div className="relative overflow-hidden rounded-3xl bg-[#1a2a46] p-6 sm:p-7 text-[#f0ede4]">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#b2944a]/20 blur-3xl"
        />
        <div className="flex items-center justify-between mb-4 relative">
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#f0ede4]/60">
            Saldo pendiente
          </span>
          <span
            className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
              state.tone === "ok"
                ? "bg-emerald-400/20 text-emerald-200"
                : state.tone === "over"
                  ? "bg-red-400/20 text-red-200"
                  : "bg-[#b2944a]/25 text-[#d8c084]"
            }`}
          >
            {state.label}
          </span>
        </div>
        <div className="font-mono text-4xl sm:text-5xl leading-none tabular-nums relative">
          ${Number(balance?.currentBalanceUSD ?? client.currentBalanceUSD).toFixed(2)}
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 relative text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#f0ede4]/50">
              Límite de crédito
            </p>
            <p className="font-mono tabular-nums mt-0.5">
              ${Number(balance?.creditLimitUSD ?? client.creditLimitUSD).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#f0ede4]/50">
              Crédito disponible
            </p>
            <p className="font-mono tabular-nums mt-0.5">
              ${Number(balance?.availableCreditUSD ?? 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#f0ede4]/50">
              Total facturado
            </p>
            <p className="font-mono tabular-nums mt-0.5">
              ${Number(balance?.totalUSD ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Secciones de la ficha */}
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const SectionIcon = SECTION_ICON[section.key] ?? UserRound;
          return (
            <div key={section.title} className={`rounded-xl ${CARD}`}>
              <div className={CARD_HEADER}>
                <h3 className="font-semibold text-[15px] tracking-tight text-[#111018] dark:text-slate-100 flex items-center gap-2">
                  <SectionIcon className="h-4 w-4 text-[#b2944a]" />
                  {section.title}
                </h3>
              </div>
              <dl className="px-5 py-3 space-y-2.5 text-sm">
                {section.rows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400 shrink-0">
                      {row.label}
                    </dt>
                    <dd
                      className={`text-right text-[#111018] dark:text-slate-100 ${
                        row.mono ? "font-mono tabular-nums" : ""
                      } ${row.value === "—" ? "text-slate-400" : ""}`}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
