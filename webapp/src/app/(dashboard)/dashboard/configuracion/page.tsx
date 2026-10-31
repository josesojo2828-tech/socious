"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  Settings2,
  Truck,
  Wallet,
  Map,
  Coins,
  TruckElectric,
  Building2,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { Toggle } from "@/shared/components/atoms/Toggle";
import { Checkbox } from "@/shared/components/atoms/Checkbox";
import {
  SectionCard,
  SectionRow,
} from "@/shared/components/molecules/SectionCard";
import {
  getTenantSettings,
  updateTenantSettings,
} from "@/features/settings/services/settings.service";
import { ShippingEndpoints } from "@/features/shipping/services/shipping.endpoints";
import { BranchEndpoints } from "@/features/branches/services/branches.endpoints";
import type { Branch } from "@/features/branches/types/branch.type";
import {
  branchSummary,
  buildBranchPayload,
  validateBranchForm,
  visibleBranches,
} from "@/features/branches/lib/branch-form";
import { PlanEndpoints } from "@/features/plans/services/plans.endpoints";
import { PLAN_ORDER, type Plan } from "@/features/plans/types/plan.type";
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [branchName, setBranchName] = useState<string>("");
  const [branchAddress, setBranchAddress] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [current, agencyList, branchList, planPage] = await Promise.all([
          getTenantSettings(),
          apiClient.get<ShippingAgency[]>(ShippingEndpoints.agencies),
          apiClient
            .get<Branch[]>(BranchEndpoints.list)
            .catch(() => ({ data: [] as Branch[] })),
          apiClient
            .get<{ list: Plan[] }>(PlanEndpoints.list, {
              params: { limit: 20 },
            })
            .catch(() => ({ data: { list: [] as Plan[] } })),
        ]);
        if (cancelled) return;
        setSettings(current);
        setAgencies(agencyList.data);
        setBranches(branchList.data);
        setPlans(planPage.data.list ?? []);
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
    } catch (error) {
      setSettings(previous);
      // The plan/organization gates answer 403 with the explanation — show it as is.
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "No se pudo guardar el cambio. Volvemos al valor anterior.";
      addToast({
        type: "error",
        title: "Configuración",
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBranch = async (): Promise<void> => {
    const validation = validateBranchForm(branchName);
    if (validation) {
      addToast({ type: "warning", title: "Sucursales", message: validation });
      return;
    }

    setSaving(true);
    try {
      await apiClient.post(
        BranchEndpoints.list,
        buildBranchPayload(branchName, branchAddress),
      );
      const { data } = await apiClient.get<Branch[]>(BranchEndpoints.list);
      setBranches(data);
      setBranchName("");
      setBranchAddress("");
      addToast({
        type: "success",
        title: "Sucursales",
        message: "Sucursal creada.",
      });
    } catch (error) {
      // The plan capacity gate answers 409 with the explanation — show it as is.
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "No se pudo crear la sucursal.";
      addToast({ type: "error", title: "Sucursales", message });
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
        <SectionRow
          label="Control de apertura y cierre de caja"
          hint="Recomendado para comercios establecidos con arqueo por turno."
        >
          <Toggle
            checked={settings.cash.shiftControl}
            onChange={() => void save(patchCashShiftControl)}
          />
        </SectionRow>
      </SectionCard>

      <SectionCard
        icon={<Coins className="h-5 w-5" />}
        title="Monedas visibles"
        description="Solo cambia lo que se muestra: los montos siempre se guardan en USD, Bs y USDT."
      >
        <div className="grid sm:grid-cols-2 gap-x-6">
          {currencyKeys.map((key) => (
            <SectionRow key={key} label={CURRENCY_LABELS[key]}>
              <Checkbox
                checked={settings.currencies[key]}
                onChange={(event) =>
                  void save((current) =>
                    patchCurrency(current, key, event.target.checked),
                  )
                }
              />
            </SectionRow>
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
              <SectionRow key={type} label={FULFILLMENT_TYPE_LABELS[type]}>
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
              </SectionRow>
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
              <SectionRow key={agency.id} label={agency.name}>
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
              </SectionRow>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<Truck className="h-5 w-5" />}
        title="Delivery"
        description="Cobro de envío a domicilio; el monto se congela en cada pedido."
      >
        <SectionRow label="Habilitar delivery">
          <Toggle
            checked={settings.delivery.enabled}
            onChange={(event) =>
              void save((current) =>
                patchDeliveryEnabled(current, event.target.checked),
              )
            }
          />
        </SectionRow>
        <SectionRow label="Costo del delivery (USD)" hint="Se aplica a los pedidos de tipo delivery.">
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
        </SectionRow>
      </SectionCard>

      <SectionCard
        icon={<Map className="h-5 w-5" />}
        title="Rutas de entrega"
        description="Agrupa los pedidos de un día en una ruta. Al habilitarlo aparece la opción en el menú lateral."
      >
        <SectionRow label="Trabajar por rutas">
          <Toggle
            checked={settings.routes.enabled}
            onChange={(event) =>
              void save((current) =>
                patchRoutesEnabled(current, event.target.checked),
              )
            }
          />
        </SectionRow>
      </SectionCard>

      <SectionCard
        icon={<Building2 className="h-5 w-5" />}
        title="Sucursales"
        description={`${branchSummary(branches).included} incluida(s) en tu plan · ${branchSummary(branches).extra} creada(s)`}
      >
        {visibleBranches(branches).length > 0 ? (
          <div className="mb-3 space-y-1">
            {visibleBranches(branches).map((branch) => (
              <SectionRow
                key={branch.id}
                label={branch.name}
                hint={branch.address ?? "Sin dirección"}
              >
                <span className="text-xs text-slate-400">
                  {(branch._count?.sales ?? 0)} venta(s) ·{" "}
                  {(branch._count?.orders ?? 0)} pedido(s)
                </span>
              </SectionRow>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-sm text-slate-500">
            Tu plan trae una sucursal activa desde la creación del negocio. Las
            sucursales adicionales se suman acá.
          </p>
        )}

        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Nueva sucursal
            <input
              type="text"
              value={branchName}
              onChange={(event) => setBranchName(event.target.value)}
              placeholder="Sucursal Norte"
              className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Dirección (opcional)
            <input
              type="text"
              value={branchAddress}
              onChange={(event) => setBranchAddress(event.target.value)}
              placeholder="Av. Principal 123"
              className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <button
            type="button"
            disabled={saving || !branchName.trim()}
            onClick={() => void handleCreateBranch()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Agregar sucursal
          </button>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Sparkles className="h-5 w-5" />}
        title="Planes"
        description="Precios por usuario y mes; se cambian desde la plataforma, no desde acá."
      >
        {plans.length === 0 ? (
          <p className="text-sm text-slate-500">
            No se pudieron cargar los planes.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {[...plans]
              .sort((a, b) => {
                const order = (plan: Plan) => {
                  const index = PLAN_ORDER.indexOf(
                    plan.id as (typeof PLAN_ORDER)[number],
                  );
                  return index === -1 ? 99 : index;
                };
                return order(a) - order(b);
              })
              .map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{plan.name}</p>
                    {plan.badge ? (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] uppercase text-indigo-600 dark:bg-indigo-950">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-lg font-semibold">
                    ${Number(plan.price).toFixed(2)}
                    <span className="text-xs font-normal text-slate-400">
                      {" "}
                      /mes
                    </span>
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                    {(plan.content?.features ?? []).map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                  {plan.content?.capacity ? (
                    <p className="mt-2 text-[11px] text-slate-400">
                      {plan.content.capacity.maxBranches} sucursal(es) ·{" "}
                      {plan.content.capacity.includedSeats} empleado(s)
                    </p>
                  ) : null}
                </div>
              ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
