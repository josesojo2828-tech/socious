'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/shared/api/api.client';
import {
  entitlementService,
  isEntitlementActive,
  type Entitlement,
} from '@/features/dashboard/service/entitlement.service';
import type {
  BillingHistoryResult,
  Invoice,
  InvoiceLineType,
} from '@/types/backend/billing.types';
import type { UserDetailSubscription } from '@/types/backend/user-detail.type';

/** Loose shape for the admin transaction list (dynamic backend formatter). */
export interface UserTransaction {
  id: string;
  createdAt: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  type?: string;
  referenceCode?: string | null;
  description?: string | null;
  paymentMethod?: { paymentMethod?: { name?: string | null } | null } | null;
}

/** Loose shape for the admin payment-method list. */
export interface UserPaymentMethod {
  id: string;
  isDefault?: boolean;
  active?: boolean;
  paymentMethod?: { name?: string | null } | null;
  details?: Record<string, unknown> | null;
}

export interface MonthlyInvoiceLine {
  key: string;
  label: string;
  sublabel: string;
  amount: number;
}

export interface MonthlyInvoiceSummary {
  /** Authoritative total from the latest issued invoice, or a computed estimate. */
  total: number;
  currency: string;
  /** `invoice` when backed by a real invoice, `estimate` when computed locally. */
  source: 'invoice' | 'estimate';
  /** Human period label (`septiembre de 2026`) for invoice-backed totals. */
  periodLabel: string | null;
  lines: MonthlyInvoiceLine[];
}

export interface UseUserBillingResult {
  invoices: Invoice[];
  transactions: UserTransaction[];
  paymentMethods: UserPaymentMethod[];
  activeEntitlements: Entitlement[];
  monthlyInvoice: MonthlyInvoiceSummary;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const LINE_TYPE_LABEL: Record<InvoiceLineType, string> = {
  BASE_PLAN: 'Plan base',
  SEAT: 'Cupos adicionales',
  ADDON: 'Módulo add-on',
};

function formatPeriodLabel(periodStart: string): string {
  const date = new Date(periodStart);
  if (Number.isNaN(date.getTime())) return 'Período actual';
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.list)) return record.list;
    if (Array.isArray(record.data)) return record.data;
  }
  return [];
}

/**
 * Loads every billing surface the user-detail "Suscripción y pagos" tab needs:
 * personal invoices, admin transaction/payment-method lists and the user's
 * active entitlements (to estimate the monthly invoice when none was issued).
 *
 * The monthly total is authoritative when an invoice exists — the backend
 * already folds base plan + seats + add-ons into `Invoice.total` — and falls
 * back to `plan + add-ons` for users who have never been billed.
 */
export function useUserBilling(
  userId: string | undefined,
  email: string | undefined,
  subscription: UserDetailSubscription | null,
): UseUserBillingResult {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<UserPaymentMethod[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch (err) {
        console.error('Error al cargar datos de facturación:', err);
        return fallback;
      }
    };

    try {
      const [invoiceList, txList, pmList, entitlementList] = await Promise.all([
        safe(async () => {
          const { data } = await apiClient.get<BillingHistoryResult>(
            '/api/billing/invoices',
            { params: { ownerType: 'user', ownerId: userId, limit: 12 } },
          );
          return data?.list ?? [];
        }, [] as Invoice[]),
        safe(async () => {
          if (!email) return [] as UserTransaction[];
          const { data } = await apiClient.get(
            '/api/dashboard/transactions/api/list',
            { params: { q: email, limit: 10 } },
          );
          return pickList(data) as UserTransaction[];
        }, [] as UserTransaction[]),
        safe(async () => {
          if (!email) return [] as UserPaymentMethod[];
          const { data } = await apiClient.get(
            '/api/dashboard/users/payment-methods/api/list',
            { params: { q: email, limit: 10 } },
          );
          return pickList(data) as UserPaymentMethod[];
        }, [] as UserPaymentMethod[]),
        safe(() => entitlementService.listForUser(userId), [] as Entitlement[]),
      ]);

      setInvoices(invoiceList);
      setTransactions(txList);
      setPaymentMethods(pmList);
      setEntitlements(entitlementList);
    } catch (err) {
      console.error('Error al cargar datos de facturación:', err);
      setError('No se pudieron cargar los datos de facturación.');
    } finally {
      setLoading(false);
    }
  }, [userId, email]);

  useEffect(() => {
    load();
  }, [load]);

  const activeEntitlements = useMemo(
    () => entitlements.filter(isEntitlementActive),
    [entitlements],
  );

  const monthlyInvoice = useMemo<MonthlyInvoiceSummary>(() => {
    const latestInvoice = invoices[0] ?? null;

    if (latestInvoice) {
      const lines: MonthlyInvoiceLine[] = (latestInvoice.lines ?? []).map(
        (line) => {
          const quantity = toNumber(line.quantity);
          const unitPrice = toNumber(line.unitPrice);
          return {
            key: line.id,
            label: line.description,
            sublabel: `${
              LINE_TYPE_LABEL[line.type] ?? 'Concepto'
            }${
              quantity > 1 ? ` · ${quantity} × $${unitPrice.toFixed(2)}` : ''
            }`,
            amount: toNumber(line.amount),
          };
        },
      );

      return {
        total: toNumber(latestInvoice.total),
        currency: latestInvoice.currency || 'USD',
        source: 'invoice',
        periodLabel: formatPeriodLabel(latestInvoice.periodStart),
        lines,
      };
    }

    const lines: MonthlyInvoiceLine[] = [];
    if (subscription) {
      lines.push({
        key: 'base-plan',
        label: `Plan ${subscription.plan.name}`,
        sublabel: 'Suscripción base mensual',
        amount: toNumber(subscription.plan.price),
      });
    }

    for (const entitlement of activeEntitlements) {
      const quantity = Math.max(1, toNumber(entitlement.quantity));
      const unitPrice = toNumber(entitlement.priceAtPurchase);
      lines.push({
        key: entitlement.id,
        label: entitlement.addOn?.name ?? 'Módulo add-on',
        sublabel:
          quantity > 1
            ? `Módulo add-on · ${quantity} × $${unitPrice.toFixed(2)}`
            : 'Módulo add-on',
        amount: quantity * unitPrice,
      });
    }

    return {
      total: lines.reduce((acc, line) => acc + line.amount, 0),
      currency: subscription?.plan.currency || 'USD',
      source: 'estimate',
      periodLabel: null,
      lines,
    };
  }, [invoices, subscription, activeEntitlements]);

  return {
    invoices,
    transactions,
    paymentMethods,
    activeEntitlements,
    monthlyInvoice,
    loading,
    error,
    refetch: load,
  };
}
