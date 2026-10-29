'use client';

import { useCallback, useEffect, useState } from 'react';
import { Package, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import {
  entitlementService,
  isEntitlementActive,
  type AddOn,
  type Entitlement,
} from '@/features/dashboard/service/entitlement.service';

interface EntitlementCardProps {
  /** Owner of the personal entitlements. */
  userId: string;
  /**
   * Optional organization scope. When provided the card manages the
   * organization's entitlements instead of the user's personal ones.
   */
  organizationId?: string | null;
  /** Notified after a successful enable/disable so the parent can refetch. */
  onUpdated?: () => void;
}

function formatPrice(addOn: AddOn): string {
  const amount = Number(addOn.price);
  const value = Number.isFinite(amount) ? amount.toFixed(2) : String(addOn.price);
  const period = (addOn.billingPeriod || 'MONTHLY').toLowerCase();
  return `$${value} ${addOn.currency} / ${period}`;
}

/**
 * Admin toggle for add-on entitlements. Lists the active catalog and lets an
 * admin enable/disable each add-on for the given owner (personal by default, or
 * an organization when `organizationId` is provided).
 *
 * Enable is idempotent on the backend (a canceled entitlement is reactivated),
 * so the toggle reflects the resolved ACTIVE state rather than raw presence.
 */
export function EntitlementCard({
  userId,
  organizationId,
  onUpdated,
}: EntitlementCardProps) {
  const { addToast } = useToastStore();
  const [catalog, setCatalog] = useState<AddOn[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const isOrgScope = Boolean(organizationId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [addOns, current] = await Promise.all([
        entitlementService.listAddOns(),
        organizationId
          ? entitlementService.listForOrganization(organizationId)
          : entitlementService.listForUser(userId),
      ]);
      setCatalog(addOns);
      setEntitlements(current);
    } catch (err) {
      console.error('Error al cargar add-ons/entitlements:', err);
      setError('No se pudieron cargar los módulos habilitables.');
    } finally {
      setLoading(false);
    }
  }, [userId, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = async (addOn: AddOn) => {
    const existing = entitlements.find((e) => e.addOnId === addOn.id);
    const active = existing ? isEntitlementActive(existing) : false;

    setPendingId(addOn.id);
    try {
      if (active && existing) {
        if (organizationId) {
          await entitlementService.disableForOrganization(organizationId, existing.id);
        } else {
          await entitlementService.disableForUser(userId, existing.id);
        }
        addToast({
          type: 'success',
          title: 'Add-on deshabilitado',
          message: `Se deshabilitó ${addOn.name}.`,
        });
      } else {
        if (organizationId) {
          await entitlementService.enableForOrganization(organizationId, {
            addOnId: addOn.id,
          });
        } else {
          await entitlementService.enableForUser(userId, { addOnId: addOn.id });
        }
        addToast({
          type: 'success',
          title: 'Add-on habilitado',
          message: `Se habilitó ${addOn.name}.`,
        });
      }
      await load();
      onUpdated?.();
    } catch (err) {
      console.error('Error al actualizar entitlement:', err);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar el módulo. Intentá de nuevo.',
      });
    } finally {
      setPendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
          <span className="text-slate-500 dark:text-slate-400">
            Cargando módulos habilitables...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-slate-400 dark:text-slate-500" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            Módulos / Add-ons
          </h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {isOrgScope ? 'Organización' : 'Personal'}
        </span>
      </div>

      <div className="p-6">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {isOrgScope
            ? 'Habilitá o deshabilitá módulos contratables para esta organización. Los permisos quedan dormantes al deshabilitar y se reactivan al volver a habilitar.'
            : 'Habilitá o deshabilitá módulos contratables para este usuario (alcance personal). Los permisos quedan dormantes al deshabilitar y se reactivan al volver a habilitar.'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {catalog.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
            No hay add-ons disponibles en el catálogo.
          </div>
        ) : (
          <div className="space-y-3">
            {catalog.map((addOn) => {
              const existing = entitlements.find((e) => e.addOnId === addOn.id);
              const active = existing ? isEntitlementActive(existing) : false;
              const isPending = pendingId === addOn.id;

              return (
                <div
                  key={addOn.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {addOn.name}
                      </p>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-300 shrink-0">
                        {addOn.key}
                      </span>
                    </div>
                    {addOn.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {addOn.description}
                      </p>
                    )}
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                      {formatPrice(addOn)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle(addOn)}
                    disabled={isPending}
                    className={`btn btn-sm shrink-0 ${
                      active ? 'btn-error' : 'btn-success'
                    }`}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : active ? (
                      <>
                        <X size={16} /> Deshabilitar
                      </>
                    ) : (
                      <>
                        <Check size={16} /> Habilitar
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
