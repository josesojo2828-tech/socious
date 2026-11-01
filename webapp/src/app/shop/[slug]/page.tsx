"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { CheckoutEndpoints } from "@/features/checkout/services/checkout.endpoints";
import type {
  CheckoutConfig,
  CheckoutForm,
  OrderCreatedResponse,
  PublicProduct,
} from "@/features/checkout/types/checkout.type";
import {
  buildPublicOrderPayload,
  validateCheckout,
} from "@/features/checkout/lib/order-checkout";
import {
  addToCart,
  cartTotals,
  changeQuantity,
  removeFromCart,
  type CartLine,
} from "@/features/sales/lib/pos-form";
import { OfferEndpoints } from "@/features/offers/services/offers.endpoints";
import {
  offerExpiresLabel,
  offerPercentLabel,
} from "@/features/offers/lib/offer-storefront";
import { offerBannerSrc } from "@/features/offers/lib/offer-banner";
import type { PublicOffersResponse } from "@/features/offers/types/offer.type";

/**
 * Catalog row as the public endpoint returns it once the server has applied
 * the active offers (S11): `salePriceUSD` is ALREADY discounted, and a row
 * inside an offer also carries the percent plus the untouched list price to
 * strike through. The cart keeps reading `salePriceUSD`, so no price math
 * happens here.
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

/**
 * Public storefront (S12): catalog by shop slug + cart + order without an
 * account. Fulfillment options come from the shop's own settings
 * (`GET /api/settings/public/:slug`); the delivery fee is added by the backend
 * when the order is posted, so the UI shows it as an upcoming charge.
 */
export default function ShopPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [offers, setOffers] = useState<PublicOffersResponse["list"]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [storeMissing, setStoreMissing] = useState<boolean>(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [created, setCreated] = useState<OrderCreatedResponse | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        // Las ofertas no pueden tumbar la tienda: si su feed falla, la
        // página sigue mostrando catálogo y carrito sin la sección (S11).
        const [configResponse, catalog, offersResponse] = await Promise.all([
          apiClient.get<CheckoutConfig>(CheckoutEndpoints.config(slug)),
          apiClient.get<CatalogResponse>(CheckoutEndpoints.catalog, {
            params: { organization: slug },
          }),
          apiClient
            .get<PublicOffersResponse>(OfferEndpoints.public(slug))
            .catch(() => null),
        ]);
        if (cancelled) return;
        setConfig(configResponse.data);
        setProducts(catalog.data.list);
        setOffers(offersResponse?.data.list ?? []);
        if (catalog.data.list.length > 0) {
          setForm((current) => ({
            ...current,
            fulfillmentType: configResponse.data.fulfillmentTypes[0] ?? "PICKUP",
          }));
        }
      } catch (requestError) {
        if (cancelled) return;
        const status = (requestError as { response?: { status?: number } })
          ?.response?.status;
        if (status === 404) {
          setStoreMissing(true);
        } else {
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

  const totals = useMemo(() => cartTotals(cart), [cart]);

  const patchForm = (patch: Partial<CheckoutForm>) =>
    setForm((current) => ({ ...current, ...patch }));

  const handleSubmit = useCallback(async (): Promise<void> => {
    const validation = validateCheckout(form, config);
    if (validation) {
      setError(validation);
      return;
    }
    if (cart.length === 0) {
      setError("Agregá al menos un producto.");
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
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(message ?? "No se pudo recibir tu pedido.");
    } finally {
      setSubmitting(false);
    }
  }, [form, config, cart, slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (storeMissing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-lg font-semibold">Tienda no encontrada</h1>
        <p className="text-sm text-slate-500">
          Esta dirección no corresponde a ninguna tienda activa.
        </p>
        <Link href="/" className="text-sm text-indigo-600 underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (created) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <h1 className="text-lg font-semibold">¡Pedido recibido!</h1>
        <p className="text-sm text-slate-600">
          Número de pedido <strong>{created.orderNumber}</strong>. Te van a
          contactar para coordinar la entrega.
        </p>
        <p className="text-xs text-slate-400">
          Total {Number(created.totalUSD).toFixed(2)} USD · estado pendiente de
          confirmación.
        </p>
        <button
          type="button"
          onClick={() => {
            setCreated(null);
            setForm(EMPTY_FORM);
          }}
          className="mt-2 rounded-lg border border-slate-300 px-4 py-2 text-sm"
        >
          Seguir comprando
        </button>
      </div>
    );
  }

  const needsAddress =
    form.fulfillmentType === "DELIVERY" || form.fulfillmentType === "SHIPPING";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase text-slate-400">Tienda</p>
        <h1 className="text-2xl font-semibold text-slate-800">
          {slug.replace(/-/g, " ")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {products.length} producto(s) disponibles · precios en USD.
        </p>
      </header>

      {offers.length > 0 ? (
        <section aria-labelledby="shop-offers" className="mb-6">
          <p id="shop-offers" className="text-xs uppercase text-slate-400">
            Ofertas
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {offers.map((offer) => {
              const expiry = offerExpiresLabel(offer.expiresAt);
              const chip = offerPercentLabel(offer.discountPercent);
              return (
                <article
                  key={offer.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  {offer.bannerKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={offerBannerSrc(offer.bannerKey)}
                      alt=""
                      className="h-24 w-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="h-24 w-full bg-gradient-to-r from-indigo-500 to-sky-400"
                    />
                  )}
                  <div className="flex items-start justify-between gap-2 p-4">
                    <div className="min-w-0">
                      <h2 className="text-sm font-medium text-slate-800">
                        {offer.name}
                      </h2>
                      {offer.slogan ? (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {offer.slogan}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-500">
                        {expiry ? `${expiry} · ` : ""}
                        {offer._count.items} producto(s)
                      </p>
                    </div>
                    {chip ? (
                      <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                        {chip}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const line = cart.find((item) => item.productId === product.id);
            const out = Number(product.stock) <= 0;
            const offerPercent = product.offerPercent ?? 0;
            return (
              <article
                key={product.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="mb-2 h-24 w-full rounded-lg object-cover"
                  />
                ) : null}
                <h2 className="text-sm font-medium text-slate-800">
                  {product.name}
                </h2>
                <p className="mt-1 text-xs text-slate-400">{product.sku}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">
                      ${Number(product.salePriceUSD).toFixed(2)}
                    </span>
                    {offerPercent > 0 ? (
                      <>
                        <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                          {offerPercentLabel(offerPercent)}
                        </span>
                        {typeof product.listPriceUSD === "number" ? (
                          <span className="text-xs text-slate-400 line-through">
                            ${product.listPriceUSD.toFixed(2)}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </span>
                  {line ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Restar"
                        className="rounded p-1 border border-slate-200"
                        onClick={() =>
                          setCart((current) =>
                            changeQuantity(
                              current,
                              product.id,
                              (line?.quantity ?? 1) - 1,
                            ),
                          )
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs">{line.quantity}</span>
                      <button
                        type="button"
                        aria-label="Sumar"
                        className="rounded p-1 border border-slate-200"
                        onClick={() =>
                          setCart((current) => addToCart(current, product))
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={out}
                      onClick={() => setCart((current) => addToCart(current, product))}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    >
                      {out ? "Sin stock" : "Agregar"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {products.length === 0 ? (
            <p className="col-span-full text-sm text-slate-500">
              Esta tienda todavía no tiene productos publicados.
            </p>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ShoppingBag className="h-4 w-4" /> Tu pedido
            </h2>

            {created === null && cart.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                El carrito está vacío.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {cart.map((line) => (
                  <div
                    key={line.productId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">
                      {line.quantity} × {line.productName}
                    </span>
                    <span className="flex items-center gap-2">
                      ${(line.unitPriceUSD * line.quantity).toFixed(2)}
                      <button
                        type="button"
                        aria-label="Quitar"
                        className="text-red-500"
                        onClick={() =>
                          setCart((current) => removeFromCart(current, line.productId))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                ))}

                <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${totals.subtotalUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impuestos</span>
                    <span>${totals.taxUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Total</span>
                    <span>${totals.totalUSD.toFixed(2)}</span>
                  </div>
                  {form.fulfillmentType === "DELIVERY" && config ? (
                    <p className="mt-2 text-amber-600">
                      + Delivery ${Number(config.delivery.feeUSD).toFixed(2)} al
                      confirmar
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">Tus datos</h2>

            <label className="mt-3 block text-xs text-slate-500">
              Nombre *
              <input
                type="text"
                value={form.customerName}
                onChange={(event) => patchForm({ customerName: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                placeholder="Tu nombre"
              />
            </label>

            <label className="mt-2 block text-xs text-slate-500">
              Correo *
              <input
                type="email"
                value={form.customerEmail}
                onChange={(event) => patchForm({ customerEmail: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                placeholder="tu@correo.com"
              />
            </label>

            <label className="mt-2 block text-xs text-slate-500">
              Teléfono (opcional)
              <input
                type="tel"
                value={form.customerPhone ?? ""}
                onChange={(event) => patchForm({ customerPhone: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                placeholder="+58 424 0000000"
              />
            </label>

            <label className="mt-2 block text-xs text-slate-500">
              Cómo lo recibís *
              <select
                value={form.fulfillmentType}
                onChange={(event) =>
                  patchForm({
                    fulfillmentType: event.target.value as CheckoutForm["fulfillmentType"],
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                {(config?.fulfillmentTypes ?? ["PICKUP"]).map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type] ?? type}
                  </option>
                ))}
              </select>
            </label>

            {form.fulfillmentType === "SHIPPING" && config ? (
              <label className="mt-2 block text-xs text-slate-500">
                Agencia *
                <select
                  value={form.agencyId ?? ""}
                  onChange={(event) => patchForm({ agencyId: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                >
                  <option value="">Elegí una agencia</option>
                  {config.agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {needsAddress ? (
              <label className="mt-2 block text-xs text-slate-500">
                Dirección *
                <input
                  type="text"
                  value={form.customerAddress ?? ""}
                  onChange={(event) =>
                    patchForm({ customerAddress: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  placeholder="Calle y número"
                />
              </label>
            ) : null}

            {config ? (
              <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                Coordinamos por {config.coordination.toLowerCase()}
              </p>
            ) : null}

            {config?.delivery.enabled && form.fulfillmentType === "DELIVERY" ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <Truck className="h-3.5 w-3.5" /> Delivery $
                {Number(config.delivery.feeUSD).toFixed(2)}
              </p>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={() => void handleSubmit()}
              className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Confirmar pedido"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
