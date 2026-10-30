"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
import { ClientEndpoints } from "@/features/clients/services/clients.endpoints";
import type { Client, ClientBalance } from "@/features/clients/types/client.type";
import {
  balanceState,
  buildClientPayload,
  toClientForm,
  validateClientForm,
  type ClientForm,
} from "@/features/clients/lib/client-form";

interface Paged<T> {
  list: T[];
  total: number;
}

const EMPTY_FORM: ClientForm = {
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

const TONE_CLASS: Record<string, string> = {
  ok: "text-emerald-600",
  attention: "text-amber-600",
  over: "text-red-600",
};

/** Client CRM (S8): quick CRUD plus the receivables balance. */
export default function ClientsPage() {
  const { addToast } = useToastStore();

  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const [query, setQuery] = useState<string>("");
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [creating, setCreating] = useState<boolean>(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const [selected, setSelected] = useState<Client | null>(null);
  const [balance, setBalance] = useState<ClientBalance | null>(null);

  const load = useCallback(
    async (search?: string) => {
      const { data } = await apiClient.get<Paged<Client>>(ClientEndpoints.list, {
        params: { limit: 100, ...(search?.trim() ? { q: search.trim() } : {}) },
      });
      setRows(data.list);
    },
    [],
  );

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      await load();
    } catch {
      addToast({
        type: "error",
        title: "Clientes",
        message: "No se pudo cargar la cartera.",
      });
    } finally {
      setLoading(false);
    }
  }, [load, addToast]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const openDetail = useCallback(async (client: Client) => {
    setSelected(client);
    try {
      const { data } = await apiClient.get<ClientBalance>(
        ClientEndpoints.balance(client.id),
      );
      setBalance(data);
    } catch {
      setBalance(null);
    }
  }, []);

  const patchForm = (patch: Partial<ClientForm>) =>
    setForm((current) => ({ ...current, ...patch }));

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCreating(true);
    setSelected(null);
  };

  const startEdit = (client: Client) => {
    setEditing(client);
    setForm(toClientForm(client));
    setCreating(true);
  };

  const submitForm = async (): Promise<void> => {
    const validation = validateClientForm(form);
    if (validation) {
      addToast({ type: "warning", title: "Clientes", message: validation });
      return;
    }

    setBusy(true);
    try {
      const payload = buildClientPayload(form);
      if (editing) {
        await apiClient.patch(ClientEndpoints.detail(editing.id), payload);
      } else {
        await apiClient.post(ClientEndpoints.list, payload);
      }
      addToast({
        type: "success",
        title: "Clientes",
        message: editing ? "Cliente actualizado." : "Cliente creado.",
      });
      setCreating(false);
      setEditing(null);
      await load(query);
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

  const handleDeactivate = () =>
    run(async () => {
      if (!selected) return;
      await apiClient.patch(ClientEndpoints.detail(selected.id), {
        isActive: false,
      });
      addToast({
        type: "success",
        title: "Clientes",
        message: `${selected.name} quedó desactivado.`,
      });
      setSelected(null);
      await load(query);
    });

  const handleDelete = () =>
    run(async () => {
      if (!selected) return;
      const confirmed = window.confirm(
        `¿Eliminar ${selected.name}? Si tiene ventas el backend lo va a negar.`,
      );
      if (!confirmed) return;
      try {
        await apiClient.delete(ClientEndpoints.detail(selected.id));
        addToast({
          type: "success",
          title: "Clientes",
          message: "Cliente eliminado.",
        });
        setSelected(null);
        await load(query);
      } catch (error) {
        addToast({
          type: "error",
          title: "Clientes",
          message: apiMessage(error, "No se pudo eliminar."),
        });
      }
    });

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((client) =>
      [client.name, client.taxId ?? "", client.phone ?? "", client.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [rows, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800";
  const label = "block text-xs text-slate-500";

  return (
    <div className="px-4 py-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Clientes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {rows.length} en la cartera · los saldos salen de sus ventas.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Nuevo cliente
        </button>
      </header>

      {creating ? (
        <SectionCard
          icon={<UserRound className="h-5 w-5" />}
          title={editing ? `Editar ${editing.name}` : "Nuevo cliente"}
          description="Nombre y contacto: lo mínimo para operar."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={label}>
              Nombre *
              <input
                className={field}
                value={form.name}
                onChange={(event) => patchForm({ name: event.target.value })}
              />
            </label>
            <label className={label}>
              Documento (RIF / cédula)
              <input
                className={field}
                value={form.taxId ?? ""}
                onChange={(event) => patchForm({ taxId: event.target.value })}
              />
            </label>
            <label className={label}>
              Correo
              <input
                type="email"
                className={field}
                value={form.email ?? ""}
                onChange={(event) => patchForm({ email: event.target.value })}
              />
            </label>
            <label className={label}>
              Teléfono
              <input
                className={field}
                value={form.phone ?? ""}
                onChange={(event) => patchForm({ phone: event.target.value })}
              />
            </label>
            <label className={label}>
              Límite de crédito USD
              <input
                type="number"
                min={0}
                step="1"
                className={field}
                value={form.creditLimitUSD ?? 0}
                onChange={(event) =>
                  patchForm({ creditLimitUSD: Number(event.target.value) })
                }
              />
            </label>
            <label className={label}>
              Ciudad
              <input
                className={field}
                value={form.city ?? ""}
                onChange={(event) => patchForm({ city: event.target.value })}
              />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Dirección
              <input
                className={field}
                value={form.address ?? ""}
                onChange={(event) => patchForm({ address: event.target.value })}
              />
            </label>
            <label className={label}>
              Estado
              <input
                className={field}
                value={form.state ?? ""}
                onChange={(event) => patchForm({ state: event.target.value })}
              />
            </label>
            <label className={`${label} sm:col-span-3`}>
              Notas
              <textarea
                rows={2}
                className={field}
                value={form.notes ?? ""}
                onChange={(event) => patchForm({ notes: event.target.value })}
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitForm()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {editing ? "Guardar cambios" : "Crear cliente"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
            >
              Cancelar
            </button>
          </div>
        </SectionCard>
      ) : null}

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, documento, correo o teléfono"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400 dark:border-slate-700">
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Documento</th>
                <th className="px-4 py-2">Teléfono</th>
                <th className="px-4 py-2">Saldo</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const state = balanceState(
                  Number(client.currentBalanceUSD),
                  Number(client.creditLimitUSD),
                );
                return (
                  <tr
                    key={client.id}
                    className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${
                      selected?.id === client.id ? "bg-indigo-50 dark:bg-indigo-950" : ""
                    }`}
                  >
                    <td className="px-4 py-2">
                      <p className="font-medium">{client.name}</p>
                      {!client.isActive ? (
                        <span className="text-[10px] uppercase text-slate-400">
                          inactivo
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-xs">{client.taxId ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{client.phone ?? "—"}</td>
                    <td className={`px-4 py-2 text-xs ${TONE_CLASS[state.tone]}`}>
                      {state.label}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void openDetail(client)}
                          className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          aria-label="Editar"
                          onClick={() => startEdit(client)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Sin clientes para esa búsqueda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4">
          {selected ? (
            <>
              <SectionCard
                icon={<Wallet className="h-5 w-5" />}
                title="Saldo del cliente"
                description={`${selected.name} · ${selected.taxId ?? "sin documento"}`}
              >
                {balance ? (
                  <div className="space-y-1">
                    <SectionRow label="Total facturado">
                      <span>${Number(balance.totalUSD).toFixed(2)}</span>
                    </SectionRow>
                    <SectionRow label="Cobrado">
                      <span>${Number(balance.paidUSD).toFixed(2)}</span>
                    </SectionRow>
                    <SectionRow label="Saldo pendiente">
                      <span className="font-semibold text-amber-600">
                        ${Number(balance.currentBalanceUSD).toFixed(2)}
                      </span>
                    </SectionRow>
                    <SectionRow label="Crédito disponible">
                      <span className="font-semibold">
                        ${Number(balance.availableCreditUSD).toFixed(2)}
                      </span>
                    </SectionRow>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sin saldo cargado.</p>
                )}
              </SectionCard>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !selected.isActive}
                  onClick={() => void handleDeactivate()}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-600"
                >
                  Desactivar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDelete()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
              </div>
            </>
          ) : (
            <SectionCard
              icon={<Users className="h-5 w-5" />}
              title="Resumen"
              description="Elegí un cliente de la lista para ver su saldo."
            >
              <SectionRow label="En la cartera">
                <span className="font-semibold">{rows.length}</span>
              </SectionRow>
              <SectionRow label="Activos">
                <span className="font-semibold">
                  {rows.filter((client) => client.isActive).length}
                </span>
              </SectionRow>
            </SectionCard>
          )}
        </aside>
      </div>
    </div>
  );
}
