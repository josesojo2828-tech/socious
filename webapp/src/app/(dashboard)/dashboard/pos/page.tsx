"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { SectionCard, SectionRow } from "@/shared/components/molecules/SectionCard";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type { Product } from "@/features/products/types/product.type";
import { SaleEndpoints } from "@/features/sales/services/sales.endpoints";
import { ClientEndpoints } from "@/features/clients/services/clients.endpoints";
import type { Client } from "@/features/clients/types/client.type";
import { TenantPaymentMethodEndpoints } from "@/features/tenant-payment-methods/services/tenant-payment-methods.endpoints";
import { CREDIT_CADENCE_LABELS, type TenantSettings } from "@/features/settings/types/tenant-settings.type";
import { ExchangeEndpoints } from "@/features/exchange/services/exchange.endpoints";
import { CashEndpoints } from "@/features/cash/services/cash.endpoints";
import type { CashShift } from "@/features/cash/types/cash.type";
import { getTenantSettings } from "@/features/settings/services/settings.service";
import {
  addToCart,
  buildPosPayload,
  cartTotals,
  changeQuantity,
  lineTotal,
  removeFromCart,
  suggestedAmount,
  type CartLine,
} from "@/features/sales/lib/pos-form";

interface PaymentOption {
  code: string;
  label: string;
  currency: "USD" | "VES" | "USDT";
}

interface CurrencyOption {
  code: string;
  label: string;
  storage: boolean;
}

interface RateSnapshot {
  rateBcv: number;
  rateUsdt: number;
}

type Paged<T> = { list: T[]; total: number };

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Point of sale (S6): pick products, take the payment and post the sale.
 * The turn is attached only when one is open — with `cash.shiftControl` off
 * the backend refuses an explicit shift, and there will not be one to send.
 */
export default function PosPage() {
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [methods, setMethods] = useState<PaymentOption[]>([]);
  const [rates, setRates] = useState<RateSnapshot | null>(null);
  const [shift, setShift] = useState<CashShift | null>(null);
  const [shiftControl, setShiftControl] = useState<boolean>(true);

  const [query, setQuery] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [methodCode, setMethodCode] = useState<string>("");
  const [currency, setCurrency] = useState<"USD" | "VES" | "USDT">("USD");
  const [mode, setMode] = useState<"now" | "credit">("now");
  const [creditCadence, setCreditCadence] =
    useState<TenantSettings["credit"]["cadence"]>("QUINCENAL");
  const [creditInitial, setCreditInitial] = useState<string>("");
  const [creditDays, setCreditDays] = useState<number>(15);
  const [creditMonthlyDay, setCreditMonthlyDay] = useState<number>(1);
  const [pickProduct, setPickProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [pickPresentations, setPickPresentations] = useState<
    { id: string; name: string; stock?: string | number }[]
  >([]);
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const totals = useMemo(() => cartTotals(cart), [cart]);

  const loadProducts = useCallback(async () => {
    const { data } = await apiClient.get<Paged<Product>>(ProductEndpoints.list, {
      params: { limit: 100 },
    });
    setProducts(data.list);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [
          productPage,
          clientPage,
          optionList,
          rateView,
          currentShift,
          settings,
        ] = await Promise.all([
          apiClient.get<Paged<Product>>(ProductEndpoints.list, {
            params: { limit: 100 },
          }),
          apiClient.get<Paged<Client>>(ClientEndpoints.list, {
            params: { limit: 100 },
          }),
          apiClient.get<PaymentOption[]>(TenantPaymentMethodEndpoints.posOptions),
          apiClient
            .get<RateSnapshot>(ExchangeEndpoints.latest)
            .catch(() => ({ data: null as RateSnapshot | null })),
          apiClient
            .get<CashShift | null>(CashEndpoints.currentShift)
            .then((response) => response.data),
          getTenantSettings(),
        ]);

        if (cancelled) return;
        setProducts(productPage.data.list);
        setClients(clientPage.data.list);
        setMethods(optionList.data);
        setRates(rateView.data);
        setShift(currentShift);
        setShiftControl(settings.cash.shiftControl);
        setSettings(settings);
        setCreditCadence(settings.credit?.cadence ?? "QUINCENAL");
        setCreditDays(settings.credit?.everyNDays ?? 15);
        setCreditMonthlyDay(settings.credit?.monthlyDay ?? 1);

        const firstMethod = optionList.data[0];
        if (firstMethod) {
          setMethodCode(firstMethod.code);
          setCurrency(firstMethod.currency);
        }
      } catch {
        if (!cancelled) {
          addToast({
            type: "error",
            title: "Punto de venta",
            message: "No se pudieron cargar los datos del POS.",
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

  // The suggested amount follows the selected currency and today's rates; the
  // cashier can still type the real figure received.
  useEffect(() => {
    setAmount(String(suggestedAmount(currency, totals.totalUSD, rates)));
  }, [currency, totals.totalUSD, rates]);

  // Credit initial follows the configured percent until the cashier types.
  useEffect(() => {
    if (mode !== "credit" || !settings) return;
    const pct = settings.credit?.initialPercent ?? 0;
    const initial = Math.round(totals.totalUSD * pct) / 100;
    setCreditInitial(pct > 0 ? initial.toFixed(2) : "");
  }, [mode, settings, totals.totalUSD]);

  const duePreview = useMemo(() => {
    if (mode !== "credit" || creditCadence === "FREE") return null;
    const from = new Date();
    if (creditCadence === "MONTHLY") {
      const due = new Date(from.getFullYear(), from.getMonth(), creditMonthlyDay);
      if (due.getTime() <= from.getTime()) due.setMonth(due.getMonth() + 1);
      return due;
    }
    const days = Math.min(Math.max(creditDays, 1), 365);
    const due = new Date(from);
    due.setDate(due.getDate() + days);
    return due;
  }, [mode, creditCadence, creditDays, creditMonthlyDay]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.sku, product.barcode ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [products, query]);

  const handleMethodChange = (code: string) => {
    setMethodCode(code);
    const method = methods.find((option) => option.code === code);
    if (method) setCurrency(method.currency);
  };

  const handleSelectProduct = (product: Product) => {
    if (!product.isService && Number(product.stock) <= 0) {
      addToast({
        type: "warning",
        title: "Sin stock",
        message: `"${product.name}" no tiene existencias.`,
      });
      return;
    }
    void (async () => {
      try {
        const { data } = await apiClient.get<
          { id: string; name: string; stock: string | number; active: boolean }[]
        >(ProductEndpoints.presentations(product.id));
        const active = (Array.isArray(data) ? data : []).filter(
          (row) => row.active,
        );
        if (active.length > 0) {
          setPickPresentations(active);
          setPickProduct(product);
          return;
        }
      } catch {
        // No presentations endpoint answer: sell bulk.
      }
      setCart((current) => addToCart(current, product));
    })();
  };

  const pickPresentation = (presentation: { id: string; name: string }) => {
    if (pickProduct) {
      setCart((current) =>
        addToCart(current, pickProduct, 1, presentation),
      );
    }
    setPickProduct(null);
    setPickPresentations([]);
  };

  const handleSubmit = async (): Promise<void> => {
    if (cart.length === 0) {
      addToast({
        type: "warning",
        title: "Punto de venta",
        message: "Agregá al menos un artículo.",
      });
      return;
    }

    const paymentAmount = Number(amount);
    const method = methods.find((option) => option.code === methodCode);

    let payloadInput: Parameters<typeof buildPosPayload>[0] = {
      cart,
      ...(clientId ? { clientId } : {}),
      ...(shift?.id ? { cashShiftId: shift.id } : {}),
      notes,
    };

    if (mode === "credit") {
      if (!Number.isFinite(paymentAmount) || paymentAmount < 0) {
        addToast({
          type: "warning",
          title: "Crédito",
          message: "El pago inicial no puede ser negativo.",
        });
        return;
      }
      payloadInput = {
        ...payloadInput,
        credit: {
          cadence: creditCadence,
          everyNDays: creditDays,
          monthlyDay: creditMonthlyDay,
        },
        // A zero initial sells the whole amount on credit (no payment row).
        ...(paymentAmount > 0 && method
          ? {
              payment: {
                amountOriginal: paymentAmount,
                currency,
                paymentMethod: method.code,
              },
            }
          : {}),
      };
    } else {
      if (!method || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        addToast({
          type: "warning",
          title: "Punto de venta",
          message: "Revisá el monto y el medio de cobro.",
        });
        return;
      }
      payloadInput = {
        ...payloadInput,
        payment: {
          amountOriginal: paymentAmount,
          currency,
          paymentMethod: method.code,
        },
      };
    }

    const payload = buildPosPayload(payloadInput);

    setBusy(true);
    try {
      const { data } = await apiClient.post<{ saleNumber: string }>(
        SaleEndpoints.create,
        payload,
      );
      addToast({
        type: "success",
        title: "Venta registrada",
        message:
          mode === "credit"
            ? `${data.saleNumber} a crédito (${CREDIT_CADENCE_LABELS[creditCadence]}).`
            : `${data.saleNumber} por ${currency} ${paymentAmount.toFixed(2)}.`,
      });
      setCart([]);
      setNotes("");
      await loadProducts(); // stock moved: show it fresh
    } catch (error) {
      addToast({
        type: "error",
        title: "Punto de venta",
        message: apiMessage(error, "No se pudo registrar la venta."),
      });
    } finally {
      setBusy(false);
    }
  };

  if (pickProduct) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {pickProduct.name}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Elegí la presentación a vender.
          </p>
          <ul className="mt-3 space-y-1">
            {pickPresentations.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => pickPresentation(row)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:border-slate-700"
                >
                  {row.name}{" "}
                  <span className="text-xs text-slate-400">
                    · stock {Number(row.stock)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setCart((current) => addToCart(current, pickProduct));
              setPickProduct(null);
              setPickPresentations([]);
            }}
            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 dark:border-slate-600"
          >
            Vender a granel (stock del producto)
          </button>
          <button
            type="button"
            onClick={() => {
              setPickProduct(null);
              setPickPresentations([]);
            }}
            className="mt-2 w-full text-center text-xs text-slate-400 hover:text-slate-600"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const needsWarning = shiftControl && !shift;

  return (
    <div className="px-4 py-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Punto de venta
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Elegí los artículos y cobrá: las tasas del día quedan congeladas en
            la venta.
          </p>
        </div>
        {needsWarning ? (
          <span className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-4 w-4" /> Sin turno abierto: la venta se
            registra fuera de turno.
          </span>
        ) : null}
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, SKU o código de barras"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product) => {
              const out =
                !product.isService && Number(product.stock) <= 0;
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={out}
                  onClick={() => handleSelectProduct(product)}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                >
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {product.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{product.sku}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      ${Number(product.salePriceUSD).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {product.isService
                        ? "servicio"
                        : `${Number(product.stock)} ${product.unit}`}
                    </span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500 col-span-full">
                Sin productos para esa búsqueda.
              </p>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <SectionCard
            icon={<ShoppingCart className="h-5 w-5" />}
            title="Carrito"
            description={`${cart.length} artículo(s) distintos`}
          >
            {cart.length === 0 ? (
              <p className="text-sm text-slate-500">
                Tocá un producto para agregarlo.
              </p>
            ) : (
              <div className="space-y-2">
                {cart.map((line) => (
                  <div
                    key={`${line.productId}:${line.presentationId ?? ""}`}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {line.productName}
                      </p>
                      <p className="text-xs text-slate-400">
                        ${line.unitPriceUSD.toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Restar"
                      className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                      onClick={() =>
                        setCart((current) =>
                          changeQuantity(
                            current,
                            line.productId,
                            line.quantity - 1,
                            line.presentationId,
                          ),
                        )
                      }
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label="Sumar"
                      className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                      onClick={() =>
                        setCart((current) =>
                          changeQuantity(
                            current,
                            line.productId,
                            line.quantity + 1,
                            line.presentationId,
                          ),
                        )
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-16 text-right text-xs font-semibold">
                      ${lineTotal(line).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      aria-label="Quitar"
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() =>
                        setCart((current) =>
                          removeFromCart(
                            current,
                            line.productId,
                            line.presentationId,
                          ),
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <div className="border-t border-slate-100 pt-2 space-y-1 text-xs dark:border-slate-800">
                  <SectionRow label="Subtotal">
                    <span>${totals.subtotalUSD.toFixed(2)}</span>
                  </SectionRow>
                  <SectionRow label="Impuestos">
                    <span>${totals.taxUSD.toFixed(2)}</span>
                  </SectionRow>
                  <SectionRow label="Total">
                    <span className="text-sm font-semibold">
                      ${totals.totalUSD.toFixed(2)}
                    </span>
                  </SectionRow>
                  {rates && settings?.currencies ? (
                    <p className="text-[11px] text-slate-400 text-right">
                      {settings.currencies.showVES
                        ? `≈ ${(totals.totalUSD * rates.rateBcv).toLocaleString("es-VE", { maximumFractionDigits: 2 })} Bs · `
                        : ""}
                      {settings.currencies.showUSDT && rates.rateUsdt
                        ? `≈ ${((totals.totalUSD * rates.rateBcv) / rates.rateUsdt).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={<Receipt className="h-5 w-5" />}
            title="Cobro"
            description="Cliente opcional y medio de cobro."
          >
            <div className="space-y-3">
              <label className="block text-xs text-slate-500">
                Cliente (opcional)
                <select
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="">Venta sin cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2">
                {(
                  [
                    ["now", "Pagar ahora"],
                    ["credit", "Crédito"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={
                      mode === key
                        ? "flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
                        : "flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-600"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "credit" ? (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <label className="block text-xs text-slate-500">
                    Pago inicial ahora (opcional)
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={creditInitial}
                      onChange={(event) => setCreditInitial(event.target.value)}
                      placeholder="0 = todo a crédito"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                  </label>
                  <label className="block text-xs text-slate-500">
                    Forma de cobro
                    <select
                      value={creditCadence}
                      onChange={(event) =>
                        setCreditCadence(
                          event.target.value as TenantSettings["credit"]["cadence"],
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
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
                  </label>
                  {creditCadence === "QUINCENAL" ||
                  creditCadence === "EVERY_N_DAYS" ? (
                    <label className="block text-xs text-slate-500">
                      Días entre cobros
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={creditDays}
                        onChange={(event) =>
                          setCreditDays(Number(event.target.value) || 15)
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                      />
                    </label>
                  ) : null}
                  {creditCadence === "MONTHLY" ? (
                    <label className="block text-xs text-slate-500">
                      Día del mes de cobro
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={creditMonthlyDay}
                        onChange={(event) =>
                          setCreditMonthlyDay(Number(event.target.value) || 1)
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                      />
                    </label>
                  ) : null}
                  {duePreview ? (
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Vence:{" "}
                      {duePreview.toLocaleDateString("es-VE", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Sin fecha fija: se cobra por abonos.
                    </p>
                  )}
                </div>
              ) : null}

              <label className="block text-xs text-slate-500">
                Medio de cobro
                <select
                  value={methodCode}
                  onChange={(event) => handleMethodChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                >
                  {methods.map((method) => (
                    <option key={method.code} value={method.code}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <label className="block text-xs text-slate-500">
                  Monto cobrado
                  <span className="ml-1 font-semibold text-slate-400">
                    ({currency})
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                  />
                </label>
              </div>

              <label className="block text-xs text-slate-500">
                Notas (opcional)
                <input
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Referencia, aclaración…"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </label>

              <button
                type="button"
                disabled={busy || cart.length === 0}
                onClick={() => void handleSubmit()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4" />
                )}
                Registrar venta
              </button>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
