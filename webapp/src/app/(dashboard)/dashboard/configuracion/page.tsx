"use client";

import { type ReactNode, useEffect, useState } from "react";
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
  Boxes,
  Briefcase,
  Store,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { Toggle } from "@/shared/components/atoms/Toggle";
import { Checkbox } from "@/shared/components/atoms/Checkbox";
import { SectionRow } from "@/shared/components/molecules/SectionCard";
import {
  BRASS_DOT,
  BTN_GHOST,
  CARD,
  CARD_HEADER,
  CTA_BRASS,
  EYEBROW,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
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
import { UnitsPanel } from "@/features/units/components/UnitsPanel";
import { CategoriesPanel } from "@/features/categories/components/CategoriesPanel";
import {
  CreditSettingsPanel,
  NotificationsPanel,
  PaymentMethodsPanel,
  ReturnReasonsPanel,
} from "@/features/settings/components/SalesSettingsPanels";
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
  patchInventoryUseRawMaterials,
  patchInventoryUseServices,
  patchStorefrontWhatsapp,
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

/** Card blanca con icono en latón: el chrome de sección del lenguaje Maison. */
function SectionPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl overflow-hidden ${CARD}`}>
      <div className={CARD_HEADER}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-[#b2944a]">{icon}</span>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/**
 * Tenant configuration (S4): the six checks the backend exposes at
 * GET/PATCH /api/settings. Every change is saved immediately and optimistically;
 * a rejected patch (the backend validates strictly) restores the previous value.
 * S5 restyle: Maison chrome (eyebrow header, brass tabs, hairline cards); the
 * tabs, panels, gates and every save/patch call stay untouched.
 */
export default function SettingsPage() {
  const { addToast } = useToastStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [agencies, setAgencies] = useState<ShippingAgency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tab, setTab] = useState<
    "general" | "inventory" | "payments" | "credit" | "returns" | "notifications"
  >("general");
  const [whatsappInput, setWhatsappInput] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("");
  const [branchAddress, setBranchAddress] = useState<string>("");

  useEffect(() => {
    if (settings) setWhatsappInput(settings.storefront?.whatsapp ?? "");
  }, [settings]);

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
      // Settings feed the sidebar (cash title, routes…): refetch it so the
      // change is visible without a full reload.
      void useAuthStore.getState().refreshSession();
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
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No se pudo cargar la configuración.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={BTN_GHOST}
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
  // Shipping, delivery and routes live in the AVANZADO+ plans; a Básico
  // tenant never sees the switches for features their plan does not include.
  const planModules = settings.planModules ?? [];
  const canManageShipping = planModules.includes("SHIPPING");
  const canManageRoutes = planModules.includes("ROUTES");

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span className="truncate max-w-[180px]">
              {activeWorkspace?.name ?? "Socius ERP"}
            </span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Ajustes</span>
            <span className={BRASS_DOT} aria-hidden />
            <span className="font-mono">{planModules.length} módulos</span>
          </div>
          <h1 className={PAGE_TITLE}>Configuración del negocio</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Los cambios se guardan solos a medida que los marcas.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#1a2a46]/12 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:text-slate-400">
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 text-[#b2944a]" /> Guardado
            </>
          )}
        </span>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-[#1a2a46]/12 dark:border-white/10">
        {(
          [
            ["general", "General"],
            ["inventory", "Inventario"],
            ["payments", "Pagos"],
            ["credit", "Ventas a crédito"],
            ["returns", "Devoluciones"],
            ...(planModules.includes("NOTIFICATIONS")
              ? ([["notifications", "Notificaciones"]] as const)
              : []),
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={
              tab === key
                ? "border-b-2 border-[#b2944a] px-4 py-2 text-sm font-semibold text-[#111018] dark:text-slate-50"
                : "border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "general" ? (
        <>
      <SectionPanel
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
      </SectionPanel>

      <SectionPanel
        icon={<Store className="h-5 w-5" />}
        title="Tienda pública"
        description={`Tu tienda vive en /${activeWorkspace?.slug ?? "tu-usuario"}. Los clientes arman el pedido y coordinan el pago por WhatsApp.`}
      >
        <SectionRow
          label="WhatsApp para coordinar pagos"
          hint="Con código de país, solo números (ej. 584241234567). Vacío = sin botón de WhatsApp."
        >
          <div className="flex items-center gap-2">
            <input
              value={whatsappInput}
              onChange={(event) => setWhatsappInput(event.target.value)}
              inputMode="numeric"
              placeholder="584241234567"
              className={`w-44 font-mono ${INPUT}`}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void save(() => patchStorefrontWhatsapp(whatsappInput))
              }
              className="inline-flex items-center justify-center rounded-xl bg-[#1a2a46] px-3 py-2 text-sm font-semibold text-[#f0ede4] transition-colors hover:bg-[#243a5e] disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </SectionRow>
      </SectionPanel>

      <SectionPanel
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
      </SectionPanel>

      {canManageShipping ? (
        <>
      <SectionPanel
        icon={<Truck className="h-5 w-5" />}
        title="Tipos de entrega"
        description="Lo que el cliente puede elegir al hacer el pedido, y cómo se coordina la entrega."
      >
        <div className="grid sm:grid-cols-2 gap-x-6">
          {fulfillmentTypes.map((type) => {
            const enabled = settings.fulfillment.enabledTypes.includes(type);
            return (
              <SectionRow key={type} label={FULFILLMENT_TYPE_LABELS[type]}>
                <Checkbox
                  checked={enabled}
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
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Sin ningún tipo marcado, todos los pedidos se coordinan con el dueño.
        </p>
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-[#1a2a46]/10 pt-3 dark:border-white/10">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Coordinación por defecto
          </p>          <select
            className={`w-auto ${INPUT}`}
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
      </SectionPanel>

      <SectionPanel
        icon={<TruckElectric className="h-5 w-5" />}
        title="Agencias de envío"
        description="Las agencias habilitadas son las que el cliente elige al pedir envío."
      >
        {agencies.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
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
      </SectionPanel>

      <SectionPanel
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
            className={`w-28 font-mono tabular-nums disabled:opacity-50 ${INPUT}`}
          />
        </SectionRow>
      </SectionPanel>
        </>
      ) : null}

      {canManageRoutes ? (
        <SectionPanel
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
        </SectionPanel>
      ) : null}

      {settings?.manualGrants?.includes("BRANCHES") ? (
      <SectionPanel
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
                <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {(branch._count?.sales ?? 0)} venta(s) ·{" "}
                  {(branch._count?.orders ?? 0)} pedido(s)
                </span>
              </SectionRow>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Tu plan trae una sucursal activa desde la creación del negocio. Las
            sucursales adicionales se suman acá.
          </p>
        )}

        <div className="flex flex-wrap items-end gap-3 border-t border-[#1a2a46]/10 pt-3 dark:border-white/10">
          <label className={LABEL_SM}>
            Nueva sucursal
            <input
              type="text"
              value={branchName}
              onChange={(event) => setBranchName(event.target.value)}
              placeholder="Sucursal Norte"
              className={`mt-1 w-56 ${INPUT}`}
            />
          </label>
          <label className={LABEL_SM}>
            Dirección (opcional)
            <input
              type="text"
              value={branchAddress}
              onChange={(event) => setBranchAddress(event.target.value)}
              placeholder="Av. Principal 123"
              className={`mt-1 w-64 ${INPUT}`}
            />
          </label>
          <button
            type="button"
            disabled={saving || !branchName.trim()}
            onClick={() => void handleCreateBranch()}
            className={`px-4 py-2 text-sm ${CTA_BRASS}`}
          >
            Agregar sucursal
          </button>
        </div>
      </SectionPanel>
      ) : null}

      <SectionPanel
        icon={<Sparkles className="h-5 w-5" />}
        title="Planes"
        description="Precios por usuario y mes; se cambian desde la plataforma, no desde acá."
      >
        {plans.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
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
                  className="rounded-xl border border-[#1a2a46]/12 p-3 dark:border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#111018] dark:text-slate-100">
                      {plan.name}
                    </p>
                    {plan.badge ? (
                      <span className="rounded-full border border-[#b2944a]/40 bg-[#b2944a]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8e7538] dark:text-[#d8c084]">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#111018] dark:text-slate-100">
                    ${Number(plan.price).toFixed(2)}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      {" "}
                      /mes
                    </span>
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {(plan.content?.features ?? []).map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                  {plan.content?.capacity ? (
                    <p className="mt-2 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {plan.content.capacity.maxBranches} sucursal(es) ·{" "}
                      {plan.content.capacity.includedSeats} empleado(s)
                    </p>
                  ) : null}
                </div>
              ))}
          </div>
        )}
      </SectionPanel>
        </>
      ) : null}

      {tab === "inventory" ? (
        <>
          {settings ? (
            <SectionPanel
              icon={<Boxes className="h-5 w-5" />}
              title="Materia prima"
              description="Productos compuestos (BOM): al vender, el sistema descuenta los insumos del inventario. Activa también la pantalla Materiales."
            >
              <SectionRow
                label="Trabajar con materia prima"
                hint="Activo: aparece la pantalla Materiales, el form de producto muestra la sección de componentes y las ventas bloquean si falta insumo."
              >
                <Toggle
                  checked={settings.inventory.useRawMaterials}
                  onChange={() => void save(patchInventoryUseRawMaterials)}
                />
              </SectionRow>
            </SectionPanel>
          ) : null}
          {settings ? (
            <SectionPanel
              icon={<Briefcase className="h-5 w-5" />}
              title="Servicios"
              description="Habilita la pantalla de servicios: productos sin stock que se venden desde el POS."
            >
              <SectionRow
                label="Trabajar con servicios"
                hint="Activo: aparece la pantalla Servicios para cargar y editar servicios. Inactivo: la pantalla y su entrada del menú quedan ocultas."
              >
                <Toggle
                  checked={settings.inventory.useServices}
                  onChange={() => void save(patchInventoryUseServices)}
                />
              </SectionRow>
            </SectionPanel>
          ) : null}
          <UnitsPanel />
          <CategoriesPanel />
        </>
      ) : null}

      {tab === "payments" ? <PaymentMethodsPanel /> : null}

      {tab === "credit" && settings ? (
        <CreditSettingsPanel
          settings={settings}
          save={async (patch) => save(() => patch as TenantSettingsPatch)}
        />
      ) : null}

      {tab === "returns" && settings ? (
        <ReturnReasonsPanel
          settings={settings}
          save={async (patch) => save(() => patch as TenantSettingsPatch)}
        />
      ) : null}

      {tab === "notifications" && settings ? (
        <NotificationsPanel
          settings={settings}
          save={async (patch) => save(() => patch as TenantSettingsPatch)}
        />
      ) : null}
    </div>
  );
}
