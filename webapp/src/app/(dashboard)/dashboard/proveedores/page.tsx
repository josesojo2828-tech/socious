"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Factory, Loader2, Plus, Search, Trash2, Wallet } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
import { SupplierEndpoints } from "@/features/suppliers/services/suppliers.endpoints";
import type { Supplier } from "@/features/suppliers/types/supplier.type";
import {
  buildSupplierPayload,
  toSupplierForm,
  validateSupplierForm,
  type SupplierForm,
} from "@/features/suppliers/lib/supplier-form";

interface Paged<T> {
  list: T[];
  total: number;
}

interface SupplierBalance {
  supplierId: string;
  totalUSD: number;
  paidUSD: number;
  currentBalanceUSD: number;
}

const EMPTY_FORM: SupplierForm = {
  name: "",
  taxId: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  notes: "",
  isActive: true,
};

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/** Supplier directory (S8): CRUD plus the payable balance. */
export default function SuppliersPage() {
  const { addToast } = useToastStore();

  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const [query, setQuery] = useState<string>("");
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);
  const [creating, setCreating] = useState<boolean>(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const [selected, setSelected] = useState<Supplier | null>(null);
  const [balance, setBalance] = useState<SupplierBalance | null>(null);

  const load = useCallback(async () => {
    const { data } = await apiClient.get<Paged<Supplier>>(
      SupplierEndpoints.list,
      { params: { limit: 100 } },
    );
    setRows(data.list);
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      await load();
    } catch {
      addToast({
        type: "error",
        title: "Proveedores",
        message: "No se pudo cargar el directorio.",
      });
    } finally {
      setLoading(false);
    }
  }, [load, addToast]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const openDetail = useCallback(async (supplier: Supplier) => {
    setSelected(supplier);
    try {
      const { data } = await apiClient.get<SupplierBalance>(
        SupplierEndpoints.balance(supplier.id),
      );
      setBalance(data);
    } catch {
      setBalance(null);
    }
  }, []);

  const patchForm = (patch: Partial<SupplierForm>) =>
    setForm((current) => ({ ...current, ...patch }));

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCreating(true);
    setSelected(null);
  };

  const startEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setForm(toSupplierForm(supplier));
    setCreating(true);
  };

  const submitForm = async (): Promise<void> => {
    const validation = validateSupplierForm(form);
    if (validation) {
      addToast({ type: "warning", title: "Proveedores", message: validation });
      return;
    }

    await run(async () => {
      const payload = buildSupplierPayload(form);
      try {
        if (editing) {
          await apiClient.patch(SupplierEndpoints.detail(editing.id), payload);
        } else {
          await apiClient.post(SupplierEndpoints.list, payload);
        }
        addToast({
          type: "success",
          title: "Proveedores",
          message: editing ? "Proveedor actualizado." : "Proveedor creado.",
        });
        setCreating(false);
        setEditing(null);
        await load();
      } catch (error) {
        addToast({
          type: "error",
          title: "Proveedores",
          message: apiMessage(error, "No se pudo guardar el proveedor."),
        });
      }
    });
  };

  const handleDelete = () =>
    run(async () => {
      if (!selected) return;
      const confirmed = window.confirm(
        `¿Eliminar ${selected.name}? Si tiene compras el backend lo va a negar.`,
      );
      if (!confirmed) return;
      try {
        await apiClient.delete(SupplierEndpoints.detail(selected.id));
        addToast({
          type: "success",
          title: "Proveedores",
          message: "Proveedor eliminado.",
        });
        setSelected(null);
        await load();
      } catch (error) {
        addToast({
          type: "error",
          title: "Proveedores",
          message: apiMessage(error, "No se pudo eliminar."),
        });
      }
    });

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((supplier) =>
      [supplier.name, supplier.taxId ?? "", supplier.contactName ?? ""]
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
            Proveedores
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {rows.length} en el directorio · la deuda sale de las compras.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Nuevo proveedor
        </button>
      </header>

      {creating ? (
        <SectionCard
          icon={<Factory className="h-5 w-5" />}
          title={editing ? `Editar ${editing.name}` : "Nuevo proveedor"}
          description="Nombre y contacto: lo mínimo para comprar."
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
              Contacto
              <input
                className={field}
                value={form.contactName ?? ""}
                onChange={(event) => patchForm({ contactName: event.target.value })}
              />
            </label>
            <label className={label}>
              Documento
              <input
                className={field}
                value={form.taxId ?? ""}
                onChange={(event) => patchForm({ taxId: event.target.value })}
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
              Correo
              <input
                type="email"
                className={field}
                value={form.email ?? ""}
                onChange={(event) => patchForm({ email: event.target.value })}
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
              Ubicación
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
              {editing ? "Guardar cambios" : "Crear proveedor"}
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
          placeholder="Buscar por nombre, contacto o documento"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400 dark:border-slate-700">
                <th className="px-4 py-2">Proveedor</th>
                <th className="px-4 py-2">Contacto</th>
                <th className="px-4 py-2">Teléfono</th>
                <th className="px-4 py-2 text-right">Debe</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((supplier) => (
                <tr
                  key={supplier.id}
                  className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${
                    selected?.id === supplier.id
                      ? "bg-indigo-50 dark:bg-indigo-950"
                      : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    <p className="font-medium">{supplier.name}</p>
                    {!supplier.isActive ? (
                      <span className="text-[10px] uppercase text-slate-400">
                        inactivo
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {supplier.contactName ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">{supplier.phone ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-xs">
                    ${Number(supplier.currentBalanceUSD).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void openDetail(supplier)}
                        className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        aria-label="Editar"
                        onClick={() => startEdit(supplier)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Sin proveedores para esa búsqueda.
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
                title="Cuenta por pagar"
                description={`${selected.name} · ${selected.contactName ?? "sin contacto"}`}
              >
                {balance ? (
                  <div className="space-y-1">
                    <SectionRow label="Total comprado">
                      <span>${Number(balance.totalUSD).toFixed(2)}</span>
                    </SectionRow>
                    <SectionRow label="Pagado">
                      <span>${Number(balance.paidUSD).toFixed(2)}</span>
                    </SectionRow>
                    <SectionRow label="Pendiente">
                      <span className="font-semibold text-amber-600">
                        ${Number(balance.currentBalanceUSD).toFixed(2)}
                      </span>
                    </SectionRow>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sin saldo cargado.</p>
                )}
              </SectionCard>

              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            </>
          ) : (
            <SectionCard
              icon={<Factory className="h-5 w-5" />}
              title="Resumen"
              description="Elegí un proveedor de la lista para ver su deuda."
            >
              <SectionRow label="En el directorio">
                <span className="font-semibold">{rows.length}</span>
              </SectionRow>
              <SectionRow label="Activos">
                <span className="font-semibold">
                  {rows.filter((supplier) => supplier.isActive).length}
                </span>
              </SectionRow>
            </SectionCard>
          )}
        </aside>
      </div>
    </div>
  );
}
