"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Coins,
  Package,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";

/**
 * Public landing (S4 of the brand phase).
 *
 * Static product copy only — the single piece of DATA on this page is the
 * pricing table, which comes from the backend (`GET /api/subscription/public`),
 * never from a local JSON. Admin tone: no nutrition language, no patient
 * stories, no decorative metrics pretending to be real numbers.
 */

interface PublicPlan {
  id: string;
  name: string;
  price: string | number;
  currency?: string;
  badge?: string | null;
  description?: string | null;
  content?: {
    features?: string[];
    capacity?: { maxBranches: number; includedSeats: number } | null;
  } | null;
}

const CAPABILITIES = [
  {
    icon: Package,
    title: "Inventario y catálogo",
    text: "Productos, categorías, proveedores, stock mínimo y kardex de movimientos.",
  },
  {
    icon: Calculator,
    title: "Punto de venta y caja",
    text: "Cobros multi-moneda con las tasas del día, turnos con arqueo o caja siempre activa.",
  },
  {
    icon: ShoppingBag,
    title: "Pedidos, envíos y rutas",
    text: "Pedidos desde tu tienda online, agencias de envío, delivery y rutas por día.",
  },
  {
    icon: Coins,
    title: "Multi-moneda y sucursales",
    text: "Precios y cobros en USD, Bs y USDT; crece a sucursales cuando tu plan lo permite.",
  },
] as const;

const STEPS = [
  {
    title: "Cargá tu catálogo",
    text: "Productos, precios y proveedores en minutos. El stock se controla solo con cada venta y cada compra.",
  },
  {
    title: "Cobra y recibí pedidos",
    text: "Vendé en el mostrador con el POS o recibí pedidos desde tu tienda online con contacto verificable.",
  },
  {
    title: "Cerrá tu día",
    text: "Arqueo de caja, cobranzas del mes y rutas de entrega del día en una sola vista.",
  },
] as const;

export default function LandingPage() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansState, setPlansState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data } = await apiClient.get<PublicPlan[]>(
          "/api/subscription/public",
        );
        if (!cancelled) {
          setPlans(data);
          setPlansState("ready");
        }
      } catch {
        if (!cancelled) setPlansState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Socius ERP
          </span>
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <a href="#precios" className="hover:text-slate-900">
              Precios
            </a>
            <Link href="/login" className="hover:text-slate-900">
              Acceder
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
            >
              Probar Socius
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-indigo-600">
              Software de gestión para comercios
            </p>
            <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Tu negocio, bajo control.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-slate-600">
              Inventario, clientes, ventas, caja, pedidos y envíos desde un solo
              lugar. Sin planillas sueltas ni sistemas que no hablan entre sí.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Empezar ahora <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#precios"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ver precios
              </a>
            </div>
          </div>
        </section>

        {/* Capacidades */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <item.icon className="h-5 w-5 text-indigo-600" />
                <h2 className="mt-3 text-sm font-semibold text-slate-900">
                  {item.title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Cómo opera */}
        <section className="border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Cómo opera
            </h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Precios (datos reales del backend) */}
        <section id="precios" className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Planes
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Precios por usuario y mes, en dólares. Cambiás de plan cuando
              quieras.
            </p>

            {plansState === "loading" ? (
              <p className="mt-8 text-sm text-slate-500">Cargando planes…</p>
            ) : null}
            {plansState === "error" ? (
              <p className="mt-8 text-sm text-red-600">
                No se pudieron cargar los planes. Probá de nuevo en unos
                minutos.
              </p>
            ) : null}

            {plansState === "ready" ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {plans.map((plan) => (
                  <article
                    key={plan.id}
                    className="flex flex-col rounded-lg border border-slate-200 bg-white p-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {plan.name}
                      </h3>
                      {plan.badge ? (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700">
                          {plan.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                      ${Number(plan.price).toFixed(2)}
                      <span className="text-sm font-normal text-slate-500">
                        {" "}
                        /mes
                      </span>
                    </p>
                    {plan.description ? (
                      <p className="mt-2 text-sm text-slate-600">
                        {plan.description}
                      </p>
                    ) : null}
                    <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-700">
                      {(plan.content?.features ?? []).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {plan.content?.capacity ? (
                      <p className="mt-4 text-xs text-slate-400">
                        {plan.content.capacity.maxBranches} sucursal(es) ·{" "}
                        {plan.content.capacity.includedSeats} empleado(s)
                        incluidos
                      </p>
                    ) : null}
                    <Link
                      href="/register"
                      className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Elegir {plan.name}
                    </Link>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* Cierre */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Empezá a operar con Socius
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
              Creá tu cuenta, cargá tu catálogo y cobrá el primer día. Sin
              instalaciones ni contratos largos.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Crear mi cuenta <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row">
          <span>Socius ERP · Gestión de negocio</span>
          <nav className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-slate-700">
              Términos y condiciones
            </Link>
            <Link href="/privacy" className="hover:text-slate-700">
              Aviso de privacidad
            </Link>
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" /> Envíos y rutas incluidos
            </span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
