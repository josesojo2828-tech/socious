"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Coins,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { ThemeToggle } from "@/shared/components/molecules/ThemeToggle";
import {
  BRASS_DOT,
  BTN_GHOST,
  CARD,
  CARD_HEADER,
  CTA_BRASS,
  CTA_NAVY,
  EYEBROW,
  GLASS,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";

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

const FALLBACK_PLANS: PublicPlan[] = [
  {
    id: "plan-basico",
    name: "Comercio Inicial",
    price: 19.0,
    badge: "Básico",
    description: "Para tiendas y negocios que inician y quieren control estricto de caja e inventario.",
    content: {
      capacity: { maxBranches: 1, includedSeats: 2 },
      features: [
        "Control de catálogo con variantes y código de barra",
        "Kardex automatizado de movimientos",
        "Punto de Venta (POS) y arqueo de turnos",
        "Cobros multimoneda (USD, Bs, USDT)",
        "1 sucursal incluida · 2 puestos",
      ],
    },
  },
  {
    id: "plan-crecimiento",
    name: "Crecimiento Multisede",
    price: 49.0,
    badge: "Más elegido",
    description: "Para empresas con múltiples tiendas, rutas de entrega y mayor volumen de operaciones.",
    content: {
      capacity: { maxBranches: 3, includedSeats: 6 },
      features: [
        "Todo lo del plan Comercio Inicial",
        "Hasta 3 sucursales sincronizadas en vivo",
        "Transferencias de stock entre sucursales",
        "Gestión de rutas de despacho y delivery",
        "Módulo de compras y órdenes a proveedores",
        "Cuentas por cobrar y cuentas por pagar",
        "Soporte prioritario 24/7",
      ],
    },
  },
  {
    id: "plan-corporativo",
    name: "Empresarial Mayorista",
    price: 99.0,
    badge: "Avanzado",
    description: "Control absoluto para cadenas, importadoras y distribuidores de alto flujo.",
    content: {
      capacity: { maxBranches: 10, includedSeats: 20 },
      features: [
        "Sucursales ilimitadas (según capacidad)",
        "Precios mayoristas y listas por tipo de cliente",
        "Auditoría y permisos estrictos por usuario",
        "Reportes financieros exportables a Excel/PDF",
        "API para sincronización con e-commerce",
        "Gerente de cuenta y migración asistida",
      ],
    },
  },
];

const CAPABILITIES = [
  {
    icon: Boxes,
    section: "Inventario & Kardex",
    title: "Kardex con Costo Ponderado en Vivo",
    text: "Trazabilidad completa por SKU, variantes (talla, color, presentación) y cálculo de costo promedio ponderado automático en cada compra y venta.",
  },
  {
    icon: Calculator,
    section: "Punto de Venta",
    title: "POS de Mostrador & Arqueo de Turnos",
    text: "Atención inmediata con lector de códigos de barra, pagos combinados (efectivo, transferencias, USDT) y cierre de caja sin descuadres.",
  },
  {
    icon: Coins,
    section: "Multimoneda Nativa",
    title: "Precios y Cobros en USD, Bs y Cripto",
    text: "Actualización de tasas oficiales (BCV) y paralelas con congelación de tasa en cada comprobante de venta o compra.",
  },
  {
    icon: Building2,
    section: "Sucursales & Almacenes",
    title: "Multisede con Transferencias de Stock",
    text: "Supervisa todas tus tiendas desde un único acceso. Envía y recibe mercancía entre sedes con comprobantes de transferencia.",
  },
  {
    icon: ShoppingBag,
    section: "Compras & Abastecimiento",
    title: "Proveedores y Cuentas por Pagar",
    text: "Registra facturas de proveedores, programa pagos a crédito y actualiza el stock automáticamente al recibir el despacho.",
  },
  {
    icon: Truck,
    section: "Despachos & Logística",
    title: "Rutas de Entrega y Agencias de Envío",
    text: "Asigna pedidos a conductores o agencias nacionales (Zoom, MRW, Tealca) y sigue el estado de entrega en tiempo real.",
  },
];

const FAQS = [
  {
    q: "¿Qué tan rápido puedo comenzar a operar con Stockira?",
    a: "En menos de 10 minutos. Creas tu cuenta, defines tus datos comerciales y puedes empezar a facturar de inmediato importando tus productos desde Excel o cargándolos desde el formulario ágil.",
  },
  {
    q: "¿Cómo se maneja el cobro en múltiples monedas (USD, Bs, USDT)?",
    a: "Stockira cuenta con un convertidor multimoneda nativo. Configuras la tasa del día y el POS calcula automáticamente el monto en cada moneda, admitiendo pagos mixtos en una sola venta (ejemplo: una parte en USD efectivo y el resto en transferencia bancaria local).",
  },
  {
    q: "¿Puedo controlar más de una sucursal o almacén?",
    a: "Sí. Stockira está diseñado para la escala multisede. Puedes crear sucursales independientes, asignar personal a cada tienda y realizar traslados de mercancía entre depósitos con auditoría completa.",
  },
  {
    q: "¿Necesito instalar algún software local o servidor en mi negocio?",
    a: "No. Stockira funciona 100% en la nube a través de cualquier navegador web en PC, laptop o tablet. Tus datos se respaldan de forma continua y automática.",
  },
  {
    q: "¿Puedo migrar mi catálogo y cartera de clientes desde Excel?",
    a: "Totalmente. Dispones de plantillas de importación masiva para cargar tu inventario inicial, proveedores y clientes en cuestión de minutos.",
  },
];

export default function LandingPage() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansState, setPlansState] = useState<"loading" | "ready" | "error">("loading");
  const [activeTab, setActiveTab] = useState<"dashboard" | "pos" | "productos">("dashboard");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data } = await apiClient.get<PublicPlan[]>("/api/subscription/public");
        if (!cancelled) {
          if (Array.isArray(data) && data.length > 0) {
            setPlans(data);
          } else {
            setPlans(FALLBACK_PLANS);
          }
          setPlansState("ready");
        }
      } catch {
        if (!cancelled) {
          setPlans(FALLBACK_PLANS);
          setPlansState("ready");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const nowFormatted = new Date().toLocaleDateString("es-VE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#f0ede4]/40 dark:bg-[#0c101c] text-[#111018] dark:text-slate-100 font-sans selection:bg-[#1a2a46] selection:text-[#f0ede4]">
      {/* ===== Barra superior sutil (Ticker de Estado) ===== */}
      <div className="border-b border-[#1a2a46]/10 dark:border-white/10 bg-[#f0ede4] dark:bg-[#111527] px-4 py-2 text-xs text-[#1a2a46]/80 dark:text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#b2944a] opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#b2944a]" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
              SISTEMA OPERATIVO COMERCIAL
            </span>
            <span className={BRASS_DOT} />
            <span className="hidden sm:inline font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Kardex · POS Multimoneda · Sucursales
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline font-mono text-[11px] text-[#1b1d21]/60 dark:text-slate-400 tnum">
              {nowFormatted}
            </span>
            <span className="hidden md:inline font-mono text-[11px] text-[#b2944a] font-semibold">
              USD / Bs 42.50
            </span>
          </div>
        </div>
      </div>

      {/* ===== Header Principal (Maison Lévrier) ===== */}
      <header className="sticky top-0 z-50 border-b border-[#1a2a46]/10 dark:border-white/10 bg-[#f0ede4]/90 dark:bg-[#111527]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo de Marca */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1a2a46] text-[#b2944a] shadow-xs transition-transform group-hover:scale-105">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl font-semibold tracking-tight text-[#111018] dark:text-slate-50 leading-none">
                Stockira
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#1a2a46]/70 dark:text-slate-400 mt-1">
                ERP · POS · KARDEX
              </span>
            </div>
          </Link>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#1a2a46]/75 dark:text-slate-300">
            <a href="#capacidades" className="hover:text-[#111018] dark:hover:text-white transition-colors">
              Módulos
            </a>
            <a href="#demostracion" className="hover:text-[#111018] dark:hover:text-white transition-colors">
              Vistas en Vivo
            </a>
            <a href="#precios" className="hover:text-[#111018] dark:hover:text-white transition-colors">
              Planes
            </a>
            <a href="#faq" className="hover:text-[#111018] dark:hover:text-white transition-colors">
              Preguntas
            </a>
          </nav>

          {/* Acciones del Header */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className={BTN_GHOST}
            >
              Acceder
            </Link>
            <Link
              href="/register"
              className={`${CTA_BRASS} px-4 py-2 text-xs sm:text-sm`}
            >
              <span>Probar Stockira</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ===== HERO SECTION ===== */}
        <section className="relative pt-16 pb-14 lg:pt-20 lg:pb-20 border-b border-[#1b1d21]/10 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Eyebrow con Brass Dot */}
            <div className="inline-flex items-center justify-center text-[11px] font-mono uppercase tracking-[0.2em] text-[#1b1d21]/65 dark:text-slate-400 mb-4 bg-white/70 dark:bg-slate-900/70 border border-[#1b1d21]/10 dark:border-white/10 px-4 py-1.5 rounded-full shadow-2xs">
              <span>Gestión de Inventario</span>
              <span className={BRASS_DOT} />
              <span>POS Multimoneda</span>
              <span className={BRASS_DOT} />
              <span>Sucursales</span>
            </div>

            {/* Título Display Fraunces */}
            <h1 className="mx-auto max-w-4xl font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1] text-[#111018] dark:text-slate-50">
              El control que tu negocio merece,{" "}
              <span className="italic font-normal text-[#b2944a]">sin planillas sueltas.</span>
            </h1>

            {/* Subtítulo */}
            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#1b1d21]/70 dark:text-slate-300 leading-relaxed font-sans">
              <strong className="font-semibold text-[#111018] dark:text-slate-100">Stockira</strong> unifica
              Kardex con costo ponderado en tiempo real, cobros en USD, Bs y USDT, arqueo de caja por turnos
              y control multi-sucursal con el lenguaje visual sobrio y rápido que tu equipo necesita.
            </p>

            {/* Botones de acción */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className={`${CTA_BRASS} px-6 py-3.5 text-sm sm:text-base w-full sm:w-auto`}
              >
                <span>Empezar prueba sin costo</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#demostracion"
                className={`${CTA_NAVY} px-6 py-3.5 text-sm sm:text-base w-full sm:w-auto`}
              >
                Ver paneles del sistema
              </a>
            </div>

            {/* Garantías sutiles */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-6 text-xs text-[#1b1d21]/60 dark:text-slate-400 font-mono">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#b2944a]" /> Sin tarjeta de crédito
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#b2944a]" /> Tasas de cambio en vivo
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#b2944a]" /> Multi-sucursal lista
              </span>
            </div>
          </div>
        </section>

        {/* ===== DEMOSTRACIÓN INTERACTIVA (VISTAS REALES DEL SISTEMA) ===== */}
        <section id="demostracion" className="py-16 border-b border-[#1b1d21]/10 dark:border-white/10 bg-[#f7f5f0]/60 dark:bg-slate-950/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className={EYEBROW}>
                  <span>DEMO INTERACTIVA</span>
                  <span className={BRASS_DOT} />
                  <span>VISTAS DEL SOFTWARE</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#111018] dark:text-slate-50">
                  Experimenta la interfaz de Stockira
                </h2>
              </div>

              {/* Selector de vistas */}
              <div className={`p-1.5 rounded-2xl flex items-center gap-1 ${GLASS}`}>
                <button
                  type="button"
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === "dashboard"
                      ? "bg-[#1a2a46] text-[#f0ede4] shadow-xs"
                      : "text-[#1a2a46]/70 dark:text-slate-300 hover:text-[#111018]"
                  }`}
                >
                  Dashboard Principal
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pos")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === "pos"
                      ? "bg-[#1a2a46] text-[#f0ede4] shadow-xs"
                      : "text-[#1a2a46]/70 dark:text-slate-300 hover:text-[#111018]"
                  }`}
                >
                  Punto de Venta (POS)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("productos")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === "productos"
                      ? "bg-[#1a2a46] text-[#f0ede4] shadow-xs"
                      : "text-[#1a2a46]/70 dark:text-slate-300 hover:text-[#111018]"
                  }`}
                >
                  Catálogo & Kardex
                </button>
              </div>
            </div>

            {/* MARCO DE VENTANA MAISON */}
            <div className={`rounded-2xl overflow-hidden ${CARD} p-0 shadow-xl border border-[#1b1d21]/15 dark:border-white/10`}>
              {/* Barra de cabecera de la ventana */}
              <div className="bg-[#f0ede4] dark:bg-[#111527] px-5 py-3 border-b border-[#1b1d21]/12 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#c63749]/70" />
                  <span className="h-3 w-3 rounded-full bg-[#b2944a]/70" />
                  <span className="h-3 w-3 rounded-full bg-[#128454]/70" />
                  <span className="ml-3 font-mono text-[11px] text-[#1b1d21]/60 dark:text-slate-400">
                    localhost:8088/dashboard{activeTab === "dashboard" ? "" : `/${activeTab}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#1a2a46] dark:text-[#b2944a] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#128454]" />
                  <span>Conexión Segura · Sincronizada</span>
                </div>
              </div>

              {/* CONTENIDO INTERNO SEGÚN TAB */}
              <div className="p-6 sm:p-8 bg-[#f0ede4]/30 dark:bg-slate-900/40">
                {/* 1. TAB DASHBOARD (Idéntico a /dashboard) */}
                {activeTab === "dashboard" && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h3 className="font-display text-3xl font-semibold text-[#111018] dark:text-slate-50">
                          Dashboard
                        </h3>
                        <p className="font-mono text-[11px] text-[#1b1d21]/65 dark:text-slate-400 mt-1">
                          DATOS EN VIVO · STOCKIRA ERP
                        </p>
                      </div>
                      <span className="font-mono text-[11px] text-[#1b1d21]/65 dark:text-slate-400 tnum">
                        {nowFormatted}
                      </span>
                    </div>

                    {/* Grilla de 4 KPIs Maison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className={CARD + " p-5"}>
                        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#1b1d21]/65 dark:text-slate-400">
                          Ventas hoy
                        </p>
                        <div className="mt-4 flex items-end justify-between gap-2">
                          <span className="font-mono text-[28px] sm:text-[32px] leading-none font-medium tnum text-[#1b1d21] dark:text-slate-50">
                            $2,450.00
                          </span>
                          <span className="font-mono text-[12px] tnum mb-1 flex items-center gap-0.5 text-[#128454]">
                            <ArrowUpRight className="h-3.5 w-3.5" /> +18.4%
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#1b1d21]/55 dark:text-slate-400">
                          24 ventas · vs ayer
                        </p>
                      </div>

                      <div className={CARD + " p-5"}>
                        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#1b1d21]/65 dark:text-slate-400">
                          Dinero en la calle
                        </p>
                        <div className="mt-4 flex items-end justify-between gap-2">
                          <span className="font-mono text-[28px] sm:text-[32px] leading-none font-medium tnum text-[#1b1d21] dark:text-slate-50">
                            $4,810.50
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#1b1d21]/55 dark:text-slate-400">
                          Saldo total por cobrar
                        </p>
                      </div>

                      <div className={CARD + " p-5"}>
                        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#1b1d21]/65 dark:text-slate-400">
                          Cuentas por cobrar
                        </p>
                        <div className="mt-4 flex items-end justify-between gap-2">
                          <span className="font-mono text-[28px] sm:text-[32px] leading-none font-medium tnum text-[#1b1d21] dark:text-slate-50">
                            8
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#1b1d21]/55 dark:text-slate-400">
                          Facturas abiertas
                        </p>
                      </div>

                      <div className={CARD + " p-5"}>
                        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#1b1d21]/65 dark:text-slate-400">
                          Pedidos pendientes
                        </p>
                        <div className="mt-4 flex items-end justify-between gap-2">
                          <span className="font-mono text-[28px] sm:text-[32px] leading-none font-medium tnum text-[#1b1d21] dark:text-slate-50">
                            5
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#1b1d21]/55 dark:text-slate-400">
                          En la bandeja de preparación
                        </p>
                      </div>
                    </div>

                    {/* Tabla de órdenes recientes estilo Maison */}
                    <div className={CARD}>
                      <div className={CARD_HEADER}>
                        <h4 className="font-semibold text-[15px] tracking-tight text-[#1b1d21] dark:text-slate-100">
                          Últimos Pedidos Confirmados
                        </h4>
                        <span className="font-mono text-[10px] text-[#1b1d21]/65 dark:text-slate-400 uppercase tracking-[0.14em]">
                          EN TIEMPO REAL
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={TABLE_HEAD}>
                              <th className="py-2.5 px-4 font-mono font-medium">PEDIDO</th>
                              <th className="py-2.5 px-4 font-mono font-medium">CLIENTE</th>
                              <th className="py-2.5 px-4 font-mono font-medium">ESTADO</th>
                              <th className="py-2.5 px-4 font-mono font-medium text-right">TOTAL USD</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1b1d21]/8 dark:divide-white/5 text-sm">
                            <tr className={TABLE_ROW}>
                              <td className="py-3 px-4 font-mono text-xs font-semibold text-[#1a2a46] dark:text-[#b2944a]">
                                #PED-0184
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                                Supermercado Gran Alianza
                              </td>
                              <td className="py-3 px-4">
                                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">
                                  Confirmado
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-semibold text-right tnum">
                                $340.00
                              </td>
                            </tr>
                            <tr className={TABLE_ROW}>
                              <td className="py-3 px-4 font-mono text-xs font-semibold text-[#1a2a46] dark:text-[#b2944a]">
                                #PED-0183
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                                Distribuidora Central Norte
                              </td>
                              <td className="py-3 px-4">
                                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-700 dark:text-indigo-300">
                                  Preparando
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-semibold text-right tnum">
                                $785.50
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. TAB POS (Idéntico a /dashboard/pos) */}
                {activeTab === "pos" && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <div className={EYEBROW}>
                          <span>SUCURSAL CENTRAL</span>
                          <span className={BRASS_DOT} />
                          <span>PUNTO DE VENTA</span>
                          <span className={BRASS_DOT} />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">TURNO ABIERTO</span>
                        </div>
                        <h3 className="font-display text-3xl font-semibold text-[#111018] dark:text-slate-50">
                          Punto de Venta
                        </h3>
                      </div>
                      <div className={`flex items-center gap-2.5 rounded-full px-4 h-11 ${GLASS}`}>
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-[#b2944a] opacity-60 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#b2944a]" />
                        </span>
                        <span className="font-mono text-sm tabular-nums text-[#111018] dark:text-slate-100">
                          10:45 AM
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          · USD = 42.50 Bs
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Grilla rápida de selección */}
                      <div className="lg:col-span-7 space-y-3">
                        <div className={`flex items-center gap-2 rounded-xl px-3.5 h-10 ${GLASS}`}>
                          <Search className="h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            readOnly
                            value="Café Especial..."
                            className="bg-transparent text-xs outline-none w-full text-slate-700 dark:text-slate-200"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className={CARD + " p-3.5 hover:border-[#b2944a]/50 transition-colors cursor-pointer"}>
                            <span className="font-mono text-[10px] text-slate-400 uppercase">SKU: CF-ESP-01</span>
                            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1">
                              Café Especial 1kg Grano
                            </p>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="font-mono font-bold text-sm text-[#1a2a46] dark:text-[#b2944a]">
                                $12.00
                              </span>
                              <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono px-2 py-0.5">
                                48 en stock
                              </span>
                            </div>
                          </div>

                          <div className={CARD + " p-3.5 hover:border-[#b2944a]/50 transition-colors cursor-pointer"}>
                            <span className="font-mono text-[10px] text-slate-400 uppercase">SKU: OLV-500</span>
                            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1">
                              Aceite Oliva Virgen 500ml
                            </p>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="font-mono font-bold text-sm text-[#1a2a46] dark:text-[#b2944a]">
                                $11.00
                              </span>
                              <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono px-2 py-0.5">
                                19 en stock
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Carrito de Cobro */}
                      <div className="lg:col-span-5">
                        <div className={`rounded-2xl p-5 ${GLASS}`}>
                          <div className="flex items-center justify-between pb-3 border-b border-[#1b1d21]/10 dark:border-white/10">
                            <span className="font-mono text-xs uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-300">
                              Ticket de Venta #00492
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              Cajero: Carlos
                            </span>
                          </div>

                          <div className="divide-y divide-[#1b1d21]/8 dark:divide-white/5 py-3 text-xs space-y-2">
                            <div className="flex justify-between items-center pt-2">
                              <span>Café Especial 1kg (x3)</span>
                              <span className="font-mono font-semibold">$36.00</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                              <span>Aceite Oliva Virgen (x1)</span>
                              <span className="font-mono font-semibold">$11.00</span>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-[#1b1d21]/10 dark:border-white/10">
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs uppercase font-mono tracking-wider text-slate-500">
                                Total USD:
                              </span>
                              <span className="font-mono text-2xl font-bold text-[#111018] dark:text-slate-50 tnum">
                                $47.00
                              </span>
                            </div>
                            <div className="flex justify-between items-baseline mt-1 text-xs text-slate-500 font-mono">
                              <span>Total en Bolívares:</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                Bs 1,997.50
                              </span>
                            </div>

                            <button
                              type="button"
                              className={`${CTA_BRASS} w-full mt-4 py-3 text-xs sm:text-sm`}
                            >
                              <span>Cobrar en Mostrador</span>
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. TAB PRODUCTOS & KARDEX (Idéntico a /dashboard/productos) */}
                {activeTab === "productos" && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <div className={EYEBROW}>
                          <span>INVENTARIO</span>
                          <span className={BRASS_DOT} />
                          <span>CATÁLOGO & VARIANTES</span>
                        </div>
                        <h3 className="font-display text-3xl font-semibold text-[#111018] dark:text-slate-50">
                          Productos y Kardex
                        </h3>
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold font-mono uppercase text-emerald-700 dark:text-emerald-300">
                        142 Ítems Controlados
                      </span>
                    </div>

                    <div className={CARD}>
                      <div className={CARD_HEADER}>
                        <h4 className="font-semibold text-[15px] tracking-tight text-[#1b1d21] dark:text-slate-100">
                          Catálogo General con Costo Promedio
                        </h4>
                        <span className="font-mono text-[10px] text-[#1b1d21]/65 dark:text-slate-400 uppercase tracking-[0.14em]">
                          TRAZABILIDAD TOTAL
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={TABLE_HEAD}>
                              <th className="py-2.5 px-4 font-mono font-medium">SKU / ARTÍCULO</th>
                              <th className="py-2.5 px-4 font-mono font-medium">ESTADO</th>
                              <th className="py-2.5 px-4 font-mono font-medium text-right">COSTO PROM.</th>
                              <th className="py-2.5 px-4 font-mono font-medium text-right">PRECIO VENTA</th>
                              <th className="py-2.5 px-4 font-mono font-medium text-right">STOCK</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1b1d21]/8 dark:divide-white/5 text-sm">
                            <tr className={TABLE_ROW}>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                                  Harina de Trigo Especial 25kg
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">SKU: HAR-25K-ESP</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                                  Activo
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-right tnum text-slate-600 dark:text-slate-400">
                                $14.20
                              </td>
                              <td className="py-3 px-4 font-mono font-semibold text-right tnum text-[#128454]">
                                $19.50
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-right tnum text-slate-900 dark:text-slate-100">
                                87 un
                              </td>
                            </tr>
                            <tr className={TABLE_ROW}>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                                  Azúcar Refinada Extra 50kg
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">SKU: AZU-50K-EXT</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                                  Stock Bajo
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-right tnum text-slate-600 dark:text-slate-400">
                                $32.00
                              </td>
                              <td className="py-3 px-4 font-mono font-semibold text-right tnum text-[#128454]">
                                $44.00
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-right tnum text-amber-600">
                                4 un
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===== CAPACIDADES DEL SISTEMA (GRID MAISON) ===== */}
        <section id="capacidades" className="py-20 border-b border-[#1b1d21]/10 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <div className={EYEBROW + " justify-center"}>
                <span>ARQUITECTURA DE MÓDULOS</span>
                <span className={BRASS_DOT} />
                <span>INTEGRACIÓN NATIVA</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#111018] dark:text-slate-50">
                Todo lo que tu comercio necesita para crecer
              </h2>
              <p className="mt-4 text-base text-[#1b1d21]/70 dark:text-slate-300">
                Módulos diseñados bajo una misma filosofía: rapidez de carga, consistencia contable
                y cero redundancia de datos.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((cap) => (
                <div
                  key={cap.title}
                  className={`${CARD} p-6 hover:border-[#b2944a]/40 transition-all flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2a46] text-[#b2944a]">
                      <cap.icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#b2944a] font-semibold mt-4 block">
                      {cap.section}
                    </span>
                    <h3 className="font-display text-lg font-semibold text-[#111018] dark:text-slate-100 mt-1">
                      {cap.title}
                    </h3>
                    <p className="mt-2 text-sm text-[#1b1d21]/65 dark:text-slate-400 leading-relaxed font-sans">
                      {cap.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PLANES Y PRECIOS (MAISON PRICING) ===== */}
        <section id="precios" className="py-20 border-b border-[#1b1d21]/10 dark:border-white/10 bg-[#f7f5f0]/40 dark:bg-slate-950/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className={EYEBROW + " justify-center"}>
                <span>PLANES TRANSPARENTES</span>
                <span className={BRASS_DOT} />
                <span>SIN CONTRATOS ATADOS</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#111018] dark:text-slate-50">
                Inversión simple para tu negocio
              </h2>
              <p className="mt-3 text-sm text-[#1b1d21]/70 dark:text-slate-400">
                Precios mensuales por suscripción. Puedes escalar sucursales o usuarios cuando lo necesites.
              </p>
            </div>

            {plansState === "loading" && (
              <div className="mt-12 text-center text-sm font-mono text-slate-400">
                Cargando planes de suscripción…
              </div>
            )}

            {plansState === "ready" && (
              <div className="mt-12 grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto items-stretch">
                {plans.map((plan, idx) => {
                  const isFeatured = idx === 1 || plan.badge === "Más elegido";
                  return (
                    <article
                      key={plan.id}
                      className={`${CARD} p-7 flex flex-col justify-between relative transition-all ${
                        isFeatured
                          ? "border-2 border-[#b2944a] shadow-lg dark:border-[#b2944a] scale-[1.02] z-10"
                          : "border border-[#1b1d21]/12 dark:border-white/10"
                      }`}
                    >
                      {plan.badge && (
                        <div className="absolute -top-3 left-6">
                          <span
                            className={`rounded-full px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] ${
                              isFeatured
                                ? "bg-[#b2944a] text-[#111018] shadow-xs"
                                : "bg-[#1a2a46] text-[#f0ede4]"
                            }`}
                          >
                            {plan.badge}
                          </span>
                        </div>
                      )}

                      <div>
                        <h3 className="font-display text-xl font-semibold text-[#111018] dark:text-slate-50 mt-1">
                          {plan.name}
                        </h3>
                        {plan.description && (
                          <p className="mt-2 text-xs text-[#1b1d21]/60 dark:text-slate-400 leading-relaxed">
                            {plan.description}
                          </p>
                        )}

                        <div className="mt-6 flex items-baseline gap-1">
                          <span className="font-mono text-4xl font-semibold text-[#111018] dark:text-slate-50 tnum">
                            ${Number(plan.price).toFixed(2)}
                          </span>
                          <span className="font-mono text-xs text-slate-500">/mes</span>
                        </div>

                        {plan.content?.capacity && (
                          <div className="mt-4 p-2.5 rounded-xl bg-[#f0ede4] dark:bg-slate-800/60 border border-[#1b1d21]/10 dark:border-white/5 font-mono text-[11px] text-[#1a2a46] dark:text-slate-300">
                            <strong>{plan.content.capacity.maxBranches}</strong> sucursal(es) ·{" "}
                            <strong>{plan.content.capacity.includedSeats}</strong> usuario(s)
                          </div>
                        )}

                        <ul className="mt-6 space-y-2.5 text-xs text-[#1b1d21]/75 dark:text-slate-300 font-sans">
                          {(plan.content?.features ?? []).map((feature) => (
                            <li key={feature} className="flex items-start gap-2.5">
                              <ShieldCheck className="h-4 w-4 shrink-0 text-[#b2944a] mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-8 pt-4 border-t border-[#1b1d21]/10 dark:border-white/10">
                        <Link
                          href="/register"
                          className={`${isFeatured ? CTA_BRASS : CTA_NAVY} w-full py-3 text-xs sm:text-sm`}
                        >
                          Elegir {plan.name}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ===== PREGUNTAS FRECUENTES (FAQ MAISON) ===== */}
        <section id="faq" className="py-20 border-b border-[#1b1d21]/10 dark:border-white/10">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <div className={EYEBROW + " justify-center"}>
                <span>RESOLUCIÓN DE DUDAS</span>
                <span className={BRASS_DOT} />
                <span>PREGUNTAS FRECUENTES</span>
              </div>
              <h2 className="font-display text-3xl font-semibold text-[#111018] dark:text-slate-50">
                Todo lo que necesitas saber
              </h2>
            </div>

            <div className="mt-10 space-y-3">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={faq.q}
                    className={`${CARD} overflow-hidden transition-all`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-[#111018] dark:text-slate-100 hover:text-[#b2944a] transition-colors"
                    >
                      <span className="font-sans">{faq.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform ${
                          isOpen ? "rotate-180 text-[#b2944a]" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm text-[#1b1d21]/70 dark:text-slate-300 leading-relaxed border-t border-[#1b1d21]/8 dark:border-white/5 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== BANNER FINAL DE CONVERSIÓN (NAVY + BRASS) ===== */}
        <section className="bg-[#1a2a46] text-[#f0ede4] py-20 relative overflow-hidden">
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#b2944a] mb-4">
              <span>PRODUCCIÓN Y CONTROL</span>
              <span className="inline-block w-[3px] h-[3px] rounded-full bg-[#b2944a]" />
              <span>STOCKIRA ERP</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#f0ede4]">
              Comienza hoy a operar con Stockira
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
              Crea tu organización, activa tus sucursales y toma el control riguroso de tus ventas,
              cajas e inventarios desde una sola plataforma.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className={`${CTA_BRASS} px-7 py-3.5 text-sm sm:text-base`}
              >
                <span>Crear cuenta de negocio</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-6 py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ===== FOOTER MAISON ===== */}
      <footer className="border-t border-[#1a2a46]/10 dark:border-white/10 bg-[#f0ede4] dark:bg-[#111527] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-[#1a2a46]/10 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1a2a46] text-[#b2944a]">
                <Boxes className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-semibold tracking-tight text-[#111018] dark:text-slate-100">
                Stockira
              </span>
              <span className="font-mono text-xs text-[#1a2a46]/60 dark:text-slate-400">
                · Sistema Operativo Comercial
              </span>
            </div>

            <nav className="flex flex-wrap items-center gap-6 text-xs sm:text-sm font-medium text-[#1a2a46]/70 dark:text-slate-400">
              <a href="#capacidades" className="hover:text-[#111018] dark:hover:text-white">Módulos</a>
              <a href="#demostracion" className="hover:text-[#111018] dark:hover:text-white">Vistas</a>
              <a href="#precios" className="hover:text-[#111018] dark:hover:text-white">Planes</a>
              <Link href="/terms" className="hover:text-[#111018] dark:hover:text-white">Términos</Link>
              <Link href="/privacy" className="hover:text-[#111018] dark:hover:text-white">Privacidad</Link>
              <Link href="/login" className="hover:text-[#111018] dark:hover:text-white font-semibold">Acceder</Link>
            </nav>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#1a2a46]/60 dark:text-slate-400 font-mono">
            <p>© {new Date().getFullYear()} Stockira. Todos los derechos reservados.</p>
            <p className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-[#b2944a]" />
              <span>Multi-sucursal, rutas de entrega y despachos por encomienda.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
