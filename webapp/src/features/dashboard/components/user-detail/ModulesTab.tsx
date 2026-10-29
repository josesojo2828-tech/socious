'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Package,
  Store,
  Settings2,
  Loader2,
  AlertCircle,
  Check,
  X,
  Puzzle,
  Calendar,
  Layers,
  KeyRound,
} from 'lucide-react';
import { Tabs } from '@/shared/components/organisms/Tabs';
import type { TabEntry } from '@/shared/components/organisms/Tabs/Tabs.types';
import { SectionCard, Field, StatusPill } from './SectionCard';
import { EntitlementCard } from '@/features/dashboard/components/EntitlementCard';
import { SellerPermissionCard } from '@/features/dashboard/components/SellerPermissionCard';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import {
  entitlementService,
  isEntitlementActive,
  isModuleGrantActive,
  type AddOn,
  type Entitlement,
  type ModuleCatalogEntry,
  type ModuleGrant,
} from '@/features/dashboard/service/entitlement.service';

interface ModulesTabProps {
  userId: string;
  /** Notified after a successful enable/disable so the parent can refetch. */
  onUpdated?: () => void;
}

function formatPrice(addOn: AddOn): string {
  const amount = Number(addOn.price);
  const value = Number.isFinite(amount) ? amount.toFixed(2) : String(addOn.price);
  const period = (addOn.billingPeriod || 'MONTHLY').toLowerCase();
  return `$${value} ${addOn.currency} / ${period}`;
}

function Chips({ values, emptyLabel }: { values?: string[]; emptyLabel: string }) {
  if (!values || values.length === 0) {
    return <span className="text-sm text-base-content/40">{emptyLabel}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span
          key={value}
          className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-base-200 text-base-content/70"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function ModuleDetailCard({ entitlement }: { entitlement: Entitlement }) {
  const addOn = entitlement.addOn;
  const quantity = Math.max(1, Number(entitlement.quantity) || 1);
  const unitPrice = Number(entitlement.priceAtPurchase);

  return (
    <div className="space-y-6">
      <SectionCard
        title={addOn?.name ?? 'Módulo'}
        icon={Puzzle}
        iconClassName="text-primary"
        actions={<StatusPill status={entitlement.status} />}
      >
        <div className="space-y-5">
          {addOn?.description && (
            <p className="text-sm text-base-content/70">{addOn.description}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <Field label="Clave">
              <span className="font-mono text-sm">{addOn?.key ?? '—'}</span>
            </Field>
            <Field label="Precio">
              {Number.isFinite(unitPrice) ? (
                <span className="font-bold">
                  ${unitPrice.toFixed(2)} {entitlement.currency}
                  {quantity > 1 ? ` × ${quantity}` : ''}
                </span>
              ) : (
                '—'
              )}
            </Field>
            <Field label="Alta">
              {new Date(entitlement.startDate).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Field>
            <Field label="Vencimiento">
              {entitlement.endDate
                ? new Date(entitlement.endDate).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Sin vencimiento'}
            </Field>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4 border-t border-base-300">
            <div>
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <KeyRound size={14} /> Permisos otorgados
              </p>
              <Chips values={addOn?.grants} emptyLabel="Sin permisos declarados" />
            </div>
            <div>
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers size={14} /> Módulos habilitados
              </p>
              <Chips values={addOn?.modules} emptyLabel="Sin módulos declarados" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs text-base-content/50">
            <Calendar size={14} />
            {addOn ? `Facturación: ${formatPrice(addOn)}` : 'Facturación mensual'}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function EmptyModules() {
  return (
    <SectionCard title="Módulos activos" icon={Package}>
      <div className="text-center py-10">
        <Package size={40} className="mx-auto text-base-content/30 mb-3" />
        <p className="font-medium text-base-content">Sin módulos activos</p>
        <p className="text-sm text-base-content/60 mt-1">
          Usá la pestaña <strong>Gestión</strong> para habilitar add-ons a este usuario.
        </p>
      </div>
    </SectionCard>
  );
}

/**
 * Module-framework assignment panel: lists the active module catalog with the
 * user's granted/not-granted state and offers assign/revoke with an OPTIONAL
 * expiry date. Personal scope only (`userId`); org grants are managed elsewhere.
 */
function ModuleGrantList({
  userId,
  onUpdated,
}: {
  userId: string;
  onUpdated?: () => void;
}) {
  const { addToast } = useToastStore();
  const [catalog, setCatalog] = useState<ModuleCatalogEntry[]>([]);
  const [grants, setGrants] = useState<ModuleGrant[]>([]);
  const [expiryDrafts, setExpiryDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [modules, current] = await Promise.all([
        entitlementService.listModules(),
        entitlementService.listModuleGrants({ userId }),
      ]);
      setCatalog(modules);
      setGrants(current);
    } catch (err) {
      console.error('Error al cargar asignaciones de módulos:', err);
      setError('No se pudieron cargar los módulos del catálogo.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeGrantByKey = useMemo(() => {
    const map = new Map<string, ModuleGrant>();
    for (const grant of grants) {
      if (!isModuleGrantActive(grant)) continue;
      const key = grant.module?.key;
      if (key && !map.has(key)) map.set(key, grant);
    }
    return map;
  }, [grants]);

  const handleToggle = useCallback(
    async (module: ModuleCatalogEntry) => {
      const active = activeGrantByKey.get(module.key);
      setPendingKey(module.key);
      try {
        if (active) {
          await entitlementService.revokeModule(active.id);
          addToast({
            type: 'success',
            title: 'Módulo revocado',
            message: `Se revocó el acceso a ${module.name}.`,
          });
        } else {
          const draft = expiryDrafts[module.key];
          await entitlementService.assignModule({
            moduleKey: module.key,
            userId,
            expiresAt: draft ? new Date(draft).toISOString() : undefined,
          });
          setExpiryDrafts((prev) => ({ ...prev, [module.key]: '' }));
          addToast({
            type: 'success',
            title: 'Módulo asignado',
            message: `Se asignó ${module.name}${draft ? ' con vencimiento' : ''}.`,
          });
        }
        await load();
        onUpdated?.();
      } catch (err) {
        console.error('Error al actualizar la asignación de módulo:', err);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'No se pudo actualizar la asignación. Intentá de nuevo.',
        });
      } finally {
        setPendingKey(null);
      }
    },
    [activeGrantByKey, addToast, expiryDrafts, load, onUpdated, userId],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 text-base-content/60">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando catálogo de módulos...
      </div>
    );
  }

  return (
    <SectionCard title="Asignación de módulos" icon={Layers}>
      <p className="text-xs text-base-content/60 mb-4">
        Asigná o revocá módulos del catálogo para este usuario. La fecha de
        vencimiento es opcional: si la dejás vacía, el acceso no vence.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {catalog.length === 0 ? (
        <div className="text-center py-8 text-base-content/50 text-sm">
          No hay módulos activos en el catálogo.
        </div>
      ) : (
        <div className="space-y-3">
          {catalog.map((module) => {
            const active = activeGrantByKey.get(module.key);
            const isPending = pendingKey === module.key;
            const draft = expiryDrafts[module.key] ?? '';

            return (
              <div
                key={module.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl border border-base-300 bg-base-200/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-sm text-base-content truncate">
                      {module.name}
                    </p>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-base-300 text-base-content/70 shrink-0">
                      {module.key}
                    </span>
                    <StatusPill status={active ? 'ACTIVE' : 'INACTIVE'} />
                  </div>
                  {module.description && (
                    <p className="text-xs text-base-content/60 mt-0.5 line-clamp-2">
                      {module.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {module.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-base-200 text-base-content/60"
                      >
                        {scope}
                      </span>
                    ))}
                    {active?.expiresAt && (
                      <span className="text-[11px] text-base-content/60 flex items-center gap-1">
                        <Calendar size={12} />
                        Vence:{' '}
                        {new Date(active.expiresAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!active && (
                    <label className="flex items-center gap-1.5 text-[11px] text-base-content/60">
                      <Calendar size={13} />
                      <input
                        type="date"
                        value={draft}
                        onChange={(event) =>
                          setExpiryDrafts((prev) => ({
                            ...prev,
                            [module.key]: event.target.value,
                          }))
                        }
                        className="px-2 py-1.5 text-xs bg-base-100 border border-base-300 rounded-lg focus:border-primary outline-none text-base-content"
                        title="Vencimiento opcional"
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggle(module)}
                    disabled={isPending}
                    className={`btn btn-sm shrink-0 ${
                      active ? 'btn-error' : 'btn-success'
                    }`}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : active ? (
                      <>
                        <X size={16} /> Revocar
                      </>
                    ) : (
                      <>
                        <Check size={16} /> Asignar
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

/**
 * Módulos tab: one DYNAMIC sub-tab per active entitlement (add-on) plus the
 * always-present Marketplace module and the management panel. The sub-tab list
 * is derived from `GET /api/entitlements/users/:id`.
 */
export function ModulesTab({ userId, onUpdated }: ModulesTabProps) {
  const [catalog, setCatalog] = useState<AddOn[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [addOns, current] = await Promise.all([
        entitlementService.listAddOns(),
        entitlementService.listForUser(userId),
      ]);
      setCatalog(addOns);
      setEntitlements(current);
    } catch (err) {
      console.error('Error al cargar módulos del usuario:', err);
      setError('No se pudieron cargar los módulos del usuario.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeEntitlements = useMemo(
    () => entitlements.filter(isEntitlementActive),
    [entitlements],
  );

  const handleUpdated = useCallback(() => {
    void load();
    onUpdated?.();
  }, [load, onUpdated]);

  const items = useMemo<TabEntry[]>(() => {
    const tabs: TabEntry[] = [];

    if (activeEntitlements.length === 0) {
      tabs.push({
        label: 'Sin módulos',
        value: 'empty',
        icon: Package,
        content: <EmptyModules />,
      });
    } else {
      for (const entitlement of activeEntitlements) {
        tabs.push({
          label: entitlement.addOn?.name ?? 'Módulo',
          value: `entitlement-${entitlement.id}`,
          icon: Puzzle,
          content: <ModuleDetailCard entitlement={entitlement} />,
        });
      }
    }

    tabs.push({
      label: 'Asignaciones',
      value: 'module-grants',
      icon: Layers,
      content: <ModuleGrantList userId={userId} onUpdated={handleUpdated} />,
    });

    tabs.push({
      label: 'Marketplace',
      value: 'marketplace',
      icon: Store,
      content: (
        <SellerPermissionCard userId={userId} onStatusUpdated={onUpdated} />
      ),
    });

    tabs.push({
      label: 'Gestión',
      value: 'management',
      icon: Settings2,
      content: <EntitlementCard userId={userId} onUpdated={handleUpdated} />,
    });

    return tabs;
  }, [activeEntitlements, userId, onUpdated, handleUpdated]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 text-base-content/60">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando módulos del usuario...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base-content flex items-center gap-2">
            <Package size={18} className="text-base-content/50" />
            Módulos y add-ons
          </h3>
          <p className="text-xs text-base-content/60 mt-0.5">
            {activeEntitlements.length} módulo(s) contratado(s) · catálogo con {catalog.length}{' '}
            add-on(s) disponible(s).
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
          <Check size={14} />
          {activeEntitlements.length} activo(s)
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <Tabs items={items} variant="boxed" contentClassName="bg-base-100" />
    </div>
  );
}
