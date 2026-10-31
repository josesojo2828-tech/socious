"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, Bell, CalendarClock, CreditCard, Loader2, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
import { Toggle } from "@/shared/components/atoms/Toggle";
import { TenantPaymentMethodEndpoints } from "@/features/tenant-payment-methods/services/tenant-payment-methods.endpoints";
import type { TenantPaymentMethod } from "@/features/tenant-payment-methods/types/tenant-payment-method.type";
import { CREDIT_CADENCE_LABELS } from "../types/tenant-settings.type";
import type { TenantSettings } from "../types/tenant-settings.type";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/** Payment methods tab (S1): built-ins are read-only, customs are a CRUD. */
export function PaymentMethodsPanel() {
  const { addToast } = useToastStore();
  const [rows, setRows] = useState<TenantPaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [saving, setSaving] = useState<boolean>(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<TenantPaymentMethod[]>(
        TenantPaymentMethodEndpoints.list,
      );
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Métodos de pago",
        message: apiMessage(error, "No se pudieron cargar los métodos."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !code.trim()) {
      addToast({
        type: "warning",
        title: "Métodos de pago",
        message: "Completá el nombre y el código.",
      });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(TenantPaymentMethodEndpoints.list, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        currency,
      });
      setName("");
      setCode("");
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Métodos de pago",
        message: apiMessage(error, "No se pudo crear el método."),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (method: TenantPaymentMethod) => {
    try {
      await apiClient.patch(TenantPaymentMethodEndpoints.detail(method.id), {
        active: !method.active,
      });
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Métodos de pago",
        message: apiMessage(error, "No se pudo actualizar el método."),
      });
    }
  };

  const remove = async (method: TenantPaymentMethod) => {
    try {
      await apiClient.delete(TenantPaymentMethodEndpoints.detail(method.id));
      void fetchList();
    } catch (error) {
      addToast({
        type: "error",
        title: "Métodos de pago",
        message: apiMessage(error, "No se pudo eliminar el método."),
      });
    }
  };

  return (
    <SectionCard
      icon={<CreditCard className="h-5 w-5" />}
      title="Métodos de pago"
      description="Los base (efectivo, pago móvil, Zelle, USDT…) siempre están. Creá los tuyos: Pago Móvil Mercantil, Zelle de Ana, etc."
    >
      <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Nombre</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Pago Móvil Mercantil"
            className="mt-1 w-56 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Código</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="PAGO_MOVIL_MERCANTIL"
            className="mt-1 w-56 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Moneda</span>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="mt-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="USD">USD</option>
            <option value="VES">VES</option>
            <option value="USDT">USDT</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          Todavía no creaste métodos propios; los base ya funcionan en el POS.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((method) => (
            <li
              key={method.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {method.name}{" "}
                  <span className="font-mono text-xs text-slate-400">
                    {method.code}
                  </span>
                </p>
                <p className="text-xs text-slate-400">{method.currency}</p>
              </div>
              <div className="flex items-center gap-3">
                <Toggle
                  checked={method.active}
                  onChange={() => void toggle(method)}
                />
                <button
                  type="button"
                  aria-label={`Eliminar ${method.name}`}
                  onClick={() => void remove(method)}
                  className="rounded-lg p-1 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/** Credit sales defaults (S3). */
export function CreditSettingsPanel({
  settings,
  save,
}: {
  settings: TenantSettings;
  save: (patch: Partial<TenantSettings>) => Promise<void>;
}) {
  const credit = settings.credit;
  return (
    <SectionCard
      icon={<CalendarClock className="h-5 w-5" />}
      title="Ventas a crédito"
      description="Términos por defecto al cobrar a crédito desde el POS. Cada venta puede cambiarlos."
    >
      <SectionRow
        label="Inicial sugerida (USD)"
        hint="Monto que el POS precarga como pago inicial. Dejar vacío = sin inicial."
      >
        <input
          type="number"
          min={0}
          step="0.01"
          value={credit.initialPaymentUSD ?? ""}
          onChange={(event) =>
            void save({
              credit: {
                ...credit,
                initialPaymentUSD:
                  event.target.value === ""
                    ? null
                    : Number(event.target.value),
              },
            })
          }
          className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      </SectionRow>
      <SectionRow label="Cadencia de cobro">
        <select
          value={credit.cadence}
          onChange={(event) =>
            void save({
              credit: {
                ...credit,
                cadence: event.target.value as TenantSettings["credit"]["cadence"],
              },
            })
          }
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          {(
            Object.keys(CREDIT_CADENCE_LABELS) as Array<
              keyof typeof CREDIT_CADENCE_LABELS
            >
          ).map((key) => (
            <option key={key} value={key}>
              {CREDIT_CADENCE_LABELS[key]}
            </option>
          ))}
        </select>
      </SectionRow>
      {credit.cadence === "EVERY_N_DAYS" ? (
        <SectionRow label="Días entre cobros">
          <input
            type="number"
            min={1}
            max={365}
            value={credit.everyNDays}
            onChange={(event) =>
              void save({
                credit: { ...credit, everyNDays: Number(event.target.value) },
              })
            }
            className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </SectionRow>
      ) : null}
      {credit.cadence === "MONTHLY" ? (
        <SectionRow label="Día del mes de cobro">
          <input
            type="number"
            min={1}
            max={28}
            value={credit.monthlyDay}
            onChange={(event) =>
              void save({
                credit: { ...credit, monthlyDay: Number(event.target.value) },
              })
            }
            className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </SectionRow>
      ) : null}
    </SectionCard>
  );
}

/** Return reasons (S5): toggle the defaults, add your own. */
export function ReturnReasonsPanel({
  settings,
  save,
}: {
  settings: TenantSettings;
  save: (patch: Partial<TenantSettings>) => Promise<void>;
}) {
  const { addToast } = useToastStore();
  const [newReason, setNewReason] = useState<string>("");

  const reasons = settings.returns?.reasons ?? [];
  // Defaults the merchant removed can be re-enabled with one click.
  const DEFAULT_REASONS = [
    "Solo lo estaba probando",
    "Producto defectuoso",
    "Talla o medida equivocada",
    "Se arrepintió de la compra",
  ];
  const removedDefaults = DEFAULT_REASONS.filter(
    (reason) => !reasons.includes(reason),
  );

  const setReasons = async (next: string[]) => {
    await save({ returns: { reasons: next } });
  };

  const toggle = async (reason: string) => {
    // A toggle-off removes the label; the defaults come back only via reset —
    // so removal is the enable/disable switch the user asked for.
    await setReasons(reasons.filter((item) => item !== reason));
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const label = newReason.trim();
    if (!label) return;
    if (reasons.includes(label)) {
      addToast({
        type: "warning",
        title: "Devoluciones",
        message: "Ese motivo ya existe.",
      });
      return;
    }
    await setReasons([...reasons, label]);
    setNewReason("");
  };

  return (
    <SectionCard
      icon={<Banknote className="h-5 w-5" />}
      title="Devoluciones"
      description="Motivos que aparecen al devolver una venta. Quitá los que no uses y agregá los tuyos."
    >
      <ul className="mb-4 divide-y divide-slate-100 dark:divide-slate-800">
        {reasons.map((reason) => (
          <li
            key={reason}
            className="flex items-center justify-between gap-3 py-2"
          >
            <span className="text-sm text-slate-800 dark:text-slate-100">
              {reason}
            </span>
            <button
              type="button"
              onClick={() => void toggle(reason)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:text-red-500 dark:border-slate-700"
            >
              Quitar
            </button>
          </li>
        ))}
        {reasons.length === 0 ? (
          <li className="py-2 text-sm text-slate-500">
            Sin motivos: la devolución será con texto libre.
          </li>
        ) : null}
        {removedDefaults.map((reason) => (
          <li
            key={reason}
            className="flex items-center justify-between gap-3 py-2 opacity-60"
          >
            <span className="text-sm text-slate-500">{reason}</span>
            <button
              type="button"
              onClick={() => void setReasons([...reasons, reason])}
              className="rounded-lg border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800"
            >
              Activar
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">
            Nuevo motivo
          </span>
          <input
            value={newReason}
            onChange={(event) => setNewReason(event.target.value)}
            placeholder="Lo compró en oferta equivocada"
            className="mt-1 w-72 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </form>
    </SectionCard>
  );
}

/** Notification switches (CRM S2): stored, nothing is sent yet. */
export function NotificationsPanel({
  settings,
  save,
}: {
  settings: TenantSettings;
  save: (patch: Partial<TenantSettings>) => Promise<void>;
}) {
  const notifications = settings.notifications;
  const items: Array<{
    key: keyof TenantSettings["notifications"];
    label: string;
    hint: string;
  }> = [
    {
      key: "lowStock",
      label: "Stock bajo",
      hint: "Avisa cuando un producto llegue a su mínimo.",
    },
    {
      key: "creditDue",
      label: "Créditos por vencer",
      hint: "Avisa cuando una venta a crédito esté por vencer.",
    },
    {
      key: "orderReceived",
      label: "Pedido online recibido",
      hint: "Avisa cuando entre un pedido de la tienda.",
    },
    {
      key: "saleCreated",
      label: "Cada venta registrada",
      hint: "Aviso por venta (puede ser ruidoso).",
    },
  ];

  return (
    <SectionCard
      icon={<Bell className="h-5 w-5" />}
      title="Notificaciones"
      description="Preferencias de avisos. Hoy solo guardamos la lógica: el envío por correo llegará después."
    >
      {items.map((item) => (
        <SectionRow key={item.key} label={item.label} hint={item.hint}>
          <Toggle
            checked={notifications[item.key]}
            onChange={(event) =>
              void save({
                notifications: {
                  ...notifications,
                  [item.key]: event.target.checked,
                },
              })
            }
          />
        </SectionRow>
      ))}
    </SectionCard>
  );
}
