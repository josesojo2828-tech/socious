"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { ClientEndpoints } from "@/features/clients/services/clients.endpoints";
import type { Client } from "@/features/clients/types/client.type";
import {
  buildClientPayload,
  toClientForm,
  validateClientForm,
  type ClientForm as ClientFormValues,
} from "@/features/clients/lib/client-form";
import { CARD, CARD_HEADER, CTA_BRASS, BTN_GHOST, INPUT, LABEL_SM } from "@/shared/lib/maison-style";

const EMPTY_FORM: ClientFormValues = {
  name: "",
  taxId: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  creditLimitUSD: 0,
  notes: "",
  isActive: true,
};

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Shared create/edit form for `/dashboard/clientes/nuevo` and
 * `/dashboard/clientes/[id]/editar`. Same fields, validation and payload
 * as the inline form that used to live on the list page (S1).
 */
export function ClientForm({ clientId }: { clientId?: string }) {
  const router = useRouter();
  const { addToast } = useToastStore();

  const [form, setForm] = useState<ClientFormValues>(EMPTY_FORM);
  const [loading, setLoading] = useState<boolean>(Boolean(clientId));
  const [busy, setBusy] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get<Client>(
          ClientEndpoints.detail(clientId),
        );
        if (!cancelled) setForm(toClientForm(data));
      } catch {
        if (!cancelled) {
          setLoadError("No se pudo cargar el cliente.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const patchForm = useCallback(
    (patch: Partial<ClientFormValues>) =>
      setForm((current) => ({ ...current, ...patch })),
    [],
  );

  const submit = async (): Promise<void> => {
    const validation = validateClientForm(form);
    if (validation) {
      addToast({ type: "warning", title: "Clientes", message: validation });
      return;
    }

    setBusy(true);
    try {
      const payload = buildClientPayload(form);
      if (clientId) {
        await apiClient.patch(ClientEndpoints.detail(clientId), payload);
        addToast({
          type: "success",
          title: "Clientes",
          message: "Cliente actualizado.",
        });
        router.push(`/dashboard/clientes/${clientId}`);
      } else {
        await apiClient.post(ClientEndpoints.list, payload);
        addToast({
          type: "success",
          title: "Clientes",
          message: "Cliente creado.",
        });
        router.push("/dashboard/clientes");
      }
    } catch (error) {
      addToast({
        type: "error",
        title: "Clientes",
        message: apiMessage(error, "No se pudo guardar el cliente."),
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

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto my-12 text-center">
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{loadError}</p>
        <button
          type="button"
          className={BTN_GHOST}
          onClick={() => router.push("/dashboard/clientes")}
        >
          Volver a clientes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">
          Clientes <span className="inline-block w-[3px] h-[3px] rounded-full bg-[#b2944a] mx-2.5 align-middle" />
          {clientId ? "Editar" : "Nuevo"}
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-none text-[#111018] dark:text-slate-50">
          {clientId ? "Editar cliente" : "Nuevo cliente"}
        </h1>
      </header>

      <div className={`rounded-xl p-5 sm:p-6 ${CARD}`}>
        <div className={`mb-5 ${CARD_HEADER} border-0 px-0 py-0`}>
          <h3 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Datos del cliente
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            * obligatorios
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={LABEL_SM}>
            Nombre *
            <input
              className={`${INPUT} mt-1`}
              value={form.name}
              onChange={(event) => patchForm({ name: event.target.value })}
            />
          </label>
          <label className={LABEL_SM}>
            Documento (RIF / cédula)
            <input
              className={`${INPUT} mt-1`}
              value={form.taxId ?? ""}
              onChange={(event) => patchForm({ taxId: event.target.value })}
            />
          </label>
          <label className={LABEL_SM}>
            Correo *
            <input
              type="email"
              required
              className={`${INPUT} mt-1`}
              value={form.email ?? ""}
              onChange={(event) => patchForm({ email: event.target.value })}
            />
          </label>
          <label className={LABEL_SM}>
            Teléfono
            <input
              className={`${INPUT} mt-1`}
              value={form.phone ?? ""}
              onChange={(event) => patchForm({ phone: event.target.value })}
            />
          </label>
          <label className={LABEL_SM}>
            Límite de crédito USD
            <input
              type="number"
              min={0}
              step="1"
              className={`${INPUT} mt-1 font-mono tabular-nums`}
              value={form.creditLimitUSD ?? 0}
              onChange={(event) =>
                patchForm({ creditLimitUSD: Number(event.target.value) })
              }
            />
          </label>
          <label className={LABEL_SM}>
            Ciudad
            <input
              className={`${INPUT} mt-1`}
              value={form.city ?? ""}
              onChange={(event) => patchForm({ city: event.target.value })}
            />
          </label>
          <label className={`${LABEL_SM} sm:col-span-2`}>
            Dirección
            <input
              className={`${INPUT} mt-1`}
              value={form.address ?? ""}
              onChange={(event) => patchForm({ address: event.target.value })}
            />
          </label>
          <label className={LABEL_SM}>
            Estado
            <input
              className={`${INPUT} mt-1`}
              value={form.state ?? ""}
              onChange={(event) => patchForm({ state: event.target.value })}
            />
          </label>
          <label className={`${LABEL_SM} sm:col-span-2`}>
            Notas
            <textarea
              rows={3}
              className={`${INPUT} mt-1`}
              value={form.notes ?? ""}
              onChange={(event) => patchForm({ notes: event.target.value })}
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className={`${CTA_BRASS} h-11 px-5 text-sm`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {clientId ? "Guardar cambios" : "Crear cliente"}
          </button>
          <button
            type="button"
            className={BTN_GHOST}
            onClick={() =>
              router.push(
                clientId ? `/dashboard/clientes/${clientId}` : "/dashboard/clientes",
              )
            }
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
