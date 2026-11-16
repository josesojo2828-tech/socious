"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Plus, Search, User } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { Button } from "@/shared/components/atoms/Button";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { INPUT, LABEL_SM } from "@/shared/lib/maison-style";
import { ClientEndpoints } from "@/features/clients/services/clients.endpoints";
import type { Client } from "@/features/clients/types/client.type";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type { Product } from "@/features/products/types/product.type";
import {
  MANUAL_CADENCE_OPTIONS,
  buildManualPayload,
  canSubmitManual,
  emptyManualForm,
  manualLineTotal,
  validateManualForm,
  type ManualReceivableForm,
  type ManualReceivableResult,
} from "../lib/manual-receivable";

/**
 * Manual opening balance (S2/S4): one historical receivable captured by hand,
 * next to the CSV import in step 2. A client and a product are selected from
 * the catalog or created on the fly, exactly like a CSV row; every rule lives
 * in the pure `manual-receivable` library and the server re-checks it.
 */

const MANUAL_ENDPOINT = "/api/initial-load/manual";
const MAX_RESULTS = 8;
const SEARCH_DEBOUNCE_MS = 300;

interface Paged<T> {
  list: T[];
  total: number;
}

async function searchClients(term: string): Promise<Client[]> {
  const { data } = await apiClient.get<Paged<Client>>(ClientEndpoints.list, {
    params: { q: term, page: 1, limit: MAX_RESULTS },
  });
  return data.list ?? [];
}

async function searchProducts(term: string): Promise<Product[]> {
  const { data } = await apiClient.get<Paged<Product>>(ProductEndpoints.list, {
    params: { q: term, page: 1, limit: MAX_RESULTS },
  });
  return data.list ?? [];
}

/** Debounced `q` search: at most eight options, cleared while a value is chosen. */
function useLookup<T>(
  query: string,
  enabled: boolean,
  fetchRows: (term: string) => Promise<T[]>,
): { results: T[]; searching: boolean; failed: boolean } {
  const [results, setResults] = useState<T[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!enabled || term === "") {
      setResults([]);
      setSearching(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setFailed(false);

    const timer = setTimeout(() => {
      void fetchRows(term)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, fetchRows, query]);

  return { results, searching, failed };
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as {
    response?: { data?: { message?: string | string[] } };
  };
  const message = maybe?.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ") || fallback;
  return message || fallback;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
      {message}
    </span>
  );
}

function formatUsd(value: string | number): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}

export interface ManualReceivableFormProps {
  /** Called after a successful save so the account banner reloads. */
  onCreated?: () => void;
}

export function ManualReceivableForm({ onCreated }: ManualReceivableFormProps) {
  const { addToast } = useToastStore();

  const [form, setForm] = useState<ManualReceivableForm>(emptyManualForm);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [clientQuery, setClientQuery] = useState<string>("");
  const [productQuery, setProductQuery] = useState<string>("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ManualReceivableResult | null>(null);

  const errors = validateManualForm(form);
  const total = manualLineTotal(form);
  const ready = canSubmitManual(form);

  const clients = useLookup(
    clientQuery,
    selectedClient === null && !form.createClient,
    searchClients,
  );
  const products = useLookup(
    productQuery,
    selectedProduct === null && !form.createProduct,
    searchProducts,
  );

  const update = (patch: Partial<ManualReceivableForm>) =>
    setForm((current) => ({ ...current, ...patch }));

  const touch = (field: string) =>
    setTouched((current) =>
      current[field] ? current : { ...current, [field]: true },
    );

  const errorFor = (field: string): string | undefined =>
    touched[field] ? errors[field] : undefined;

  const chooseClient = (client: Client) => {
    setSelectedClient(client);
    setClientQuery(client.name);
    update({
      clientId: client.id,
      clientName: client.name,
      clientPhone: "",
      clientEmail: "",
      createClient: false,
    });
  };

  const clearClient = () => {
    setSelectedClient(null);
    setClientQuery("");
    update({ clientId: "", clientName: "", clientPhone: "", clientEmail: "" });
  };

  const chooseProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductQuery(product.name);
    const price = Number(product.salePriceUSD);
    update({
      productId: product.id,
      productName: product.name,
      productSku: "",
      createProduct: false,
      ...(Number.isFinite(price) ? { unitPriceUSD: price.toFixed(2) } : {}),
    });
  };

  const clearProduct = () => {
    setSelectedProduct(null);
    setProductQuery("");
    update({ productId: "", productName: "", productSku: "" });
  };

  const submit = async () => {
    if (submitting || !canSubmitManual(form)) return;
    setSubmitting(true);
    setError(null);
    setCreated(null);
    try {
      const { data } = await apiClient.post<ManualReceivableResult>(
        MANUAL_ENDPOINT,
        buildManualPayload(form),
      );
      setCreated(data);
      addToast({
        type: "success",
        title: "Carga inicial",
        message: `Cuenta ${data.saleNumber} registrada.`,
      });
      setForm(emptyManualForm());
      setSelectedClient(null);
      setSelectedProduct(null);
      setClientQuery("");
      setProductQuery("");
      setTouched({});
      onCreated?.();
    } catch (submitError) {
      const message = apiMessage(
        submitError,
        "No se pudo registrar la cuenta por cobrar.",
      );
      setError(message);
      addToast({ type: "error", title: "Carga inicial", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        <Plus className="h-4 w-4 text-[#b2944a]" />
        Alta manual de una cuenta por cobrar
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Registra una deuda histórica sin planilla. No descuenta stock: el
        catálogo se crea sin existencias, igual que en la importación.
      </p>

      {created ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <p className="font-semibold">Cuenta por cobrar registrada</p>
          <p className="mt-0.5">
            Documento {created.saleNumber}. Cliente{" "}
            {created.client.created ? "creado" : "existente"}; producto{" "}
            {created.product.created ? "creado" : "existente"} (
            {created.product.sku}).
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="space-y-3 rounded-xl border border-[#1a2a46]/12 p-4 dark:border-white/10">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          <User className="h-4 w-4 text-[#b2944a]" /> Cliente
        </p>

        {selectedClient ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b2944a]/50 px-3 py-1 text-sm text-[#111018] dark:text-slate-100">
              {selectedClient.name}
              <button
                type="button"
                onClick={clearClient}
                className="text-xs font-semibold text-[#8a7339] underline-offset-2 hover:underline dark:text-[#d4b877]"
              >
                Cambiar
              </button>
            </span>
          </div>
        ) : form.createClient ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={LABEL_SM}>
                Nombre *
                <input
                  className={`mt-1 ${INPUT}`}
                  value={form.clientName}
                  aria-invalid={Boolean(errorFor("client"))}
                  onChange={(event) => update({ clientName: event.target.value })}
                  onBlur={() => touch("client")}
                />
                <FieldError message={errorFor("client")} />
              </label>
              <label className={LABEL_SM}>
                Teléfono
                <input
                  className={`mt-1 ${INPUT}`}
                  value={form.clientPhone}
                  onChange={(event) => update({ clientPhone: event.target.value })}
                />
              </label>
              <label className={LABEL_SM}>
                Correo
                <input
                  type="email"
                  className={`mt-1 ${INPUT}`}
                  value={form.clientEmail}
                  aria-invalid={Boolean(errorFor("clientEmail"))}
                  onChange={(event) => update({ clientEmail: event.target.value })}
                  onBlur={() => touch("clientEmail")}
                />
                <FieldError message={errorFor("clientEmail")} />
              </label>
            </div>
            <button
              type="button"
              onClick={() =>
                update({ createClient: false, clientName: "", clientPhone: "", clientEmail: "" })
              }
              className="text-xs font-semibold text-[#8a7339] underline-offset-2 hover:underline dark:text-[#d4b877]"
            >
              Buscar un cliente existente
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className={LABEL_SM}>
              Buscar cliente
              <span className="relative mt-1 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`pl-9 pr-3 py-2 ${INPUT}`}
                  value={clientQuery}
                  placeholder="Nombre, documento, teléfono o correo"
                  aria-invalid={Boolean(errorFor("client"))}
                  onChange={(event) => setClientQuery(event.target.value)}
                  onBlur={() => touch("client")}
                />
              </span>
            </label>

            {clients.searching ? (
              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
              </p>
            ) : null}

            {clients.failed ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                No se pudo buscar clientes.
              </p>
            ) : null}

            {clients.results.length > 0 ? (
              <ul className="max-h-56 divide-y divide-[#1a2a46]/8 overflow-auto rounded-xl border border-[#1a2a46]/12 dark:divide-white/5 dark:border-white/10">
                {clients.results.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => chooseClient(client)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors hover:bg-[#1a2a46]/[0.04] dark:hover:bg-white/5"
                    >
                      <span className="font-medium text-[#111018] dark:text-slate-100">
                        {client.name}
                      </span>
                      {client.phone || client.email ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {[client.phone, client.email]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {!clients.searching &&
            !clients.failed &&
            clientQuery.trim() !== "" &&
            clients.results.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sin resultados.
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => {
                update({
                  createClient: true,
                  clientId: "",
                  clientName: "",
                  clientPhone: "",
                  clientEmail: "",
                });
                setSelectedClient(null);
                setClientQuery("");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a7339] underline-offset-2 hover:underline dark:text-[#d4b877]"
            >
              <Plus className="h-3.5 w-3.5" /> Crear cliente nuevo
            </button>

            <FieldError message={errorFor("client")} />
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-[#1a2a46]/12 p-4 dark:border-white/10">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          <Package className="h-4 w-4 text-[#b2944a]" /> Producto
        </p>

        {selectedProduct ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b2944a]/50 px-3 py-1 text-sm text-[#111018] dark:text-slate-100">
              {selectedProduct.name}
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {selectedProduct.sku}
              </span>
              <button
                type="button"
                onClick={clearProduct}
                className="text-xs font-semibold text-[#8a7339] underline-offset-2 hover:underline dark:text-[#d4b877]"
              >
                Cambiar
              </button>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Precio de lista: ${formatUsd(selectedProduct.salePriceUSD)}
            </span>
          </div>
        ) : form.createProduct ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={LABEL_SM}>
                Nombre *
                <input
                  className={`mt-1 ${INPUT}`}
                  value={form.productName}
                  aria-invalid={Boolean(errorFor("product"))}
                  onChange={(event) => update({ productName: event.target.value })}
                  onBlur={() => touch("product")}
                />
                <FieldError message={errorFor("product")} />
              </label>
              <label className={LABEL_SM}>
                SKU
                <input
                  className={`mt-1 font-mono ${INPUT}`}
                  value={form.productSku}
                  onChange={(event) => update({ productSku: event.target.value })}
                />
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  Opcional: si lo dejas vacío, se genera un SKU automático.
                </span>
              </label>
            </div>
            <button
              type="button"
              onClick={() =>
                update({ createProduct: false, productName: "", productSku: "" })
              }
              className="text-xs font-semibold text-[#8a7339] underline-offset-2 hover:underline dark:text-[#d4b877]"
            >
              Buscar un producto existente
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className={LABEL_SM}>
              Buscar producto
              <span className="relative mt-1 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`pl-9 pr-3 py-2 ${INPUT}`}
                  value={productQuery}
                  placeholder="Nombre o SKU"
                  aria-invalid={Boolean(errorFor("product"))}
                  onChange={(event) => setProductQuery(event.target.value)}
                  onBlur={() => touch("product")}
                />
              </span>
            </label>

            {products.searching ? (
              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
              </p>
            ) : null}

            {products.failed ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                No se pudo buscar productos.
              </p>
            ) : null}

            {products.results.length > 0 ? (
              <ul className="max-h-56 divide-y divide-[#1a2a46]/8 overflow-auto rounded-xl border border-[#1a2a46]/12 dark:divide-white/5 dark:border-white/10">
                {products.results.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => chooseProduct(product)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#1a2a46]/[0.04] dark:hover:bg-white/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-[#111018] dark:text-slate-100">
                          {product.name}
                        </span>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {product.sku}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        ${formatUsd(product.salePriceUSD)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {!products.searching &&
            !products.failed &&
            productQuery.trim() !== "" &&
            products.results.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sin resultados.
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => {
                update({
                  createProduct: true,
                  productId: "",
                  productName: "",
                  productSku: "",
                });
                setSelectedProduct(null);
                setProductQuery("");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a7339] underline-offset-2 hover:underline dark:text-[#d4b877]"
            >
              <Plus className="h-3.5 w-3.5" /> Crear producto nuevo
            </button>

            <FieldError message={errorFor("product")} />
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-[#1a2a46]/12 p-4 dark:border-white/10">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={LABEL_SM}>
            Cantidad *
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              className={`mt-1 font-mono tabular-nums ${INPUT}`}
              value={form.quantity}
              aria-invalid={Boolean(errorFor("quantity"))}
              onChange={(event) => update({ quantity: event.target.value })}
              onBlur={() => touch("quantity")}
            />
            <FieldError message={errorFor("quantity")} />
          </label>
          <label className={LABEL_SM}>
            Precio unitario (USD) *
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className={`mt-1 font-mono tabular-nums ${INPUT}`}
              value={form.unitPriceUSD}
              aria-invalid={Boolean(errorFor("unitPriceUSD"))}
              onChange={(event) => update({ unitPriceUSD: event.target.value })}
              onBlur={() => touch("unitPriceUSD")}
            />
            <FieldError message={errorFor("unitPriceUSD")} />
          </label>
          <div className={LABEL_SM}>
            Total
            <p className="mt-1 rounded-xl border border-[#1a2a46]/15 bg-[#f7f5f0] px-3 py-2 font-mono text-sm tabular-nums text-[#111018] dark:border-white/15 dark:bg-slate-950/40 dark:text-slate-100">
              ${total.toFixed(2)}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          El total se calcula con la cantidad y el precio; el precio histórico
          puede diferir del precio de lista actual.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[#1a2a46]/12 p-4 dark:border-white/10">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={LABEL_SM}>
            Fecha de la venta
            <input
              type="date"
              className={`mt-1 ${INPUT}`}
              value={form.issueDate}
              aria-invalid={Boolean(errorFor("issueDate"))}
              onChange={(event) => update({ issueDate: event.target.value })}
              onBlur={() => touch("issueDate")}
            />
            <FieldError message={errorFor("issueDate")} />
          </label>
          <label className={LABEL_SM}>
            Vencimiento
            <input
              type="date"
              className={`mt-1 ${INPUT}`}
              value={form.dueDate}
              aria-invalid={Boolean(errorFor("dueDate"))}
              onChange={(event) => update({ dueDate: event.target.value })}
              onBlur={() => touch("dueDate")}
            />
            <FieldError message={errorFor("dueDate")} />
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              Si lo dejas vacío, la cuenta queda abierta y nunca se reporta como
              vencida.
            </span>
          </label>
          <label className={LABEL_SM}>
            Cadencia
            <select
              className={`mt-1 ${INPUT}`}
              value={form.cadence}
              onChange={(event) =>
                update({
                  cadence: event.target.value as ManualReceivableForm["cadence"],
                })
              }
            >
              {MANUAL_CADENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              Si indicas un vencimiento, la cadencia no se aplica.
            </span>
          </label>
        </div>

        {form.cadence === "CADA_N_DIAS" && form.dueDate.trim() === "" ? (
          <label className={`${LABEL_SM} sm:max-w-[12rem]`}>
            Días entre cuotas
            <input
              type="number"
              min="1"
              max="365"
              step="1"
              inputMode="numeric"
              className={`mt-1 font-mono tabular-nums ${INPUT}`}
              value={form.everyNDays}
              aria-invalid={Boolean(errorFor("everyNDays"))}
              onChange={(event) => update({ everyNDays: event.target.value })}
              onBlur={() => touch("everyNDays")}
            />
            <FieldError message={errorFor("everyNDays")} />
          </label>
        ) : null}
      </section>

      <section className="grid gap-3 rounded-xl border border-[#1a2a46]/12 p-4 dark:border-white/10 sm:grid-cols-2">
        <label className={LABEL_SM}>
          Pago inicial (USD)
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
            value={form.paidAmount}
            aria-invalid={Boolean(errorFor("paidAmount"))}
            onChange={(event) => update({ paidAmount: event.target.value })}
            onBlur={() => touch("paidAmount")}
          />
          <FieldError message={errorFor("paidAmount")} />
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            Opcional. No puede superar el total de la cuenta.
          </span>
        </label>
        <label className={LABEL_SM}>
          Notas
          <textarea
            rows={3}
            className={`mt-1 ${INPUT}`}
            value={form.notes}
            onChange={(event) => update({ notes: event.target.value })}
          />
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
        <p className="mr-auto text-xs text-slate-500 dark:text-slate-400">
          La cuenta se registra como venta histórica impaga, sin movimiento de
          stock.
        </p>
        <Button
          type="submit"
          variant="primary"
          disabled={!ready}
          loading={submitting}
          loadingText="Registrando…"
        >
          <Plus className="h-4 w-4" /> Registrar cuenta
        </Button>
      </div>

      {!ready && Object.keys(touched).length > 0 ? (
        <p className="text-right text-xs text-slate-500 dark:text-slate-400">
          Corrige los campos marcados para registrar la cuenta.
        </p>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {created ? `Cuenta ${created.saleNumber} registrada.` : ""}
      </span>
    </form>
  );
}
