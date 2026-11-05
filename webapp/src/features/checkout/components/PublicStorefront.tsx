"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Receipt as ReceiptIcon,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import {
  CARD,
  CTA_BRASS,
  EYEBROW,
  GLASS,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { CheckoutEndpoints } from "@/features/checkout/services/checkout.endpoints";
import {
  buildPublicOrderPayload,
  validateCheckout,
} from "@/features/checkout/lib/order-checkout";
import type {
  CheckoutConfig,
  CheckoutForm,
  OrderCreatedResponse,
  PublicProduct,
} from "@/features/checkout/types/checkout.type";
import {
  addToCart,
  cartTotals,
  changeQuantity,
  removeFromCart,
  type CartLine,
} from "@/features/sales/lib/pos-form";
import { ExchangeEndpoints } from "@/features/exchange/services/exchange.endpoints";
import { publicFileUrl } from "@/features/products/lib/product-images";

/**
 * Public storefront (`/{slug}`): catalog, cart and an order flow with no
 * account. Fulfillment only asks what the shop configured, payment is
 * coordinated with the merchant over WhatsApp, and the order lands in the
 * dashboard's Pedidos inbox.
 */

type CatalogProduct = PublicProduct & {
  offerPercent?: number;
  listPriceUSD?: number;
};

interface CatalogResponse {
  list: CatalogProduct[];
  total: number;
}

const TYPE_LABELS: Record<string, string> = {
  PICKUP: "Retiro en tienda",
  DELIVERY: "Delivery a domicilio",
  SHIPPING: "Envío por agencia",
};

const EMPTY_FORM: CheckoutForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  customerAddress: "",
  fulfillmentType: "PICKUP",
  agencyId: "",
  notes: "",
};

function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function bs(amountUSD: number, rate: number): string {
  return `Bs ${(amountUSD * rate).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function whatsappHref(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
}

export function PublicStorefront({ slug }: { slug: string }) {
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [storeMissing, setStoreMissing] = useState<boolean>(false);
  const [rateBcv, setRateBcv] = useState<number>(0);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [created, setCreated] = useState<OrderCreatedResponse | null>(null);

  const totals = useMemo(() => cartTotals(cart), [cart]);
  const whatsapp = config?.store.whatsapp ?? null;
  const fulfillmentTypes = config?.fulfillmentTypes ?? [];
  const needsFulfillmentStep = fulfillmentTypes.length > 0;
  const needsAddress =
    form.fulfillmentType === "DELIVERY" || form.fulfillmentType === "SHIPPING";
  const needsAgency =
    form.fulfillmentType === "SHIPPING" && (config?.agencies.length ?? 0) > 0;
  const deliveryFee =
    form.fulfillmentType === "DELIVERY" && config?.delivery.enabled
      ? config.delivery.feeUSD
      : 0;
  const totalWithDelivery = totals.totalUSD + deliveryFee;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const [configResponse, catalog, bcv] = await Promise.all([
          apiClient.get<CheckoutConfig>(CheckoutEndpoints.config(slug)),
          apiClient.get<CatalogResponse>(CheckoutEndpoints.catalog, {
            params: { organization: slug },
          }),
          apiClient
            .get<{ rate: number }>(ExchangeEndpoints.bcv)
            .catch(() => ({ data: { rate: 0 } })),
        ]);
        if (cancelled) return;
        setConfig(configResponse.data);
        setProducts(catalog.data.list);
        setRateBcv(Number(bcv.data?.rate) || 0);
        setForm((current) => ({
          ...current,
          fulfillmentType: configResponse.data.fulfillmentTypes[0] ?? "PICKUP",
        }));
      } catch (requestError) {
        if (cancelled) return;
        const status = (requestError as { response?: { status?: number } })
          ?.response?.status;
        setStoreMissing(status === 404);
        if (status !== 404) {
          setError("No se pudo cargar la tienda. Probá de nuevo en un momento.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const add = (product: CatalogProduct) => {
    setCart((current) =>
      addToCart(current, {
        id: product.id,
        name: product.name,
        salePriceUSD: product.salePriceUSD,
        taxRate: product.taxRate,
      }),
    );
  };

  const submit = useCallback(async () => {
    if (cart.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }
    const validation = validateCheckout(form, config);
    if (validation) {
      setError(validation);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await apiClient.post<OrderCreatedResponse>(
        CheckoutEndpoints.createOrder,
        buildPublicOrderPayload(slug, form, cart),
      );
      setCreated(data);
      setCart([]);
    } catch (submitError) {
      const message =
        (submitError as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "No se pudo enviar el pedido. Probá de nuevo.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [cart, config, form, slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0ede4]/50 dark:bg-[#0c101c]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (storeMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0ede4]/50 px-4 dark:bg-[#0c101c]">
        <div className={`${CARD} max-w-md p-8 text-center`}>
          <h1 className={PAGE_TITLE}>Tienda no encontrada</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            El enlace no corresponde a una tienda activa.
          </p>
        </div>
      </div>
    );
  }

  const storeName = config?.store.name ?? slug;

  return (
    <div className="min-h-screen bg-[#f0ede4]/50 dark:bg-[#0c101c] pb-24">
      <header className={`${GLASS} sticky top-0 z-30 border-b border-white/60 dark:border-white/10`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            {config?.store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.store.logoUrl}
                alt={storeName}
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b2944a] font-semibold text-[#111018]">
                {storeName.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className={EYEBROW}>Tienda</p>
              <h1 className="truncate font-display text-lg font-semibold text-[#111018] dark:text-slate-50">
                {storeName}
              </h1>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-[#111018] dark:bg-slate-900/70 dark:text-slate-100">
            <ShoppingBag className="h-4 w-4 text-[#b2944a]" />
            {cart.reduce((sum, line) => sum + line.quantity, 0)}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {created ? (
          <Receipt
            created={created}
            cart={cart}
            totals={totals}
            deliveryFee={deliveryFee}
            rateBcv={rateBcv}
            whatsapp={whatsapp}
            storeName={storeName}
            onNewOrder={() => setCreated(null)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <section>
              {products.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Esta tienda todavía no publicó productos.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {products.map((product) => {
                    const out = Number(product.stock) <= 0;
                    return (
                      <article key={product.id} className={`${CARD} overflow-hidden`}>
                        {product.images?.[0]?.key || product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              product.images?.[0]?.key
                                ? publicFileUrl(product.images[0].key)
                                : (product.imageUrl as string)
                            }
                            alt={product.name}
                            className="h-36 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-36 w-full items-center justify-center bg-[#1a2a46]/5 dark:bg-white/5">
                            <ShoppingBag className="h-8 w-8 text-[#1a2a46]/20 dark:text-white/20" />
                          </div>
                        )}
                        <div className="p-3">
                          <h2 className="line-clamp-2 text-sm font-medium text-[#111018] dark:text-slate-100">
                            {product.name}
                          </h2>
                          <p className="mt-1 flex items-baseline gap-2">
                            <span className="font-mono text-sm font-semibold tabular-nums text-[#111018] dark:text-slate-100">
                              {money(Number(product.salePriceUSD))}
                            </span>
                            {product.offerPercent ? (
                              <span className="rounded-full bg-[#b2944a]/15 px-1.5 text-[10px] font-bold text-[#8e7538]">
                                −{product.offerPercent}%
                              </span>
                            ) : null}
                          </p>
                          {rateBcv > 0 ? (
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              {bs(Number(product.salePriceUSD), rateBcv)}
                            </p>
                          ) : null}
                          <button
                            type="button"
                            disabled={out}
                            onClick={() => add(product)}
                            className={`mt-3 w-full py-2 text-xs ${CTA_BRASS} disabled:opacity-40`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {out ? "Agotado" : "Agregar"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <section className={`${CARD} p-4`}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[#111018] dark:text-slate-100">
                  <ShoppingBag className="h-4 w-4 text-[#b2944a]" /> Tu carrito
                </h2>
                {cart.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Agregá productos para armar tu pedido.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-[#1b1d21]/8 dark:divide-white/5">
                    {cart.map((line) => (
                      <li key={line.productId} className="flex items-center gap-2 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-[#111018] dark:text-slate-100">
                            {line.productName}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {money(line.unitPriceUSD)} × {line.quantity}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Quitar uno"
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
                          className="rounded p-1 text-slate-400 hover:text-red-500"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center font-mono text-xs tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Agregar uno"
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
                          className="rounded p-1 text-slate-400 hover:text-[#b2944a]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Eliminar"
                          onClick={() =>
                            setCart((current) =>
                              removeFromCart(
                                current,
                                line.productId,
                                line.presentationId,
                              ),
                            )
                          }
                          className="rounded p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 space-y-1 border-t border-[#1b1d21]/8 pt-3 text-sm dark:border-white/10">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">
                      {money(totals.totalUSD)}
                    </span>
                  </div>
                  {deliveryFee > 0 ? (
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Delivery</span>
                      <span className="font-mono tabular-nums">
                        {money(deliveryFee)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-semibold text-[#111018] dark:text-slate-50">
                    <span>Total</span>
                    <span className="font-mono tabular-nums">
                      {money(totalWithDelivery)}
                    </span>
                  </div>
                  {rateBcv > 0 ? (
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>En bolívares (BCV)</span>
                      <span className="font-mono tabular-nums">
                        {bs(totalWithDelivery, rateBcv)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className={`${CARD} p-4`}>
                <h2 className="text-sm font-semibold text-[#111018] dark:text-slate-100">
                  Tus datos
                </h2>
                <div className="mt-3 space-y-3">
                  <label className={LABEL_SM}>
                    Nombre *
                    <input
                      value={form.customerName}
                      onChange={(event) =>
                        setForm((f) => ({ ...f, customerName: event.target.value }))
                      }
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>
                  <label className={LABEL_SM}>
                    Correo *
                    <input
                      type="email"
                      value={form.customerEmail}
                      onChange={(event) =>
                        setForm((f) => ({ ...f, customerEmail: event.target.value }))
                      }
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>
                  <label className={LABEL_SM}>
                    Teléfono
                    <input
                      value={form.customerPhone}
                      onChange={(event) =>
                        setForm((f) => ({ ...f, customerPhone: event.target.value }))
                      }
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>

                  {needsFulfillmentStep ? (
                    <label className={LABEL_SM}>
                      Cómo lo recibís
                      <select
                        value={form.fulfillmentType}
                        onChange={(event) =>
                          setForm((f) => ({
                            ...f,
                            fulfillmentType: event.target
                              .value as CheckoutForm["fulfillmentType"],
                          }))
                        }
                        className={`mt-1 ${INPUT}`}
                      >
                        {fulfillmentTypes.map((type) => (
                          <option key={type} value={type}>
                            {TYPE_LABELS[type] ?? type}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {needsAddress ? (
                    <label className={LABEL_SM}>
                      Dirección *
                      <input
                        value={form.customerAddress}
                        onChange={(event) =>
                          setForm((f) => ({
                            ...f,
                            customerAddress: event.target.value,
                          }))
                        }
                        className={`mt-1 ${INPUT}`}
                      />
                    </label>
                  ) : null}

                  {needsAgency ? (
                    <label className={LABEL_SM}>
                      Agencia *
                      <select
                        value={form.agencyId}
                        onChange={(event) =>
                          setForm((f) => ({ ...f, agencyId: event.target.value }))
                        }
                        className={`mt-1 ${INPUT}`}
                      >
                        <option value="">Elegí una agencia</option>
                        {config?.agencies.map((agency) => (
                          <option key={agency.id} value={agency.id}>
                            {agency.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label className={LABEL_SM}>
                    Notas
                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        setForm((f) => ({ ...f, notes: event.target.value }))
                      }
                      rows={2}
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={submitting || cart.length === 0}
                  className={`mt-4 w-full py-3 text-sm ${CTA_BRASS}`}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Enviar pedido
                </button>
                {whatsapp ? (
                  <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                    El pago se coordina con la tienda por WhatsApp.
                  </p>
                ) : null}
              </section>
            </aside>
          </div>
        )}
      </main>

      {whatsapp ? (
        <a
          href={whatsappHref(
            whatsapp,
            `Hola ${storeName}, quiero hacer un pedido.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribir a la tienda por WhatsApp"
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      ) : null}
    </div>
  );
}

function Receipt({
  created,
  cart,
  totals,
  deliveryFee,
  rateBcv,
  whatsapp,
  storeName,
  onNewOrder,
}: {
  created: OrderCreatedResponse;
  cart: CartLine[];
  totals: { subtotalUSD: number; taxUSD: number; totalUSD: number };
  deliveryFee: number;
  rateBcv: number;
  whatsapp: string | null;
  storeName: string;
  onNewOrder: () => void;
}) {
  const total = Number(created.totalUSD) || totals.totalUSD + deliveryFee;
  const message = [
    `Hola ${storeName}, quiero coordinar el pago del pedido ${created.orderNumber}.`,
    "",
    ...cart.map(
      (line) => `• ${line.quantity} × ${line.productName} — ${money(line.unitPriceUSD * line.quantity)}`,
    ),
    "",
    `Total: ${money(total)}${rateBcv > 0 ? ` (${bs(total, rateBcv)})` : ""}`,
  ].join("\n");

  return (
    <div className={`${CARD} mx-auto max-w-xl p-6`}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold text-[#111018] dark:text-slate-50">
            Pedido {created.orderNumber}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Lo recibimos y la tienda te va a contactar.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-[#1a2a46]/20 p-4 dark:border-white/15">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          <ReceiptIcon className="h-3.5 w-3.5" /> Resumen
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {cart.map((line) => (
            <li key={line.productId} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                {line.quantity} × {line.productName}
              </span>
              <span className="shrink-0 font-mono tabular-nums text-slate-700 dark:text-slate-200">
                {money(line.unitPriceUSD * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-[#1b1d21]/8 pt-3 text-sm dark:border-white/10">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums">{money(totals.totalUSD)}</span>
          </div>
          {deliveryFee > 0 ? (
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Delivery</span>
              <span className="font-mono tabular-nums">{money(deliveryFee)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold text-[#111018] dark:text-slate-50">
            <span>Total</span>
            <span className="font-mono tabular-nums">{money(total)}</span>
          </div>
          {rateBcv > 0 ? (
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Tasa BCV</span>
              <span className="font-mono tabular-nums">
                {bs(total, rateBcv)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {whatsapp ? (
          <a
            href={whatsappHref(whatsapp, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            <MessageCircle className="h-4 w-4" /> Coordinar pago por WhatsApp
          </a>
        ) : null}
        <button
          type="button"
          onClick={onNewOrder}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#1a2a46]/15 px-4 py-3 text-sm font-medium text-[#1a2a46]/80 hover:bg-[#1a2a46]/[0.05] dark:border-white/15 dark:text-slate-300"
        >
          Hacer otro pedido
        </button>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <MapPin className="h-3 w-3" />
        Entregas coordinadas directamente con {storeName}.
      </p>
    </div>
  );
}
