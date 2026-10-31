"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
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
import type { Purchase } from "@/features/purchases/types/purchase.type";
import type { Supplier } from "@/features/suppliers/types/supplier.type";
import {
  buildCreatePayload,
  emptyPurchaseLine,
  grandTotalUSD,
  validatePurchaseForm,
  type PurchaseForm,
} from "@/features/purchases/lib/purchase-form";
import {
  clearDraft,
  loadDraft,
  saveDraft,
} from "@/features/purchases/lib/purchase-draft";

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
 * Dedicated purchase-create screen (S4). The inline create form was removed
 * from the list; this route hosts it with live totals, catalog pick and a
 * station-local draft (save / resume / discard via purchase-draft lib).
 */
export default function NewPurchasePage() {
  const router = useRouter();
  const { addToast } = useToastStore();

  const [form, setForm] = useState<PurchaseForm>(emptyForm);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [supplierRes, productRes] = await Promise.all([
        apiClient
          .get<Paged<Supplier>>(SupplierEndpoints.list, {
            params: { limit: 100 },
          })
          .catch(() => ({ data: { list: [] as Supplier[], total: 0 } })),
        apiClient
          .get<Paged<{ id: string; name: string }>>(ProductEndpoints.list, {
            params: { limit: 100 },
          })
          .catch(() => ({
            data: { list: [] as { id: string; name: string }[], total: 0 },
          })),
      ]);
      setSuppliers(supplierRes.data.list ?? []);
      setProducts(productRes.data.list ?? []);
    })();
  }, []);

  // Resume banner: a draft saved on this station offers Continuar / Descartar.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) setDraftSavedAt(draft.savedAt);
  }, []);

  const resumeDraft = useCallback(() => {
    const draft = loadDraft();
    if (!draft) return;
    setForm({
      supplierId: draft.supplierId,
      issueDate: draft.issueDate,
      dueDate: draft.dueDate,
      notes: draft.notes,
      items:
        draft.items.length > 0 ? draft.items : [emptyPurchaseLine()],
    });
    setDraftSavedAt(null);
    setFormError(null);
  }, []);

  const discardDraft = useCallback(() => {
    clearDraft();
    setDraftSavedAt(null);
  }, []);

  const handleSaveDraft = () => {
    saveDraft(form);
    setDraftSavedAt(new Date().toISOString());
    addToast({
      type: "success",
      title: "Borrador",
      message: "Borrador guardado en este equipo.",
    });
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
            El total se calcula solo. La compra entra como PENDIENTE hasta que
            recibas la mercancía.
          </p>
        </div>
        <Link href="/dashboard/compras" className={BTN_GHOST}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </header>

      {draftSavedAt ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm ${GLASS}`}
        >
          <p className="text-[#111018] dark:text-slate-100">
            Borrador guardado el{" "}
            <span className="font-medium">
              {new Date(draftSavedAt).toLocaleString("es-VE", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            .
          </p>
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
        <section className={`rounded-2xl ${GLASS} p-5 sm:p-6 space-y-4`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Factura
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              proveedor y fechas
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={LABEL_SM}>
              Proveedor
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
        </section>

        <section className={`rounded-2xl ${GLASS} p-5 sm:p-6 space-y-3`}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
              Artículos
            </h2>
            <button
              type="button"
              onClick={() =>
                setForm((c) => ({
                  ...c,
                  items: [...c.items, emptyPurchaseLine()],
                }))
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#b2944a] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar línea
            </button>
          </div>
          {form.items.map((line, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[1fr_100px_120px_36px] items-end"
            >
              <label className={LABEL_SM}>
                Producto
                <input
                  list="purchase-products"
                  value={line.productName}
                  placeholder="Nombre del producto"
                  onChange={(event) => {
                    const name = event.target.value;
                    const match = products.find((p) => p.name === name);
                    updateLine(index, {
                      productName: name,
                      productId: match?.id,
                    });
                  }}
                  className={`mt-1 ${INPUT}`}
                />
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
                  onChange={(event) =>
                    updateLine(index, { unitCostUSD: event.target.value })
                  }
                  className={`mt-1 ${INPUT}`}
                />
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
          ))}
          <datalist id="purchase-products">
            {products.map((product) => (
              <option key={product.id} value={product.name} />
            ))}
          </datalist>
        </section>

        <div
          className={`flex items-baseline justify-between gap-3 rounded-2xl px-5 py-4 ${CARD}`}
        >
          <span className="font-semibold text-sm text-[#111018] dark:text-slate-100">
            Total
          </span>
          <span className="font-mono text-xl tabular-nums font-semibold text-[#111018] dark:text-slate-100">
            {money(grandTotalUSD(form.items))}
          </span>
        </div>

        {formError ? (
          <p className="text-sm text-red-600">{formError}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
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
