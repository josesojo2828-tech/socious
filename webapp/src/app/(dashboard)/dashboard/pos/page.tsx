"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Minus,
  Plus,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { ProductEndpoints } from "@/features/products/services/products.endpoints";
import type { Product } from "@/features/products/types/product.type";
import { SaleEndpoints } from "@/features/sales/services/sales.endpoints";
import { OrderEndpoints } from "@/features/orders/services/orders.endpoints";
import { ClientEndpoints } from "@/features/clients/services/clients.endpoints";
import type { Client } from "@/features/clients/types/client.type";
import { TenantPaymentMethodEndpoints } from "@/features/tenant-payment-methods/services/tenant-payment-methods.endpoints";
import { creditSchedule } from "@/features/sales/lib/credit-schedule";
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
  creditInitialPayment,
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

interface RateSnapshot {
  rateBcv: number;
  rateUsdt: number;
}

type Paged<T> = { list: T[]; total: number };

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/** Panel de cristal — lenguaje visual del mockup Maison Lévrier. */
const GLASS =
  "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_40px_-16px_rgba(26,42,70,0.25)]";

/** CTA principal en latón. */
const CTA_BRASS =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#b2944a] hover:bg-[#bf9f54] text-[#111018] font-semibold transition-colors disabled:opacity-50 shadow-[0_10px_26px_-12px_rgba(178,148,74,0.75)]";

const DOT = (
  <span
    aria-hidden
    className="inline-block w-[3px] h-[3px] rounded-full bg-[#b2944a] mx-2.5 align-middle"
  />
);

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
  const [mode, setMode] = useState<"now" | "credit" | "order">("now");
  const { activeWorkspace } = useWorkspaceStore();
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

  // Reloj vivo para el chip del encabezado.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

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

  const schedule = useMemo(
    () =>
      creditSchedule({
        totalUSD: totals.totalUSD,
        initialUSD: Number(creditInitial) || 0,
        cadence: creditCadence,
        everyNDays: creditDays,
        monthlyDay: creditMonthlyDay,
        count: 4,
      }),
    [
      totals.totalUSD,
      creditInitial,
      creditCadence,
      creditDays,
      creditMonthlyDay,
    ],
  );

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
      // El pago inicial es SOLO el campo del panel de crédito; `amount`
      // (monto cobrado) está autocompletado con el TOTAL y no aplica acá.
      const initial = Number(creditInitial);
      if (!Number.isFinite(initial) || initial < 0) {
        addToast({
          type: "warning",
          title: "Crédito",
          message: "El pago inicial no puede ser negativo.",
        });
        return;
      }
      const creditPayment = creditInitialPayment(
        creditInitial,
        currency,
        method ? method.code : null,
      );
      payloadInput = {
        ...payloadInput,
        credit: {
          cadence: creditCadence,
          everyNDays: creditDays,
          monthlyDay: creditMonthlyDay,
        },
        // Inicial en cero → la venta queda entera a crédito (sin pago).
        ...(creditPayment ? { payment: creditPayment } : {}),
      };
    } else if (mode === "order") {
      const client = clients.find((item) => item.id === clientId);
      if (!client) {
        addToast({
          type: "warning",
          title: "Pedido",
          message: "Elegí el cliente del pedido en el paso superior.",
        });
        return;
      }
      if (!client.email) {
        addToast({
          type: "warning",
          title: "Pedido",
          message: `${client.name} no tiene correo: completalo en Clientes.`,
        });
        return;
      }
      if (!activeWorkspace?.slug) {
        addToast({
          type: "error",
          title: "Pedido",
          message: "No se detectó la tienda del espacio activo.",
        });
        return;
      }
      const orderPayload = {
        organizationSlug: activeWorkspace.slug,
        customerName: client.name,
        customerEmail: client.email,
        clientId: client.id,
        ...(settings?.fulfillment?.coordination
          ? { coordination: settings.fulfillment.coordination }
          : {}),
        items: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          priceUSD: line.unitPriceUSD,
        })),
      };
      setBusy(true);
      try {
        const { data } = await apiClient.post<{ orderNumber: string }>(
          OrderEndpoints.list,
          orderPayload,
        );
        addToast({
          type: "success",
          title: "Pedido creado",
          message: `${data.orderNumber ?? ""} en la bandeja de pedidos.`,
        });
        setCart([]);
        setNotes("");
        await loadProducts();
      } catch (error) {
        addToast({
          type: "error",
          title: "Pedido",
          message: apiMessage(error, "No se pudo crear el pedido."),
        });
      } finally {
        setBusy(false);
      }
      return;
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

  const clockTime = now.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const clockDay = now.toLocaleDateString("es-VE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return (
    <div className="px-4 py-6 space-y-5">
      {/* ===== Encabezado estilo mockup ===== */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2 flex-wrap">
            <span className="truncate max-w-[180px]">
              {activeWorkspace?.name ?? "Socius ERP"}
            </span>
            {DOT}
            <span>Punto de venta</span>
            {DOT}
            <span>
              {!shiftControl
                ? "Siempre activa"
                : shift
                  ? "Turno abierto"
                  : "Sin turno"}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-none text-[#111018] dark:text-slate-50">
            Punto de Venta
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Elegí los artículos y cobrá: las tasas del día quedan congeladas en
            la venta.
          </p>
          {needsWarning ? (
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" /> Sin turno abierto: la venta
              se registra fuera de turno.
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5">
          <div className={`flex items-center gap-2 rounded-full px-4 h-11 ${GLASS}`}>
            <Search className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, SKU o código…"
              className="bg-transparent text-sm outline-none w-[200px] sm:w-[260px] placeholder:text-slate-400"
            />
          </div>
          <div
            className={`hidden sm:flex items-center gap-2.5 rounded-full px-4 h-11 ${GLASS}`}
            title="Hora local"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#b2944a] opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#b2944a]" />
            </span>
            <span className="font-mono text-sm tabular-nums text-[#111018] dark:text-slate-100">
              {clockTime}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              · {clockDay}
            </span>
          </div>
        </div>
      </header>

      {/* ===== Dos columnas: grilla de productos + carrito de cristal ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* --------- Productos --------- */}
        <section className="lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Mostrando {filtered.length} de {products.length} productos
            </span>
            {query.trim() ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-[11px] uppercase tracking-[0.16em] text-[#b2944a] font-semibold hover:underline"
              >
                Limpiar búsqueda
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product) => {
              const out = !product.isService && Number(product.stock) <= 0;
              const stockLabel = product.isService
                ? "Servicio"
                : `${Number(product.stock)} ${product.unit}`;
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={out}
                  onClick={() => handleSelectProduct(product)}
                  className={`group text-left rounded-2xl p-3 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(26,42,70,0.25)] ${GLASS}`}
                >
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#1a2a46]/5 dark:bg-slate-800 mb-3 relative flex items-center justify-center">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-semibold text-[#1a2a46]/30 dark:text-[#f0ede4]/30">
                        {product.name.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                    {!out ? (
                      <span className="absolute top-2 left-2 text-[9px] tracking-[0.16em] uppercase text-[#111018] bg-white/85 px-2 py-0.5 rounded-full font-medium">
                        {stockLabel}
                      </span>
                    ) : (
                      <span className="absolute top-2 left-2 text-[9px] tracking-[0.16em] uppercase text-white bg-[#c87878] px-2 py-0.5 rounded-full font-medium">
                        Sin stock
                      </span>
                    )}
                    {product.color ? (
                      <span
                        aria-label={`Color ${product.color}`}
                        title={product.color}
                        className="absolute top-2 right-2 h-4 w-4 rounded-full border-2 border-white/80 shadow-sm dark:border-slate-900/60"
                        style={{ backgroundColor: product.color }}
                      />
                    ) : null}
                  </div>
                  <div className="flex items-start justify-between gap-2 px-1">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {product.sku}
                      </div>
                      <p className="text-[15px] font-semibold leading-tight text-[#111018] dark:text-slate-100 truncate">
                        {product.name}
                      </p>
                    </div>
                    <div className="font-mono text-[13px] tabular-nums text-[#111018] dark:text-slate-100 whitespace-nowrap">
                      ${Number(product.salePriceUSD).toFixed(2)}
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 col-span-full py-8 text-center">
                Sin productos para esa búsqueda.
              </p>
            ) : null}
          </div>
        </section>

        {/* --------- Carrito / cobro: panel de cristal --------- */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6">
          <div className={`rounded-3xl p-5 sm:p-6 ${GLASS} max-h-[calc(100vh-7rem)] overflow-y-auto`}>
            {/* header del panel */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 mb-1">
                  Venta en curso · {cart.length} artículo
                  {cart.length === 1 ? "" : "s"}
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#111018] dark:text-slate-50">
                  Carrito
                </h2>
              </div>
              {cart.length > 0 ? (
                <button
                  type="button"
                  aria-label="Vaciar carrito"
                  onClick={() => setCart([])}
                  className="rounded-full w-9 h-9 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* chip de cliente */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl border border-[#b2944a]/40 bg-[#b2944a]/6">
              <div className="w-9 h-9 rounded-full bg-[#1a2a46] text-[#f0ede4] flex items-center justify-center text-sm font-semibold shrink-0">
                {(clients.find((client) => client.id === clientId)?.name ??
                  "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <select
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#111018] dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value="">Venta sin cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#b2944a] font-semibold shrink-0">
                Cliente
              </span>
            </div>

            {/* ítems */}
            {cart.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                Tocá un producto para agregarlo.
              </p>
            ) : (
              <div className="space-y-2">
                {cart.map((line) => {
                  // The cart keeps no color: read it from the loaded catalog.
                  const lineColor = products.find(
                    (item) => item.id === line.productId,
                  )?.color;
                  return (
                    <div
                      key={`${line.productId}:${line.presentationId ?? ""}`}
                      className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="relative w-10 h-10 rounded-xl bg-[#1a2a46] text-[#f0ede4] flex items-center justify-center text-sm font-semibold shrink-0">
                        {line.productName.trim().charAt(0).toUpperCase() || "?"}
                        {lineColor ? (
                          <span
                            aria-hidden
                            className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-white dark:border-slate-900"
                            style={{ backgroundColor: lineColor }}
                          />
                        ) : null}
                      </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-tight text-[#111018] dark:text-slate-100 truncate">
                        {line.productName}
                      </p>
                      <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        ${line.unitPriceUSD.toFixed(2)}
                        {line.presentationName ? ` · ${line.presentationName}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-white/70 dark:bg-slate-950/40 border border-white/70 dark:border-white/10 px-1 py-1">
                      <button
                        type="button"
                        aria-label="Restar"
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[#1a2a46] dark:text-slate-200 hover:bg-[#1a2a46]/10 transition-colors"
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
                      <span className="font-mono text-xs w-5 text-center tabular-nums text-[#111018] dark:text-slate-100">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Sumar"
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[#1a2a46] dark:text-slate-200 hover:bg-[#1a2a46]/10 transition-colors"
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
                    </div>
                    <span className="font-mono text-xs tabular-nums font-medium text-[#111018] dark:text-slate-100 w-16 text-right">
                      ${lineTotal(line).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      aria-label="Quitar"
                      className="rounded p-1 text-slate-400 hover:text-red-500 transition-colors"
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
                  );
                })}
              </div>
            )}

            {/* totales */}
            <div className="mt-4 pt-4 border-t border-[#1a2a46]/12 dark:border-white/10 space-y-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Subtotal
                </span>
                <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                  ${totals.subtotalUSD.toFixed(2)}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Impuestos
                </span>
                <span className="font-mono tabular-nums text-[#111018] dark:text-slate-100">
                  ${totals.taxUSD.toFixed(2)}
                </span>
              </div>
              <div className="flex items-end justify-between pt-2 border-t border-[#1a2a46]/12 dark:border-white/10">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    Total
                  </div>
                </div>
                <div className="font-mono text-2xl leading-none tabular-nums text-[#111018] dark:text-slate-50">
                  ${totals.totalUSD.toFixed(2)}
                </div>
              </div>
              {rates && settings?.currencies ? (
                <p className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 text-right">
                  {settings.currencies.showVES
                    ? `≈ ${(totals.totalUSD * rates.rateBcv).toLocaleString("es-VE", { maximumFractionDigits: 2 })} Bs · `
                    : ""}
                  {settings.currencies.showUSDT && rates.rateUsdt
                    ? `≈ ${((totals.totalUSD * rates.rateBcv) / rates.rateUsdt).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                    : ""}
                </p>
              ) : null}
            </div>

            {/* modo de venta: píldoras segmentadas (como los tabs del mockup) */}
            <div className="mt-4 flex items-center gap-1 rounded-full p-1 bg-white/55 dark:bg-slate-950/40 border border-white/70 dark:border-white/10">
              {(
                [
                  ["now", "Pagar ahora"],
                  ["credit", "Crédito"],
                  ...((settings?.planModules ?? []).includes("ORDERS")
                    ? ([["order", "Pedido"]] as const)
                    : []),
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={
                    mode === key
                      ? "flex-1 h-9 rounded-full bg-[#1a2a46] text-[#f0ede4] text-xs font-semibold tracking-wide transition-colors"
                      : "flex-1 h-9 rounded-full text-xs font-medium text-[#1a2a46]/70 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* panel condicional */}
            <div className="mt-4 space-y-3">
              {mode === "order" ? (
                <p className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
                  Se creará un pedido en la bandeja (sin cobro ahora). Elegí un
                  cliente con correo para poder registrarlo.
                </p>
              ) : null}

              {mode === "credit" ? (
                <div className="space-y-2 rounded-xl border border-[#b2944a]/40 bg-[#b2944a]/8 p-3">
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    Pago inicial ahora (opcional)
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={creditInitial}
                      onChange={(event) => setCreditInitial(event.target.value)}
                      placeholder="0 = todo a crédito"
                      className="mt-1 w-full rounded-lg border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-1.5 font-mono text-sm tabular-nums"
                    />
                  </label>
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    Forma de cobro
                    <select
                      value={creditCadence}
                      onChange={(event) =>
                        setCreditCadence(
                          event.target.value as TenantSettings["credit"]["cadence"],
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-1.5 text-sm"
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
                    <label className="block text-xs text-slate-500 dark:text-slate-400">
                      Días entre cobros
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={creditDays}
                        onChange={(event) =>
                          setCreditDays(Number(event.target.value) || 15)
                        }
                        className="mt-1 w-full rounded-lg border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-1.5 font-mono text-sm tabular-nums"
                      />
                    </label>
                  ) : null}
                  {creditCadence === "MONTHLY" ? (
                    <label className="block text-xs text-slate-500 dark:text-slate-400">
                      Día del mes de cobro
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={creditMonthlyDay}
                        onChange={(event) =>
                          setCreditMonthlyDay(Number(event.target.value) || 1)
                        }
                        className="mt-1 w-full rounded-lg border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-1.5 font-mono text-sm tabular-nums"
                      />
                    </label>
                  ) : null}
                  {schedule.length > 0 ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8e7538]">
                        Cómo caen los pagos
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {schedule.map((entry) => (
                          <li
                            key={entry.date.toISOString()}
                            className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                          >
                            <span className="font-mono">
                              {entry.date.toLocaleDateString("es-VE", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                            <span className="font-mono font-semibold tabular-nums">
                              saldo ${entry.balanceUSD.toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {creditCadence === "FREE"
                        ? "Sin fechas fijas: se cobra por abonos."
                        : "El inicial cubre el total: nada pendiente."}
                    </p>
                  )}
                </div>
              ) : null}

              {mode !== "order" ? (
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  Medio de cobro
                  <select
                    value={methodCode}
                    onChange={(event) => handleMethodChange(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2 text-sm"
                  >
                    {methods.map((method) => (
                      <option key={method.code} value={method.code}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className={mode !== "now" ? "hidden" : ""}>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  Monto cobrado
                  <span className="ml-1 font-semibold text-[#b2944a]">
                    ({currency})
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2 font-mono text-lg tabular-nums"
                  />
                </label>
              </div>

              <label className="block text-xs text-slate-500 dark:text-slate-400">
                Notas (opcional)
                <input
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Referencia, aclaración…"
                  className="mt-1 w-full rounded-xl border border-[#1a2a46]/15 dark:border-white/15 bg-white/70 dark:bg-slate-950/40 px-3 py-2 text-sm"
                />
              </label>

              <button
                type="button"
                disabled={busy || cart.length === 0}
                onClick={() => void handleSubmit()}
                className={`w-full h-14 text-sm ${CTA_BRASS}`}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4" />
                )}
                {mode === "order" ? "Crear pedido" : "Registrar venta"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
