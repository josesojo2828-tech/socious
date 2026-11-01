"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Paperclip,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { Checkbox } from "@/shared/components/atoms/Checkbox";
import {
  BTN_GHOST,
  BRASS_DOT,
  CARD,
  CTA_BRASS,
  CTA_NAVY,
  EYEBROW,
  GLASS,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { PurchaseEndpoints } from "@/features/purchases/services/purchases.endpoints";
import { SupplierEndpoints } from "@/features/suppliers/services/suppliers.endpoints";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import { ExchangeEndpoints } from "@/features/exchange/services/exchange.endpoints";
import type { ExchangeRates } from "@/features/products/lib/price-currency";
import type { Product } from "@/features/products/types/product.type";
import type { Purchase } from "@/features/purchases/types/purchase.type";
import type { Supplier } from "@/features/suppliers/types/supplier.type";
import type { TenantSettings } from "@/features/settings/types/tenant-settings.type";
import {
  applySettingsPatch,
} from "@/features/settings/lib/settings-form";
import {
  getTenantSettings,
  updateTenantSettings,
} from "@/features/settings/services/settings.service";
import {
  buildCreatePayload,
  emptyPurchaseLine,
  purchaseCurrencyEquivalents,
  purchaseSummary,
  validatePurchaseForm,
  type PurchaseForm,
} from "@/features/purchases/lib/purchase-form";
import {
  INVOICE_ACCEPT,
  buildInvoiceUploadForm,
  invoiceDisplayName,
  invoiceFileError,
} from "@/features/purchases/lib/purchase-invoice";
import {
  clearDraft,
  loadDraft,
  pickResumeDraft,
  saveDraft,
  type PurchaseDraft,
} from "@/features/purchases/lib/purchase-draft";
import {
  deletePurchaseDraft,
  fetchPurchaseDraft,
  savePurchaseDraft,
} from "@/features/purchases/services/purchase-drafts.service";

interface Paged<T> {
  list: T[];
  total: number;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/** "≈ X Bs" / "≈ Y USDT" — same locale formatting the POS/product pages use. */
function formatEquivalent(
  currency: "VES" | "USDT",
  amount: number,
): string {
  if (currency === "VES") return `≈ ${amount.toLocaleString("es-VE")} Bs`;
  return `≈ ${amount.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDT`;
}

function emptyForm(): PurchaseForm {
  return {
    supplierId: "",
    issueDate: todayISO(),
    dueDate: "",
    notes: "",
    items: [emptyPurchaseLine()],
  };
}

/**
 * Dedicated purchase-create screen (S4 + S13 + S14): a GUIDED flow —
 * supplier first, then the product catalog of that supplier (filtered by the
 * `purchases.onlySupplierProducts` tenant check), dates/notes/optional invoice
 * attachment and a detailed resumen with per-currency equivalents.
 *
 * The account-synced draft keeps its contract: the server copy (one per org +
 * user) is the source of truth, localStorage the offline fallback — and the
 * draft payload now carries `invoiceKey` when an invoice was attached.
 */
export default function NewPurchasePage() {
  const router = useRouter();
  const { addToast } = useToastStore();

  const [form, setForm] = useState<PurchaseForm>(emptyForm);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(true);
  const [catalogSearch, setCatalogSearch] = useState<string>("");

  /** Tenant settings (S14 #2): the toggle reads and writes this copy. */
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  /** Today's rates for the ≈ equivalents (S14 #7). */
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  const [invoiceUploading, setInvoiceUploading] = useState<boolean>(false);
  const [invoiceFileName, setInvoiceFileName] = useState<string | null>(null);
  const invoiceInputRef = useRef<HTMLInputElement | null>(null);

  const [pendingDraft, setPendingDraft] = useState<PurchaseDraft | null>(null);
  const [draftOrigin, setDraftOrigin] = useState<"server" | "local">("server");
  const [draftSyncFailed, setDraftSyncFailed] = useState<boolean>(false);
  const [draftBusy, setDraftBusy] = useState<boolean>(false);

  const onlySupplierProducts =
    settings?.purchases?.onlySupplierProducts ?? false;

  // Suppliers + tenant settings + rates: everything EXCEPT the catalog,
  // which re-fetches whenever the supplier or the toggle changes.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [supplierRes, currentSettings, rateView] = await Promise.all([
        apiClient
          .get<Paged<Supplier>>(SupplierEndpoints.list, {
            params: { limit: 100 },
          })
          .catch(() => ({ data: { list: [] as Supplier[], total: 0 } })),
        getTenantSettings().catch(() => null),
        apiClient
          .get<ExchangeRates>(ExchangeEndpoints.latest)
          .catch(() => ({ data: null as ExchangeRates | null })),
      ]);
      if (cancelled) return;
      setSuppliers(supplierRes.data.list ?? []);
      setSettings(currentSettings);
      if (rateView.data?.rateBcv) {
        setRates({
          rateBcv: Number(rateView.data.rateBcv),
          rateUsdt: Number(rateView.data.rateUsdt) || 1,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Catalog (S14 #3): toggle ON + supplier → only that supplier's products;
  // otherwise the whole catalog. Re-fetches on every supplier/toggle change.
  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    void (async () => {
      const { data } = await apiClient
        .get<Paged<Product>>(ProductEndpoints.list, {
          params: {
            limit: 200,
            ...(onlySupplierProducts && form.supplierId
              ? { supplierId: form.supplierId }
              : {}),
          },
        })
        .catch(() => ({ data: { list: [] as Product[], total: 0 } }));
      if (cancelled) return;
      setProducts(data.list ?? []);
      setCatalogLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [form.supplierId, onlySupplierProducts]);

  // Resume banner: server draft first (account-synced), station copy as the
  // fallback when the request fails (401, offline) or the account is empty.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let serverDraft: PurchaseDraft | null = null;
      let syncFailed = false;
      try {
        serverDraft = await fetchPurchaseDraft();
      } catch {
        syncFailed = true;
      }
      if (cancelled) return;
      const draft = pickResumeDraft(serverDraft, loadDraft());
      setPendingDraft(draft);
      setDraftOrigin(serverDraft ? "server" : "local");
      setDraftSyncFailed(syncFailed);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resumeDraft = useCallback(() => {
    const draft = pendingDraft;
    if (!draft) return;
    setForm({
      supplierId: draft.supplierId,
      issueDate: draft.issueDate || todayISO(),
      dueDate: draft.dueDate,
      notes: draft.notes,
      // Drafts saved before S14 simply carry no invoice.
      ...(draft.invoiceKey ? { invoiceKey: draft.invoiceKey } : {}),
      items:
        draft.items.length > 0 ? draft.items : [emptyPurchaseLine()],
    });
    setPendingDraft(null);
    setFormError(null);
  }, [pendingDraft]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setPendingDraft(null);
    setDraftSyncFailed(false);
    // Best-effort server delete: the local copy is already gone, and a
    // failed delete only means the draft reappears on the next mount.
    void deletePurchaseDraft().catch(() => {
      addToast({
        type: "warning",
        title: "Borrador",
        message: "No se pudo borrar el borrador de tu cuenta.",
      });
    });
  }, [addToast]);

  const handleSaveDraft = async () => {
    if (draftBusy) return;
    setDraftBusy(true);
    // The station copy is always kept: it is the fallback the screen
    // restores from when the account request fails.
    saveDraft(form);
    try {
      const stored = await savePurchaseDraft(form);
      setPendingDraft(
        stored ?? { ...form, savedAt: new Date().toISOString() },
      );
      setDraftOrigin("server");
      setDraftSyncFailed(false);
      addToast({
        type: "success",
        title: "Borrador",
        message: "Borrador guardado en tu cuenta.",
      });
    } catch {
      setPendingDraft(loadDraft() ?? { ...form, savedAt: new Date().toISOString() });
      setDraftOrigin("local");
      setDraftSyncFailed(true);
      addToast({
        type: "warning",
        title: "Borrador",
        message:
          "No se pudo sincronizar con tu cuenta. El borrador quedó guardado en este equipo.",
      });
    } finally {
      setDraftBusy(false);
    }
  };

  /**
   * S14 #2: optimistic write of `purchases.onlySupplierProducts` — the local
   * copy updates first, the PATCH follows, and a rejection restores the
   * previous value with an honest toast (the configuración pattern).
   */
  const toggleOnlySupplierProducts = async (checked: boolean) => {
    if (!settings) return;
    const patch = { purchases: { onlySupplierProducts: checked } };
    const previous = settings;
    setSettings(applySettingsPatch(settings, patch));
    try {
      const fresh = await updateTenantSettings(patch);
      setSettings(fresh);
    } catch (error) {
      setSettings(previous);
      addToast({
        type: "error",
        title: "Compras",
        message: apiMessage(
          error,
          "No se pudo guardar la configuración. Volvemos al valor anterior.",
        ),
      });
    }
  };

  const updateLine = (
    index: number,
    patch: Partial<PurchaseForm["items"][number]>,
  ) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((line, i) =>
        i === index ? { ...line, ...patch } : line,
      ),
    }));
  };

  /**
   * S14 #4: the catalog fills name + cost from the product record. A second
   * click on the same product bumps its units (cost stays the product's).
   */
  const addCatalogProduct = (product: Product) => {
    setForm((current) => {
      const cost = Number(product.costPriceUSD);
      const unitCostUSD = Number.isFinite(cost) ? String(cost) : "0";
      const existingIndex = current.items.findIndex(
        (line) => line.productId === product.id,
      );
      if (existingIndex >= 0) {
        return {
          ...current,
          items: current.items.map((line, index) =>
            index === existingIndex
              ? {
                  ...line,
                  quantity: String((Number(line.quantity) || 0) + 1),
                  unitCostUSD,
                }
              : line,
          ),
        };
      }
      return {
        ...current,
        items: [
          ...current.items,
          {
            productId: product.id,
            productName: product.name,
            quantity: "1",
            unitCostUSD,
          },
        ],
      };
    });
  };

  /** ONE free-text line for non-catalog invoice items (manual name + cost). */
  const addFreeLine = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, emptyPurchaseLine()],
    }));
  };

  const uploadInvoice = async (file: File) => {
    const reason = invoiceFileError(file);
    if (reason) {
      addToast({ type: "warning", title: "Factura", message: reason });
      return;
    }
    setInvoiceUploading(true);
    try {
      const body = buildInvoiceUploadForm(file);
      const { data } = await apiClient.post<{ key: string }>(
        PurchaseEndpoints.fileUpload,
        body,
        // apiClient defaults to JSON — multipart needs the explicit header.
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setForm((current) => ({ ...current, invoiceKey: data.key }));
      setInvoiceFileName(file.name);
    } catch (error) {
      addToast({
        type: "error",
        title: "Factura",
        message: apiMessage(error, "No se pudo subir la factura."),
      });
    } finally {
      setInvoiceUploading(false);
    }
  };

  const handleInvoiceInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    // Reset so the SAME file can be picked again after a remove/replace.
    event.target.value = "";
    if (file) void uploadInvoice(file);
  };

  const removeInvoice = () => {
    setForm((current) => ({ ...current, invoiceKey: undefined }));
    setInvoiceFileName(null);
    // The uploaded object stays in the bucket (there is no delete route);
    // dropping the KEY before submit is what keeps the purchase without one.
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validatePurchaseForm(form);
    if (validation) {
      setFormError(validation);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const { data } = await apiClient.post<Purchase>(
        PurchaseEndpoints.list,
        buildCreatePayload(form),
      );
      clearDraft();
      void deletePurchaseDraft().catch(() => undefined);
      addToast({
        type: "success",
        title: "Compras",
        message: `Compra ${data.purchaseNumber} registrada.`,
      });
      router.push("/dashboard/compras");
    } catch (error) {
      addToast({
        type: "error",
        title: "Compras",
        message: apiMessage(error, "No se pudo registrar la compra."),
      });
    } finally {
      setSaving(false);
    }
  };

  const search = catalogSearch.trim().toLowerCase();
  const visibleProducts = search
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(search) ||
          (product.sku ?? "").toLowerCase().includes(search),
      )
    : products;

  const summary = purchaseSummary(form.items);
  // Currency visibility: the backend defaults are showVES/showUSDT = true,
  // so a failed settings read shows the default set instead of hiding them.
  const equivalents = purchaseCurrencyEquivalents(summary.totalUSD, rates, {
    showVES: settings?.currencies?.showVES ?? true,
    showUSDT: settings?.currencies?.showUSDT ?? true,
  });
  const hasFreeLine = form.items.some((line) => !line.productId);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={EYEBROW}>
            <span>Compras</span>
            <span className={BRASS_DOT} aria-hidden />
            <span>Nueva factura</span>
          </div>
          <h1 className={PAGE_TITLE}>Nueva compra</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Empezá por el proveedor: el catálogo, los cálculos y las
            equivalencias salen de ahí.
          </p>
        </div>
        <Link href="/dashboard/compras" className={BTN_GHOST}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </header>

      {pendingDraft ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm ${GLASS}`}
        >
          <div className="min-w-0">
            <p className="text-[#111018] dark:text-slate-100">
              Borrador guardado el{" "}
              <span className="font-medium">
                {new Date(pendingDraft.savedAt).toLocaleString("es-VE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>{" "}
              {draftOrigin === "server" ? "en tu cuenta" : "en este equipo"}.
            </p>
            {draftSyncFailed ? (
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                No se pudo sincronizar con tu cuenta; el borrador vive solo en
                este equipo.
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={resumeDraft} className={CTA_NAVY}>
              Continuar
            </button>
            <button type="button" onClick={discardDraft} className={BTN_GHOST}>
              Descartar
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={submitCreate} className="space-y-5">
        {/* ===== 1 · Proveedor (S14 #1: el flujo empieza acá) ===== */}
        <section className={`rounded-2xl ${GLASS} p-5 sm:p-6 space-y-4`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Proveedor
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              paso 1 · define el catálogo
            </span>
          </div>
          <label className={LABEL_SM}>
            Proveedor de la factura
            <select
              value={form.supplierId}
              onChange={(event) =>
                setForm((c) => ({ ...c, supplierId: event.target.value }))
              }
              className={`mt-1 ${INPUT}`}
            >
              <option value="">Sin proveedor registrado</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <Checkbox
              checked={onlySupplierProducts}
              disabled={!settings}
              onChange={(event) =>
                void toggleOnlySupplierProducts(event.target.checked)
              }
              className="mt-0.5"
            />
            <span className="text-sm text-[#111018] dark:text-slate-100">
              Solo productos de este proveedor
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                Por defecto se muestran todos los productos (mostrar todos);
                activá el filtro para ver únicamente los de este proveedor.
                {settings
                  ? ""
                  : " No se pudo cargar la configuración: se muestran todos."}
              </span>
            </span>
          </label>
        </section>

        {/* ===== 2 · Productos y líneas (S14 #3 + #4) ===== */}
        <section className={`rounded-2xl ${GLASS} p-5 sm:p-6 space-y-4`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Productos
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              paso 2 · catálogo
            </span>
          </div>

          {!form.supplierId ? (
            /* Sin proveedor el catálogo queda inerte a propósito (S14 #1). */
            <div className="rounded-xl border border-dashed border-[#1a2a46]/20 dark:border-white/15 px-4 py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Elegí un proveedor para ver sus productos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                  placeholder="Buscar por nombre o SKU…"
                  className={`pl-9 ${INPUT}`}
                />
              </div>

              {catalogLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Cargando catálogo…
                </p>
              ) : visibleProducts.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {search
                    ? `Sin productos para “${catalogSearch.trim()}”.`
                    : "Este proveedor no tiene productos en el catálogo."}
                </p>
              ) : (
                <ul className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {visibleProducts.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => addCatalogProduct(product)}
                        className="w-full flex items-center justify-between gap-3 rounded-xl border border-[#1a2a46]/10 dark:border-white/10 px-3 py-2.5 text-left hover:border-[#b2944a]/60 hover:bg-[#b2944a]/5 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[#111018] dark:text-slate-100">
                            {product.name}
                          </span>
                          <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {product.sku}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                            {money(Number(product.costPriceUSD))}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                            stock {Number(product.stock)}
                          </span>
                          <Plus className="h-3.5 w-3.5 text-[#b2944a]" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-[#1a2a46]/10 dark:border-white/10 pt-3">
            <h3 className="text-sm font-semibold text-[#111018] dark:text-slate-100">
              Líneas de la factura
            </h3>
            {!hasFreeLine ? (
              <button
                type="button"
                onClick={addFreeLine}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#b2944a] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar artículo libre
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Artículo libre: nombre y costo a mano.
              </span>
            )}
          </div>

          {form.items.map((line, index) => {
            const isCatalogLine = Boolean(line.productId);
            return (
              <div key={index}>
                <div className="grid gap-2 sm:grid-cols-[1fr_100px_140px_36px] items-end">
                  <label className={LABEL_SM}>
                    {isCatalogLine ? "Producto (del catálogo)" : "Artículo libre"}
                    {isCatalogLine ? (
                      <span className="mt-1 block rounded-lg border border-[#1a2a46]/10 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 px-3 py-2 text-sm text-[#111018] dark:text-slate-100 truncate">
                        {line.productName}
                      </span>
                    ) : (
                      <input
                        value={line.productName}
                        placeholder="Nombre del artículo (no está en el catálogo)"
                        onChange={(event) =>
                          updateLine(index, { productName: event.target.value })
                        }
                        className={`mt-1 ${INPUT}`}
                      />
                    )}
                  </label>
                  <label className={LABEL_SM}>
                    Cantidad
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(index, { quantity: event.target.value })
                      }
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>
                  <label className={LABEL_SM}>
                    Costo USD
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.unitCostUSD}
                      readOnly={isCatalogLine}
                      onChange={(event) =>
                        updateLine(index, { unitCostUSD: event.target.value })
                      }
                      className={`mt-1 ${INPUT} ${
                        isCatalogLine
                          ? "bg-slate-50/70 dark:bg-white/5 cursor-not-allowed"
                          : ""
                      }`}
                    />
                    {isCatalogLine ? (
                      <span className="mt-1 block text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                        Costo según el producto — editá el producto para
                        cambiarlo.
                      </span>
                    ) : null}
                  </label>
                  <button
                    type="button"
                    aria-label="Quitar línea"
                    disabled={form.items.length === 1}
                    onClick={() =>
                      setForm((c) => ({
                        ...c,
                        items: c.items.filter((_, i) => i !== index),
                      }))
                    }
                    className="rounded-lg border border-[#1a2a46]/15 dark:border-white/15 p-2 text-slate-400 hover:text-red-500 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* ===== 3 · Fechas, notas y factura (S14 #5) ===== */}
        <section className={`rounded-2xl ${GLASS} p-5 sm:p-6 space-y-4`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Fechas, notas y factura
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              paso 3 · opcional
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL_SM}>
              Fecha de emisión
              <input
                type="date"
                value={form.issueDate}
                onChange={(event) =>
                  setForm((c) => ({ ...c, issueDate: event.target.value }))
                }
                className={`mt-1 ${INPUT}`}
              />
            </label>
            <label className={LABEL_SM}>
              Pagar antes de (crédito, opcional)
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((c) => ({ ...c, dueDate: event.target.value }))
                }
                className={`mt-1 ${INPUT}`}
              />
            </label>
          </div>
          <label className={LABEL_SM}>
            Notas
            <textarea
              rows={2}
              value={form.notes}
              onChange={(event) =>
                setForm((c) => ({ ...c, notes: event.target.value }))
              }
              placeholder="Nro. de factura, referencia del depósito…"
              className={`mt-1 ${INPUT}`}
            />
          </label>

          <div className="space-y-2">
            <p className={LABEL_SM}>
              Factura del proveedor (opcional) — imagen o PDF, hasta 5MB
            </p>
            {!form.invoiceKey ? (
              <button
                type="button"
                onClick={() => invoiceInputRef.current?.click()}
                disabled={invoiceUploading}
                className={BTN_GHOST}
              >
                {invoiceUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Subiendo…
                  </>
                ) : (
                  <>
                    <Paperclip className="h-4 w-4" /> Adjuntar factura
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1a2a46]/12 dark:border-white/12 bg-white/60 dark:bg-white/5 px-3 py-2">
                <span className="inline-flex min-w-0 items-center gap-2 text-sm text-[#111018] dark:text-slate-100">
                  <Paperclip className="h-4 w-4 shrink-0 text-[#b2944a]" />
                  <span className="truncate">
                    {invoiceUploading
                      ? "Reemplazando…"
                      : invoiceDisplayName(form.invoiceKey, invoiceFileName)}
                  </span>
                </span>
                <span className="flex shrink-0 gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => invoiceInputRef.current?.click()}
                    disabled={invoiceUploading}
                    className="text-[#b2944a] hover:underline disabled:opacity-50"
                  >
                    Reemplazar
                  </button>
                  <button
                    type="button"
                    onClick={removeInvoice}
                    disabled={invoiceUploading}
                    className="text-red-500 hover:underline disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </span>
              </div>
            )}
            <input
              ref={invoiceInputRef}
              type="file"
              accept={INVOICE_ACCEPT}
              className="hidden"
              onChange={handleInvoiceInputChange}
            />
          </div>
        </section>

        {/* ===== 4 · Resumen detallado (S14 #6 + #7) ===== */}
        <section className={`rounded-2xl ${CARD} p-5 sm:p-6 space-y-3`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Resumen
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              cálculo detallado
            </span>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Artículos
              </span>
              <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                {summary.articleCount} línea
                {summary.articleCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Unidades totales
              </span>
              <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                {summary.units}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Subtotal
              </span>
              <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                {money(summary.subtotalUSD)}
              </span>
            </div>
          </div>

          <div
            className={`flex items-baseline justify-between gap-3 border-t border-[#1a2a46]/12 dark:border-white/12 pt-3`}
          >
            <span className="font-semibold text-[#111018] dark:text-slate-100">
              Total
            </span>
            <span className="font-mono text-xl tabular-nums font-semibold text-[#111018] dark:text-slate-100">
              {money(summary.totalUSD)}
            </span>
          </div>

          {equivalents.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {equivalents.map((equivalent) => (
                <span
                  key={equivalent.currency}
                  className="font-mono tabular-nums"
                >
                  {formatEquivalent(equivalent.currency, equivalent.amount)}
                </span>
              ))}
            </div>
          ) : null}
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {rates
              ? "Equivalencias con la tasa de hoy (BCV / USDT)."
              : "Todavía no hay una tasa cargada para las equivalencias."}
          </p>
        </section>

        {formError ? (
          <p className="text-sm text-red-600">{formError}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => void handleSaveDraft()}
            disabled={saving || draftBusy}
            className={BTN_GHOST}
          >
            <Save className="h-4 w-4" /> Guardar borrador
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`px-5 py-2.5 text-sm ${CTA_BRASS}`}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
              </>
            ) : (
              "Registrar compra"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
