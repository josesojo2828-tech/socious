"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Settings2, Truck, Wallet, Map, Coins, TruckElectric } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { Toggle } from "@/shared/components/atoms/Toggle";
import { Checkbox } from "@/shared/components/atoms/Checkbox";
import {
  getTenantSettings,
  updateTenantSettings,
} from "@/features/settings/services/settings.service";
import { ShippingEndpoints } from "@/features/shipping/services/shipping.endpoints";
import {
  applySettingsPatch,
  patchAgency,
  patchCashShiftControl,
  patchCoordination,
  patchCurrency,
  patchDeliveryEnabled,
  patchDeliveryFee,
  patchFulfillmentType,
  patchRoutesEnabled,
} from "@/features/settings/lib/settings-form";
import {
  COORDINATION_LABELS,
  CURRENCY_LABELS,
  FULFILLMENT_TYPE_LABELS,
  type CoordinationMethod,
  type CurrencyVisibilityKey,
  type FulfillmentType,
  type TenantSettings,
  type TenantSettingsPatch,
} from "@/features/settings/types/tenant-settings.type";

interface ShippingAgency {
  id: string;
  key: string;
  name: string;
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <header className="flex items-start gap-3 mb-4">
        <span className="mt-0.5 text-indigo-600 dark:text-indigo-400">{icon}</span>
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        {hint ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/**
 * Tenant configuration (S4): the six checks the backend exposes at
 * GET/PATCH /api/settings. Every change is saved immediately and optimistically;
 * a rejected patch (the backend validates strictly) restores the previous value.
 */
export default function SettingsPage() {
  const { addToast } = useToastStore();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [agencies, setAgencies] = useState<ShippingAgency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [current, agencyList] = await Promise.all([
          getTenantSettings(),
          apiClient.get<ShippingAgency[]>(ShippingEndpoints.agencies),
        ]);
        if (cancelled) return;
        setSettings(current);
        setAgencies(agencyList.data);
      } catch {
        if (!cancelled) {
          addToast({
            type: "error",
            title: "Configuración",
            message: "No se pudo cargar la configuración del negocio.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const save = async (
    build: (current: TenantSettings) => TenantSettingsPatch,
  ): Promise<void> => {
    if (!settings) return;

    const patch = build(settings);
    const previous = settings;
    setSettings(applySettingsPatch(settings, patch));
    setSaving(true);

    try {
      const fresh = await updateTenantSettings(patch);
      setSettings(fresh);
    } catch {
      setSettings(previous);
      addToast({
        type: "error",
        title: "Configuración",
        message: "No se pudo guardar el cambio. Volvemos al valor anterior.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-center">
        <p className="text-sm text-slate-500">
          No se pudo cargar la configuración.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <Settings2 className="h-4 w-4" /> Reintentar
        </button>
      </div>
    );
  }

  const fulfillmentTypes = Object.keys(
    FULFILLMENT_TYPE_LABELS,
  ) as FulfillmentType[];
  const currencyKeys = Object.keys(CURRENCY_LABELS) as CurrencyVisibilityKey[];
  const coordinationMethods = Object.keys(
    COORDINATION_LABELS,
  ) as CoordinationMethod[];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Configuración del negocio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Los cambios se guardan solos a medida que los marcas.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs text-slate-400">
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" /> Guardado
            </>
          )}
        </span>
      </header>

      <SectionCard
        icon={<Wallet className="h-5 w-5" />}
        title="Caja"
        description="Con el control activo cada turno se abre y se cierra; apagado, la caja queda siempre activa y el cuadre es diario."
      >
        <Row
          label="Control de apertura y cierre de caja"
          hint="Recomendado para comercios establecidos con arqueo por turno."
        >
          <Toggle
            checked={settings.cash.shiftControl}
            onChange={() => void save(patchCashShiftControl)}
          />
        </Row>
      </SectionCard>

      <SectionCard
        icon={<Coins className="h-5 w-5" />}
        title="Monedas visibles"
        description="Solo cambia lo que se muestra: los montos siempre se guardan en USD, Bs y USDT."
      >
        <div className="grid sm:grid-cols-2 gap-x-6">
          {currencyKeys.map((key) => (
            <Row key={key} label={CURRENCY_LABELS[key]}>
              <Checkbox
                checked={settings.currencies[key]}
                onChange={(event) =>
                  void save((current) =>
                    patchCurrency(current, key, event.target.checked),
                  )
                }
              />
            </Row>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={<Truck className="h-5 w-5" />}
        title="Tipos de entrega"
        description="Lo que el cliente puede elegir al hacer el pedido, y cómo se coordina la entrega."
      >
        <div className="grid sm:grid-cols-2 gap-x-6">
          {fulfillmentTypes.map((type) => {
            const enabled = settings.fulfillment.enabledTypes.includes(type);
            const isLast = enabled && settings.fulfillment.enabledTypes.length === 1;
            return (
              <Row key={type} label={FULFILLMENT_TYPE_LABELS[type]}>
                <Checkbox
                  checked={enabled}
                  disabled={isLast}
                  title={isLast ? "Debe quedar al menos un tipo activo." : undefined}
                  onChange={(event) =>
                    void save((current) =>
                      patchFulfillmentType(current, type, event.target.checked),
                    )
                  }
                />
              </Row>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Coordinación por defecto
          </p>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            value={settings.fulfillment.coordination}
            onChange={(event) =>
              void save((current) =>
                patchCoordination(
                  current,
                  event.target.value as CoordinationMethod,
                ),
              )
            }
          >
            {coordinationMethods.map((method) => (
              <option key={method} value={method}>
                {COORDINATION_LABELS[method]}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      <SectionCard
        icon={<TruckElectric className="h-5 w-5" />}
        title="Agencias de envío"
        description="Las agencias habilitadas son las que el cliente elige al pedir envío."
      >
        {agencies.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavía no hay agencias cargadas.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-6">
            {agencies.map((agency) => (
              <Row key={agency.id} label={agency.name}>
                <Checkbox
                  checked={settings.shipping.enabledAgencies.includes(
                    agency.key,
                  )}
                  onChange={(event) =>
                    void save((current) =>
                      patchAgency(current, agency.key, event.target.checked),
                    )
                  }
                />
              </Row>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<Truck className="h-5 w-5" />}
        title="Delivery"
        description="Cobro de envío a domicilio; el monto se congela en cada pedido."
      >
        <Row label="Habilitar delivery">
          <Toggle
            checked={settings.delivery.enabled}
            onChange={(event) =>
              void save((current) =>
                patchDeliveryEnabled(current, event.target.checked),
              )
            }
          />
        </Row>
        <Row label="Costo del delivery (USD)" hint="Se aplica a los pedidos de tipo delivery.">
          <input
            type="number"
            min={0}
            step="0.5"
            disabled={!settings.delivery.enabled}
            value={settings.delivery.feeUSD}
            onChange={(event) =>
              void save(() => patchDeliveryFee(Number(event.target.value)))
            }
            className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
          />
        </Row>
      </SectionCard>

      <SectionCard
        icon={<Map className="h-5 w-5" />}
        title="Rutas de entrega"
        description="Agrupa los pedidos de un día en una ruta. Al habilitarlo aparece la opción en el menú lateral."
      >
        <Row label="Trabajar por rutas">
          <Toggle
            checked={settings.routes.enabled}
            onChange={(event) =>
              void save((current) =>
                patchRoutesEnabled(current, event.target.checked),
              )
            }
          />
        </Row>
      </SectionCard>
    </div>
  );
}
