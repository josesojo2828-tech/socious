"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { LandingData, LANDING_DATA_FALLBACK } from "@/app/api/landing-data/route";
import { PricingSection } from "@/features/public/components/PricingSection";

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path fillRule="evenodd" clipRule="evenodd" d="M12.012 2C6.486 2 2 6.479 2 12.005c0 2.13.663 4.103 1.794 5.727L2.1 21.901l4.316-1.666a9.96 9.96 0 005.596 1.776c5.526 0 10.012-4.479 10.012-10.006C22.024 6.479 17.538 2 12.012 2zm.006 18.012a7.973 7.973 0 01-4.321-1.266l-.31-.197-2.556.986.998-2.493-.207-.328a7.962 7.962 0 01-1.397-4.709c0-4.425 3.593-8.024 8.012-8.024 4.42 0 8.013 3.599 8.013 8.024 0 4.426-3.593 8.007-8.242 8.007zm4.398-5.992c-.241-.121-1.425-.703-1.646-.783-.221-.08-.382-.121-.543.121-.161.242-.623.783-.764.944-.141.161-.282.181-.523.06-.241-.121-1.019-.375-1.942-1.198-.718-.64-1.203-1.43-1.344-1.672-.141-.242-.015-.373.106-.493.109-.109.241-.282.362-.423.121-.141.161-.242.241-.403.08-.161.04-.302-.02-.423-.06-.121-.543-1.31-.744-1.794-.195-.47-.393-.406-.543-.414l-.463-.008c-.161 0-.422.06-.643.302-.221.242-.844.826-.844 2.015 0 1.189.865 2.337.985 2.498.121.161 1.705 2.603 4.13 3.652.577.249 1.028.398 1.38.51.58.184 1.107.158 1.524.096.465-.07 1.425-.583 1.626-1.148.201-.565.201-1.048.141-1.148-.06-.101-.221-.182-.462-.303z" />
    </svg>
  );
}

export default function LandingPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [landingData, setLandingData] = useState<LandingData>(LANDING_DATA_FALLBACK);

  useEffect(() => {
    async function loadLandingData() {
      try {
        const res = await fetch("/api/landing-data");
        if (res.ok) {
          const data: LandingData = await res.json();
          setLandingData(data);
        }
      } catch (err) {
        console.warn("Using fallback landing data due to fetch error:", err);
      }
    }
    loadLandingData();
  }, []);

  const proPlan = landingData.plans.find((p) => p.id === "pro") || landingData.plans[0];
  const premiumPlan = landingData.plans.find((p) => p.id === "premium") || landingData.plans[1];
  const clinicaPlan = landingData.plans.find((p) => p.id === "clinica") || landingData.plans[2];

  const baseFeatures = landingData.comparisonFeatures.filter((f) => f.category === "base");
  const proFeatures = landingData.comparisonFeatures.filter((f) => f.category === "pro");
  const clinicFeatures = landingData.comparisonFeatures.filter((f) => f.category === "clinic");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://nutringest.com/#software",
        "name": "Software para Nutricionistas y Clínicas | Nutringest",
        "operatingSystem": "Web, iOS, Android",
        "applicationCategory": "HealthApplication",
        "description":
          "Nutringest es el software para nutricionistas y clínicas líder. Herramienta para nutricionistas y clínicas, software para clínicas de nutrición, programa para nutricionistas y plataforma para consultorios nutricionales.",
        "url": "https://nutringest.com",
        "keywords": [
          "Software para nutricionistas",
          "Herramienta para nutricionistas y clínicas",
          "Software para clínicas de nutrición",
          "Programa para nutricionistas",
          "Plataforma para consultorios nutricionales",
          "antropometría ISAK",
          "calculadora nutricional",
          "gestión de consultorios nutricionales"
        ],
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
        },
      },
      {
        "@type": "MedicalBusiness",
        "@id": "https://nutringest.com/#organization",
        "name": "Nutringest | Herramienta para Nutricionistas y Clínicas",
        "url": "https://nutringest.com",
        "logo": "https://nutringest.com/source/logo.jpg",
        "description":
          "Software integral de nutrición clínica, programa para nutricionistas y plataforma para consultorios nutricionales y clínicas de nutrición.",
        "keywords": [
          "Software para nutricionistas",
          "Herramienta para nutricionistas y clínicas",
          "Software para clínicas de nutrición",
          "Programa para nutricionistas",
          "Plataforma para consultorios nutricionales"
        ]
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
    @import url('https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/regular/style.css');

    #ng-root { font-family: 'Montserrat', ui-sans-serif, system-ui, sans-serif; }

    #ng-root[data-theme="light"] {
      --ng-bg: #ffffff;
      --ng-soft: #f7f6fb;
      --ng-surface: #ffffff;
      --ng-border: #e8e5f2;
      --ng-ink: #14101f;
      --ng-muted: #6d6784;
      --ng-primary: #5b21b6;
      --ng-primary-fg: #ffffff;
      --ng-accent: #7c3aed;
      --ng-tint: #f3f0fb;
      --ng-tint-ink: #4c1d95;
      --ng-blue: #0ea5e9;
      --ng-ink-band: #14101f;
      --ng-band-ink: #f5f3fb;
      --ng-band-muted: #a9a2c0;
      --ng-band-border: transparent;
      --ng-shadow-card: 0 20px 50px -34px rgba(20, 16, 31, 0.45);
    }
    #ng-root[data-theme="dark"] {
      --ng-bg: #0d0a15;
      --ng-soft: #130f20;
      --ng-surface: #16112a;
      --ng-border: #2b2442;
      --ng-ink: #f4f2fb;
      --ng-muted: #a49dbe;
      --ng-primary: #7c3aed;
      --ng-primary-fg: #ffffff;
      --ng-accent: #b79bff;
      --ng-tint: #1e1735;
      --ng-tint-ink: #cbb6ff;
      --ng-blue: #38bdf8;
      --ng-ink-band: #1c1633;
      --ng-band-ink: #f5f3fb;
      --ng-band-muted: #a9a2c0;
      --ng-band-border: #322a4d;
      --ng-shadow-card: 0 20px 50px -34px rgba(0, 0, 0, 0.85);
    }

    #ng-root .ng-glass {
      background-color: color-mix(in srgb, var(--ng-bg) 88%, transparent);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    #ng-root .ng-logo-white { display: none; }
    #ng-root[data-theme="dark"] .ng-logo-brand { display: none; }
    #ng-root[data-theme="dark"] .ng-logo-white { display: block; }


    #ng-root summary { list-style: none; cursor: pointer; }
    #ng-root summary::-webkit-details-marker { display: none; }
    #ng-root details[open] .ng-faq-plus { display: none; }
    #ng-root details:not([open]) .ng-faq-minus { display: none; }

    html { scroll-behavior: smooth; }` }} />
      <div className="min-h-screen bg-[var(--ng-bg)] text-[var(--ng-ink)]" data-kid="1" data-name="page layout container" data-theme={resolvedTheme || 'light'} id="ng-root">
    
    {/* ===== NAVBAR (fijo al hacer scroll) ===== */}
    <header className="ng-glass sticky top-0 z-40 border-b border-[var(--ng-border)]" data-kid="1-1" data-name="sticky navigation bar">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10" data-kid="1-1-1" data-name="navbar layout container">
            <a className="flex shrink-0 items-center" data-kid="1-1-1-1" data-name="brand logo link" href="#inicio">
                <img alt="Nutringest" className="ng-logo-brand h-8 sm:h-10 w-auto" data-kid="1-1-1-1-1" data-name="brand color logo image" src="/png/ImagotipoPurpura.png"/>
                <img alt="Nutringest" className="ng-logo-white h-8 sm:h-10 w-auto" data-kid="1-1-1-1-2" data-name="brand white logo image" src="/png/ImagotipoBlanco.png"/>
            </a>
            <nav aria-label="Secciones" className="hidden items-center gap-1 md:flex lg:gap-1.5" data-kid="1-1-1-2" data-name="navbar navigation links">
                <a className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--ng-muted)] transition-all hover:bg-[var(--ng-soft)] hover:text-[var(--ng-ink)]" data-kid="1-1-1-2-5" data-name="home navigation link" href="#inicio">
                    <i className="ph ph-house text-[15px]" aria-hidden="true" />
                    <span>Inicio</span>
                </a>
                <a className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--ng-muted)] transition-all hover:bg-[var(--ng-soft)] hover:text-[var(--ng-ink)]" data-kid="1-1-1-2-1" data-name="functions navigation link" href="#funciones">
                    <i className="ph ph-lightning text-[15px]" aria-hidden="true" />
                    <span>Funciones</span>
                </a>
                <a className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--ng-muted)] transition-all hover:bg-[var(--ng-soft)] hover:text-[var(--ng-ink)]" data-kid="1-1-1-2-6" data-name="calculator navigation link" href="/calculadora">
                    <i className="ph ph-calculator text-[15px]" aria-hidden="true" />
                    <span>Calculadora</span>
                </a>
                <a className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--ng-muted)] transition-all hover:bg-[var(--ng-soft)] hover:text-[var(--ng-ink)]" data-kid="1-1-1-2-3" data-name="plans navigation link" href="#planes">
                    <i className="ph ph-tag text-[15px]" aria-hidden="true" />
                    <span>Planes</span>
                </a>
                <a className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--ng-muted)] transition-all hover:bg-[var(--ng-soft)] hover:text-[var(--ng-ink)]" data-kid="1-1-1-2-2" data-name="campus navigation link" href="#campus">
                    <i className="ph ph-graduation-cap text-[15px]" aria-hidden="true" />
                    <span>Campus</span>
                </a>
                <a className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--ng-muted)] transition-all hover:bg-[var(--ng-soft)] hover:text-[var(--ng-ink)]" data-kid="1-1-1-2-4" data-name="faq navigation link" href="#faq">
                    <i className="ph ph-question text-[15px]" aria-hidden="true" />
                    <span>FAQ</span>
                </a>
            </nav>
            <div className="flex items-center gap-2.5" data-kid="1-1-1-3" data-name="navbar actions container">
                <button aria-label="Cambiar entre modo claro y oscuro" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ng-border)] text-[var(--ng-ink)] transition-colors hover:bg-[var(--ng-soft)]" data-kid="1-1-1-3-1" data-name="theme toggle button" id="ng-theme-toggle" onClick={() => setTheme(isDark ? 'light' : 'dark')} type="button">
                    {isDark ? <i className="ph ph-sun text-[18px] text-amber-400" /> : <i className="ph ph-moon text-[18px] text-indigo-600" />}
                </button>
                <a className="hidden text-[13px] font-semibold text-[var(--ng-muted)] transition-colors hover:text-[var(--ng-ink)] sm:inline-block" data-kid="1-1-1-3-2" data-name="login navigation link" href="/login">
                    Iniciar sesión
                </a>
                <a className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ng-primary)] px-5 py-2.5 text-[13px] font-bold text-[var(--ng-primary-fg)] transition-transform hover:-translate-y-0.5" data-kid="1-1-1-3-3" data-name="free trial cta button" href="/register">
                    <span data-kid="1-1-1-3-3-1" data-name="free trial cta button text">
                        Prueba gratis
                    </span>
                    <i className="ph ph-arrow-right text-[14px]" data-kid="1-1-1-3-3-2" data-name="arrow right icon">
                    </i>
                </a>
            </div>
        </div>
    </header>
    {/* ===== HERO ===== */}
    <section className="mx-auto max-w-[1180px] scroll-mt-24 px-6 pt-16 pb-20 lg:px-10 lg:pt-24 lg:pb-24" data-kid="1-2" data-name="hero section" id="inicio">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14" data-kid="1-2-1" data-name="hero content grid">
            <div className="lg:col-span-6" data-kid="1-2-1-1" data-name="hero text content container">
                <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-muted)]" data-kid="1-2-1-1-1" data-name="hero tag line container">
                    <span className="inline-block h-px w-10 bg-[var(--ng-accent)]" data-kid="1-2-1-1-1-1" data-name="decorative accent line">
                    </span>
                    Software para nutricionistas
                </p>
                <h1 className="mt-7 text-[2.4rem] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--ng-ink)] sm:text-[3rem] lg:text-[3.4rem]" data-kid="1-2-1-1-2" data-name="hero headline text">
                    Software para nutricionistas y clínicas: prepará el plan, medí y gestioná tu consultorio.
                </h1>
                <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-[var(--ng-muted)]" data-kid="1-2-1-1-3" data-name="hero description text">
                    Nutringest ordena el día a día de tu consulta: antecedentes y pacientes, evaluación antropométrica, menús e intercambios, y un portal donde tu paciente ve su plan.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4" data-kid="1-2-1-1-4" data-name="hero cta group">
                    <a className="inline-flex items-center gap-2 rounded-full bg-[var(--ng-primary)] px-7 py-3.5 text-[15px] font-bold text-[var(--ng-primary-fg)] transition-transform hover:-translate-y-0.5" data-kid="1-2-1-1-4-1" data-name="hero primary cta button" href="/register">
                        <span data-kid="1-2-1-1-4-1-1" data-name="hero primary cta text">
                            Comenzar prueba de 14 días
                        </span>
                        <i className="ph ph-arrow-right text-[15px]" data-kid="1-2-1-1-4-1-2" data-name="right arrow icon">
                        </i>
                    </a>
                    <a className="text-[15px] font-bold text-[var(--ng-ink)] underline decoration-[var(--ng-accent)] decoration-2 underline-offset-[7px]" data-kid="1-2-1-1-4-2" data-name="hero secondary cta link" href="#funciones">
                        Ver qué incluye
                    </a>
                </div>
                <p className="mt-6 text-[13px] font-medium text-[var(--ng-muted)]" data-kid="1-2-1-1-5" data-name="hero disclaimer text">
                    14 días con todas las funciones de PREMIUM. Sin tarjeta de crédito.
                </p>
            </div>
            <div className="lg:col-span-6" data-kid="1-2-1-2" data-name="hero image grid">
                <div className="grid gap-4 lg:grid-cols-5 lg:gap-5" data-kid="1-2-1-2-1" data-name="hero image layout container">
                    <img alt="Nutricionista durante una consulta real con una paciente" className="h-[320px] w-full rounded-[28px] object-cover sm:h-[420px] lg:col-span-3 lg:h-[530px]" data-kid="1-2-1-2-1-1" data-name="main hero image" decoding="async" loading="lazy" src="https://images.unsplash.com/photo-1675270745543-883eae091a5c?auto=format&fit=crop&w=1400&q=80"/>
                    <div className="grid gap-4 lg:col-span-2 lg:gap-5" data-kid="1-2-1-2-1-2" data-name="secondary image layout container">
                        <img alt="Consulta nutricional con registros sobre la mesa" className="h-[200px] w-full rounded-2xl object-cover lg:h-[252px]" data-kid="1-2-1-2-1-2-1" data-name="secondary hero image" decoding="async" loading="lazy" src="https://images.pexels.com/photos/15319020/pexels-photo-15319020.jpeg?auto=compress&cs=tinysrgb&w=900"/>
                        <div className="flex flex-col justify-between rounded-2xl bg-[var(--ng-tint)] p-6 lg:h-[252px]" data-kid="1-2-1-2-1-2-2" data-name="hero pricing badge container">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ng-tint-ink)]" data-kid="1-2-1-2-1-2-2-1" data-name="hero pricing badge label">
                                {proPlan.badge} vigente
                            </span>
                            <div data-kid="1-2-1-2-1-2-2-2" data-name="hero pricing details container">
                                <p className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-[var(--ng-ink)]" data-kid="1-2-1-2-1-2-2-2-1" data-name="hero pro price text">
                                    {proPlan.name} desde {proPlan.price}
                                    <span className="ml-1 text-[13px] font-semibold text-[var(--ng-muted)]" data-kid="1-2-1-2-1-2-2-2-1-1" data-name="hero per month text">
                                        /mes
                                    </span>
                                </p>
                                <a className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--ng-tint-ink)]" data-kid="1-2-1-2-1-2-2-2-2" data-name="hero pricing plans link" href="#planes">
                                    <span data-kid="1-2-1-2-1-2-2-2-2-1" data-name="hero pricing plans text">
                                        Ver los {landingData.plans.length} planes
                                    </span>
                                    <i className="ph ph-arrow-right text-[13px]" data-kid="1-2-1-2-1-2-2-2-2-2" data-name="hero pricing plans arrow icon">
                                    </i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    {/* ===== CTA + MÉTRICAS ===== */}
    <section className="scroll-mt-24 border-y border-[var(--ng-border)] bg-[var(--ng-soft)]" data-kid="1-3" data-name="cta metrics section" id="empezar">
        <div className="mx-auto max-w-[1180px] px-6 py-20 lg:px-10 lg:py-24" data-kid="1-3-1" data-name="cta section content container">
            <div className="grid gap-14 lg:grid-cols-12 lg:gap-16" data-kid="1-3-1-1" data-name="cta metrics grid">
                <div className="lg:col-span-5" data-kid="1-3-1-1-1" data-name="cta text content container">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]" data-kid="1-3-1-1-1-1" data-name="cta tag line">
                        Comenzá hoy
                    </p>
                    <h2 className="mt-5 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[2.4rem]" data-kid="1-3-1-1-1-2" data-name="cta headline text">
                        La herramienta para nutricionistas y clínicas completa: probá el plan y decidí después.
                    </h2>
                    <p className="mt-5 text-[15.5px] leading-relaxed text-[var(--ng-muted)]" data-kid="1-3-1-1-1-3" data-name="cta description text">
                        Lo que antes copiabas a mano, ahora sale calculado: medidas, intercambios y listas de compras desde el mismo paciente. Menos trabajo repetitivo, más tiempo en la consulta.
                    </p>
                    <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4" data-kid="1-3-1-1-1-4" data-name="cta button group">
                        <a className="inline-flex items-center gap-2 rounded-full bg-[var(--ng-primary)] px-7 py-3.5 text-[15px] font-bold text-[var(--ng-primary-fg)] transition-transform hover:-translate-y-0.5" data-kid="1-3-1-1-1-4-1" data-name="cta primary button" href="/register">
                            <span data-kid="1-3-1-1-1-4-1-1" data-name="cta primary button text">
                                Comenzar prueba de 14 días
                            </span>
                            <i className="ph ph-arrow-right text-[15px]" data-kid="1-3-1-1-1-4-1-2" data-name="right arrow icon">
                            </i>
                        </a>
                        <a className="text-[15px] font-bold text-[var(--ng-ink)] underline decoration-[var(--ng-accent)] decoration-2 underline-offset-[7px]" data-kid="1-3-1-1-1-4-2" data-name="cta secondary link" href="#campus">
                            Solicitar acceso Campus
                        </a>
                    </div>
                </div>
                <div className="lg:col-span-7" data-kid="1-3-1-1-2" data-name="metrics grid container">
                    <div className="grid grid-cols-1 sm:grid-cols-2" data-kid="1-3-1-1-2-1" data-name="metrics card grid">
                        {landingData.metrics.map((metric, idx) => (
                          <div
                            key={metric.id}
                            className={`border-t border-[var(--ng-border)] py-7 ${
                              idx % 2 === 1 ? "sm:border-l sm:pl-10" : "sm:pr-10"
                            }`}
                            data-kid={`1-3-1-1-2-1-${idx + 1}`}
                            data-name={`metric card ${metric.id}`}
                          >
                            <p className="text-[2.4rem] font-extrabold leading-none tracking-[-0.04em] text-[var(--ng-ink)]" data-kid={`1-3-1-1-2-1-${idx + 1}-1`} data-name="metric value text">
                              {metric.value}
                            </p>
                            <p className="mt-3 text-[14px] font-bold text-[var(--ng-ink)]" data-kid={`1-3-1-1-2-1-${idx + 1}-2`} data-name="metric label text">
                              {metric.label}
                            </p>
                            <p className="mt-1 text-[12.5px] text-[var(--ng-muted)]" data-kid={`1-3-1-1-2-1-${idx + 1}-3`} data-name="metric description text">
                              {metric.description}
                            </p>
                          </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </section>
    {/* ===== FUNCIONES / PASOS ===== */}
    <section className="mx-auto max-w-[1180px] scroll-mt-24 px-6 py-20 lg:px-10 lg:py-24" data-kid="1-4" data-name="features section" id="funciones">
        <div className="max-w-2xl" data-kid="1-4-1" data-name="features section header">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]" data-kid="1-4-1-1" data-name="features tag line">
                Funciones clave
            </p>
            <h2 className="mt-5 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[2.4rem]" data-kid="1-4-1-2" data-name="features headline text">
                El software para nutricionistas con todo tu flujo de trabajo en una sola pantalla.
            </h2>
            <p className="mt-5 text-[15.5px] leading-relaxed text-[var(--ng-muted)]" data-kid="1-4-1-3" data-name="features description text">
                Desde que el paciente entra hasta que se lleva su plan alimentario y su lista de compras, todo queda registrado y conectado.
            </p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-12" data-kid="1-4-2" data-name="features grid container">
            {/* PASO 01 */}
            <article className="rounded-3xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-8 lg:col-span-7" data-kid="1-4-2-1" data-name="feature card step one">
                <div className="flex items-baseline justify-between gap-4" data-kid="1-4-2-1-1" data-name="feature card header">
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]" data-kid="1-4-2-1-1-1" data-name="feature step label">
                        {landingData.features.steps[0]?.label || "Paso 01"}
                    </span>
                    <i className={`ph ${landingData.features.steps[0]?.icon || "ph-clipboard-text"} text-[22px] text-[var(--ng-border)]`} data-kid="1-4-2-1-1-2" data-name="step icon">
                    </i>
                </div>
                <h3 className="mt-5 text-[1.55rem] font-extrabold leading-tight tracking-[-0.02em]" data-kid="1-4-2-1-2" data-name="feature title text">
                    {landingData.features.steps[0]?.title || "Registrá la consulta y a tus pacientes"}
                </h3>
                <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[var(--ng-muted)]" data-kid="1-4-2-1-3" data-name="feature description text">
                    {landingData.features.steps[0]?.description || "Antecedentes e historias clínicas en un mismo lugar, sin planillas sueltas ni cuadernos paralelos."}
                </p>
                <ul className="mt-6 space-y-2.5 border-t border-[var(--ng-border)] pt-6" data-kid="1-4-2-1-4" data-name="feature checklist container">
                    {landingData.features.steps[0]?.checklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[14.5px]" data-kid={`1-4-2-1-4-${i+1}`}>
                          <i className="ph ph-check mt-0.5 text-[var(--ng-accent)]" />
                          <span>{item}</span>
                      </li>
                    ))}
                </ul>
            </article>
            {/* PASO 02 */}
            <article className="rounded-3xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-8 lg:col-span-5" data-kid="1-4-2-2" data-name="feature card step two">
                <div className="flex items-baseline justify-between gap-4" data-kid="1-4-2-2-1" data-name="feature card header">
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]" data-kid="1-4-2-2-1-1" data-name="feature step label">
                        {landingData.features.steps[1]?.label || "Paso 02"}
                    </span>
                    <i className={`ph ${landingData.features.steps[1]?.icon || "ph-ruler"} text-[22px] text-[var(--ng-border)]`} data-kid="1-4-2-2-1-2" data-name="step icon">
                    </i>
                </div>
                <h3 className="mt-5 text-[1.55rem] font-extrabold leading-tight tracking-[-0.02em]" data-kid="1-4-2-2-2" data-name="feature title text">
                    {landingData.features.steps[1]?.title || "Medí con método"}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--ng-muted)]" data-kid="1-4-2-2-3" data-name="feature description text">
                    {landingData.features.steps[1]?.description || "Las mediciones y los cálculos salen de la plataforma, no de una calculadora aparte."}
                </p>
                <ul className="mt-6 space-y-2.5 border-t border-[var(--ng-border)] pt-6" data-kid="1-4-2-2-4" data-name="feature checklist container">
                    {landingData.features.steps[1]?.checklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[14.5px]" data-kid={`1-4-2-2-4-${i+1}`}>
                          <i className="ph ph-check mt-0.5 text-[var(--ng-accent)]" />
                          <span>{item}</span>
                      </li>
                    ))}
                </ul>
            </article>
            {/* PASO 03 */}
            <article className="overflow-hidden rounded-3xl border border-[var(--ng-border)] bg-[var(--ng-surface)] lg:col-span-12" data-kid="1-4-2-3" data-name="feature card step three full width">
                <div className="grid lg:grid-cols-12" data-kid="1-4-2-3-1" data-name="feature card inner layout">
                    <div className="p-8 lg:col-span-5 lg:p-10" data-kid="1-4-2-3-1-1" data-name="feature content container">
                        <div className="flex items-baseline justify-between gap-4" data-kid="1-4-2-3-1-1-1" data-name="feature header">
                            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]" data-kid="1-4-2-3-1-1-1-1" data-name="feature step label">
                                {landingData.features.steps[2]?.label || "Paso 03"}
                            </span>
                            <i className={`ph ${landingData.features.steps[2]?.icon || "ph-fork-knife"} text-[22px] text-[var(--ng-border)]`} data-kid="1-4-2-3-1-1-1-2" data-name="step icon">
                            </i>
                        </div>
                        <h3 className="mt-5 text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] lg:text-[2rem]" data-kid="1-4-2-3-1-1-2" data-name="feature title text">
                            {landingData.features.steps[2]?.title || "Armá el plan alimentario y las compras"}
                        </h3>
                        <p className="mt-3 text-[15px] leading-relaxed text-[var(--ng-muted)]" data-kid="1-4-2-3-1-1-3" data-name="feature description text">
                            {landingData.features.steps[2]?.description || "El menú, los intercambios y la lista de compras se generan desde el mismo plan y salen listos para entregar."}
                        </p>
                        <ul className="mt-6 space-y-3 border-t border-[var(--ng-border)] pt-6" data-kid="1-4-2-3-1-1-4" data-name="feature checklist container">
                            {landingData.features.steps[2]?.checklist.map((item, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-[14.5px]" data-kid={`1-4-2-3-1-1-4-${i+1}`}>
                                  <i className="ph ph-check mt-0.5 text-[var(--ng-accent)]" />
                                  <span>{item}</span>
                              </li>
                            ))}
                        </ul>
                    </div>
                    <div className="lg:col-span-7" data-kid="1-4-2-3-1-2" data-name="feature image container">
                        <img alt="Plan alimentario" className="h-[240px] w-full object-cover lg:h-full" data-kid="1-4-2-3-1-2-1" decoding="async" loading="lazy" src={landingData.features.steps[2]?.image || "https://images.pexels.com/photos/15319038/pexels-photo-15319038.jpeg?auto=compress&cs=tinysrgb&w=1400"}/>
                    </div>
                </div>
            </article>
            {/* PASO 04 */}
            <article className="rounded-3xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-8 lg:col-span-7" data-kid="1-4-2-4" data-name="feature card step four">
                <div className="flex items-baseline justify-between gap-4" data-kid="1-4-2-4-1" data-name="feature card header">
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]" data-kid="1-4-2-4-1-1" data-name="feature step label">
                        {landingData.features.steps[3]?.label || "Paso 04"}
                    </span>
                    <i className={`ph ${landingData.features.steps[3]?.icon || "ph-device-mobile"} text-[22px] text-[var(--ng-border)]`} data-kid="1-4-2-4-1-2" data-name="step icon">
                    </i>
                </div>
                <h3 className="mt-5 text-[1.55rem] font-extrabold leading-tight tracking-[-0.02em]" data-kid="1-4-2-4-2" data-name="feature title text">
                    {landingData.features.steps[3]?.title || "Compartí el plan y seguí de cerca"}
                </h3>
                <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[var(--ng-muted)]" data-kid="1-4-2-4-3" data-name="feature description text">
                    {landingData.features.steps[3]?.description || "Tu paciente entra a ver su plan y vos retomás la consulta con el historial completo a mano."}
                </p>
                <ul className="mt-6 space-y-2.5 border-t border-[var(--ng-border)] pt-6" data-kid="1-4-2-4-4" data-name="feature checklist container">
                    {landingData.features.steps[3]?.checklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[14.5px]" data-kid={`1-4-2-4-4-${i+1}`}>
                          <i className="ph ph-check mt-0.5 text-[var(--ng-accent)]" />
                          <span>{item}</span>
                      </li>
                    ))}
                </ul>
            </article>
            {/* TAG CLOUD */}
            <article className="rounded-3xl border border-[var(--ng-border)] bg-[var(--ng-soft)] p-8 lg:col-span-5" data-kid="1-4-2-5" data-name="secondary feature card">
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-muted)]" data-kid="1-4-2-5-1" data-name="feature title text">
                    Además, cuando lo necesites
                </span>
                <h3 className="mt-5 text-[1.3rem] font-extrabold leading-tight tracking-[-0.02em]" data-kid="1-4-2-5-2" data-name="feature header title">
                    Plantillas, especialidades y equipos
                </h3>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--ng-border)] pt-6" data-kid="1-4-2-5-3" data-name="features tag container">
                    {landingData.features.specialtiesTagCloud.map((tag, idx) => (
                      <span key={idx} className="rounded-full border border-[var(--ng-border)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--ng-muted)]" data-kid={`1-4-2-5-3-${idx+1}`}>
                          {tag}
                      </span>
                    ))}
                </div>
            </article>
        </div>
    </section>
    {/* ===== CALCULADORA PROMOCIONAL ===== */}
    <section className="scroll-mt-24 border-t border-[var(--ng-border)] bg-[var(--ng-soft)]" data-kid="1-4b" data-name="calculator promo section" id="calculadora">
        <div className="mx-auto max-w-[1180px] px-6 py-20 lg:px-10 lg:py-24" data-kid="1-4b-1">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-14" data-kid="1-4b-1-1">
                {/* Text Content */}
                <div className="flex flex-col justify-center lg:col-span-6" data-kid="1-4b-1-1-1">
                    <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]" data-kid="1-4b-1-1-1-1">
                        <span className="inline-block h-px w-10 bg-[var(--ng-accent)]" />
                        HERRAMIENTA GRATUITA
                    </p>
                    <h2 className="mt-5 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[2.4rem]" data-kid="1-4b-1-1-1-2">
                        Calculadora Nutricional Gratuita: TMB, GET y Macronutrientes
                    </h2>
                    <p className="mt-5 text-[15.5px] leading-relaxed text-[var(--ng-muted)]" data-kid="1-4b-1-1-1-3">
                        Obtené resultados precisos y al instante con fórmulas clínicas validadas como Mifflin-St Jeor. Estimá la Tasa Metabólica Basal (TMB), ajustá el Gasto Energético Total (GET) según el nivel de actividad, distribuí macronutrientes, raciones de intercambio e hidratación en segundos.
                    </p>

                    {/* 3 Tarjetas destacando */}
                    <div className="mt-8 grid gap-4 sm:grid-cols-3" data-kid="1-4b-1-1-1-4">
                        <div className="rounded-2xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-4 shadow-sm" data-kid="1-4b-1-1-1-4-1">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ng-tint)] text-[var(--ng-accent)]">
                                <i className="ph ph-flame text-[20px]" />
                            </div>
                            <h3 className="mt-3 text-[14px] font-bold text-[var(--ng-ink)]">TMB &amp; GET</h3>
                            <p className="mt-1 text-[12px] leading-snug text-[var(--ng-muted)]">
                                Mifflin-St Jeor y ajuste de 5 niveles de actividad física.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-4 shadow-sm" data-kid="1-4b-1-1-1-4-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ng-tint)] text-[var(--ng-accent)]">
                                <i className="ph ph-chart-pie-slice text-[20px]" />
                            </div>
                            <h3 className="mt-3 text-[14px] font-bold text-[var(--ng-ink)]">Macros &amp; Raciones</h3>
                            <p className="mt-1 text-[12px] leading-snug text-[var(--ng-muted)]">
                                Distribución nutrimental en gramos y porciones equivalentes.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-4 shadow-sm" data-kid="1-4b-1-1-1-4-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ng-tint)] text-[var(--ng-accent)]">
                                <i className="ph ph-drop text-[20px]" />
                            </div>
                            <h3 className="mt-3 text-[14px] font-bold text-[var(--ng-ink)]">Hidratación</h3>
                            <p className="mt-1 text-[12px] leading-snug text-[var(--ng-muted)]">
                                Requerimiento hídrico diario según peso y actividad física.
                            </p>
                        </div>
                    </div>

                    <div className="mt-9 flex flex-wrap items-center gap-4" data-kid="1-4b-1-1-1-5">
                        <a className="inline-flex items-center gap-2 rounded-full bg-[var(--ng-primary)] px-7 py-3.5 text-[15px] font-bold text-[var(--ng-primary-fg)] transition-transform hover:-translate-y-0.5" data-kid="1-4b-1-1-1-5-1" href="/calculadora">
                            <span>Usar Calculadora Gratuita</span>
                            <i className="ph ph-arrow-right text-[15px]" />
                        </a>
                    </div>
                </div>

                {/* Mockup Preview Container */}
                <div className="flex items-center justify-center lg:col-span-6" data-kid="1-4b-1-1-2">
                    <div className="w-full max-w-lg rounded-3xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-6 shadow-[var(--ng-shadow-card)] sm:p-7" data-kid="1-4b-1-1-2-1">
                        <div className="flex items-center justify-between border-b border-[var(--ng-border)] pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ng-primary)] text-[var(--ng-primary-fg)] font-bold text-xs">
                                    <i className="ph ph-calculator text-[16px]" />
                                </div>
                                <div>
                                    <h4 className="text-[14px] font-bold text-[var(--ng-ink)]">Resultados del Cálculo</h4>
                                    <p className="text-[11px] text-[var(--ng-muted)]">Vista previa en tiempo real</p>
                                </div>
                            </div>
                            <span className="rounded-full bg-[var(--ng-tint)] px-2.5 py-1 text-[11px] font-bold text-[var(--ng-tint-ink)] uppercase tracking-wider">
                                Mifflin-St Jeor
                            </span>
                        </div>

                        {/* Energy Summary */}
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-[var(--ng-soft)] p-3.5 border border-[var(--ng-border)]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ng-muted)]">TMB (Basal)</p>
                                <p className="mt-1 text-[1.4rem] font-extrabold text-[var(--ng-ink)]">1,650 <span className="text-[12px] font-semibold text-[var(--ng-muted)]">kcal</span></p>
                            </div>
                            <div className="rounded-2xl bg-[var(--ng-tint)] p-3.5 border border-[var(--ng-border)]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ng-tint-ink)]">GET (Total)</p>
                                <p className="mt-1 text-[1.4rem] font-extrabold text-[var(--ng-accent)]">2,393 <span className="text-[12px] font-semibold text-[var(--ng-muted)]">kcal</span></p>
                            </div>
                        </div>

                        {/* Macros breakdown preview */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between text-[12px] font-bold text-[var(--ng-ink)] mb-2">
                                <span>Distribución de Macronutrientes</span>
                                <span className="text-[var(--ng-muted)] font-medium">100% Total</span>
                            </div>
                            {/* Visual Progress Bar */}
                            <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--ng-soft)]">
                                <div className="bg-emerald-500 h-full" style={{ width: "25%" }} title="Proteínas 25%" />
                                <div className="bg-amber-500 h-full" style={{ width: "50%" }} title="Carbohidratos 50%" />
                                <div className="bg-purple-500 h-full" style={{ width: "25%" }} title="Grasas 25%" />
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px]">
                                <div className="rounded-xl bg-[var(--ng-soft)] p-2">
                                    <span className="block text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">Proteínas</span>
                                    <span className="font-extrabold text-[var(--ng-ink)]">150g <span className="text-[10px] font-normal text-[var(--ng-muted)]">(25%)</span></span>
                                </div>
                                <div className="rounded-xl bg-[var(--ng-soft)] p-2">
                                    <span className="block text-[10.5px] font-bold text-amber-600 dark:text-amber-400">Carbos</span>
                                    <span className="font-extrabold text-[var(--ng-ink)]">299g <span className="text-[10px] font-normal text-[var(--ng-muted)]">(50%)</span></span>
                                </div>
                                <div className="rounded-xl bg-[var(--ng-soft)] p-2">
                                    <span className="block text-[10.5px] font-bold text-purple-600 dark:text-purple-400">Grasas</span>
                                    <span className="font-extrabold text-[var(--ng-ink)]">66g <span className="text-[10px] font-normal text-[var(--ng-muted)]">(25%)</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Raciones & Hidratación Footer */}
                        <div className="mt-5 border-t border-[var(--ng-border)] pt-4 grid grid-cols-2 gap-3 text-[12px]">
                            <div className="flex items-center gap-2">
                                <i className="ph ph-list-checks text-[18px] text-[var(--ng-accent)] shrink-0" />
                                <div>
                                    <span className="block text-[10.5px] font-semibold text-[var(--ng-muted)]">Raciones calculadas</span>
                                    <span className="font-bold text-[var(--ng-ink)]">22 porciones / día</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <i className="ph ph-drop text-[18px] text-[var(--ng-blue)] shrink-0" />
                                <div>
                                    <span className="block text-[10.5px] font-semibold text-[var(--ng-muted)]">Agua recomendada</span>
                                    <span className="font-bold text-[var(--ng-ink)]">2.7 L / día</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    {/* ===== PARA QUIÉN ES ===== */}
    <section className="mx-auto max-w-[1180px] scroll-mt-24 px-6 py-20 lg:px-10 lg:py-24" data-kid="2-1" data-name="audience section" id="para-quien">
        <div className="max-w-2xl" data-kid="2-1-1" data-name="audience section header">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]" data-kid="2-1-1-1" data-name="audience tag line">
                Para quién es
            </p>
            <h2 className="mt-5 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[2.4rem]" data-kid="2-1-1-2" data-name="audience headline text">
                La plataforma para consultorios nutricionales y clínicas adaptada a ti.
            </h2>
            <p className="mt-5 text-[15.5px] leading-relaxed text-[var(--ng-muted)]" data-kid="2-1-1-3" data-name="audience description text">
                Dónde estás hoy define con qué plan comienzas, no lo que puedes hacer con Nutringest. Estas son las cuatro rutas más comunes.
            </p>
        </div>
        <div className="mt-12 border-t border-[var(--ng-border)]" data-kid="2-1-2" data-name="audience rows container">
            <div className="grid gap-6 border-b border-[var(--ng-border)] py-9 lg:grid-cols-12 lg:gap-10" data-kid="2-1-2-1" data-name="audience row student">
                <div className="lg:col-span-7" data-kid="2-1-2-1-1" data-name="audience row text">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-muted)]" data-kid="2-1-2-1-1-1" data-name="audience row index">
                        01 · Estudiante o pasantías
                    </p>
                    <h3 className="mt-4 text-[1.4rem] font-extrabold leading-tight tracking-[-0.02em]" data-kid="2-1-2-1-1-2" data-name="audience row title">
                        Llegá a tus prácticas con la herramienta completa
                    </h3>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--ng-muted)]" data-kid="2-1-2-1-1-3" data-name="audience row description">
                        Si cursás el último año de la licenciatura o estás en pasantías, no arranques con planillas sueltas: usá la plataforma entera mientras te formás.
                    </p>
                </div>
                <div className="lg:col-span-5 lg:border-l lg:border-[var(--ng-border)] lg:pl-10" data-kid="2-1-2-1-2" data-name="audience row route">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ng-accent)]" data-kid="2-1-2-1-2-1" data-name="audience route label">
                        Ruta recomendada
                    </p>
                    <p className="mt-3 text-[17px] font-extrabold tracking-[-0.02em] text-[var(--ng-ink)]" data-kid="2-1-2-1-2-2" data-name="audience route plan">
                        Nutringest Campus
                    </p>
                    <p className="mt-2 text-[14px] leading-relaxed text-[var(--ng-muted)]" data-kid="2-1-2-1-2-3" data-name="audience route detail">
                        120 días de premium gratis. Sin tarjeta de crédito.
                    </p>
                    <a className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-bold text-[var(--ng-ink)] underline decoration-[var(--ng-accent)] decoration-2 underline-offset-[7px]" data-kid="2-1-2-1-2-4" data-name="audience route link" href="#campus">
                        <span data-kid="2-1-2-1-2-4-1" data-name="audience route link text">
                            Solicitar acceso Campus
                        </span>
                        <i className="ph ph-arrow-right text-[14px]" data-kid="2-1-2-1-2-4-2" data-name="arrow right icon">
                        </i>
                    </a>
                </div>
            </div>
            <div className="grid gap-6 border-b border-[var(--ng-border)] py-9 lg:grid-cols-12 lg:gap-10" data-kid="2-1-2-2" data-name="audience row individual">
                <div className="lg:col-span-7" data-kid="2-1-2-2-1" data-name="audience row text">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-muted)]" data-kid="2-1-2-2-1-1" data-name="audience row index">
                        02 · Consultorio individual
                    </p>
                    <h3 className="mt-4 text-[1.4rem] font-extrabold leading-tight tracking-[-0.02em]" data-kid="2-1-2-2-1-2" data-name="audience row title">
                        Atendé, medí y armá el plan sin cambiar de herramienta
                    </h3>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--ng-muted)]" data-kid="2-1-2-2-1-3" data-name="audience row description">
                        El día a día de la consulta: antecedentes y pacientes, antropometría, menú, intercambios y lista de compras desde la misma ficha.
                    </p>
                </div>
                <div className="lg:col-span-5 lg:border-l lg:border-[var(--ng-border)] lg:pl-10" data-kid="2-1-2-2-2" data-name="audience row route">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ng-accent)]" data-kid="2-1-2-2-2-1" data-name="audience route label">
                        Ruta recomendada
                    </p>
                    <p className="mt-3 text-[17px] font-extrabold tracking-[-0.02em] text-[var(--ng-ink)]" data-kid="2-1-2-2-2-2" data-name="audience route plan">
                        {proPlan.name} · {proPlan.price}/mes
                    </p>
                    <p className="mt-2 text-[14px] leading-relaxed text-[var(--ng-muted)]" data-kid="2-1-2-2-2-3" data-name="audience route detail">
                        En {proPlan.badge.toLowerCase()}, antes {proPlan.originalPrice}. Pacientes Ilimitados, Menús y Planes de Alimentación, Consultas y Seguimiento y App/Portal para Pacientes.
                    </p>
                    <a className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-bold text-[var(--ng-ink)] underline decoration-[var(--ng-accent)] decoration-2 underline-offset-[7px]" data-kid="2-1-2-2-2-4" data-name="audience route link" href="#planes">
                        <span data-kid="2-1-2-2-2-4-1" data-name="audience route link text">
                            Ver el plan PRO
                        </span>
                        <i className="ph ph-arrow-right text-[14px]" data-kid="2-1-2-2-2-4-2" data-name="arrow right icon">
                        </i>
                    </a>
                </div>
            </div>
            <div className="grid gap-6 border-b border-[var(--ng-border)] py-9 lg:grid-cols-12 lg:gap-10" data-kid="2-1-2-3" data-name="audience row specialist">
                <div className="lg:col-span-7" data-kid="2-1-2-3-1" data-name="audience row text">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-muted)]" data-kid="2-1-2-3-1-1" data-name="audience row index">
                        03 · Especialista
                    </p>
                    <h3 className="mt-4 text-[1.4rem] font-extrabold leading-tight tracking-[-0.02em]" data-kid="2-1-2-3-1-2" data-name="audience row title">
                        Sumá plantillas propias y especialidades a tu consulta
                    </h3>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--ng-muted)]" data-kid="2-1-2-3-1-3" data-name="audience row description">
                        Cuando la consulta pide más —deportiva, pediátrica o atención en grupos—, dejás de resolverlo por fuera del sistema.
                    </p>
                </div>
                <div className="lg:col-span-5 lg:border-l lg:border-[var(--ng-border)] lg:pl-10" data-kid="2-1-2-3-2" data-name="audience row route">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ng-accent)]" data-kid="2-1-2-3-2-1" data-name="audience route label">
                        Ruta recomendada
                    </p>
                    <p className="mt-3 text-[17px] font-extrabold tracking-[-0.02em] text-[var(--ng-ink)]" data-kid="2-1-2-3-2-2" data-name="audience route plan">
                        {premiumPlan.name} · {premiumPlan.price}/mes
                    </p>
                    <p className="mt-2 text-[14px] leading-relaxed text-[var(--ng-muted)]" data-kid="2-1-2-3-2-3" data-name="audience route detail">
                        En preventa, antes {premiumPlan.originalPrice}. Plantillas de Dietas, Personalización de Plantillas, Portafolios Digitales, Nutrición Deportiva y Pediátrica.
                    </p>
                    <a className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-bold text-[var(--ng-ink)] underline decoration-[var(--ng-accent)] decoration-2 underline-offset-[7px]" data-kid="2-1-2-3-2-4" data-name="audience route link" href="#planes">
                        <span data-kid="2-1-2-3-2-4-1" data-name="audience route link text">
                            Ver el plan PREMIUM
                        </span>
                        <i className="ph ph-arrow-right text-[14px]" data-kid="2-1-2-3-2-4-2" data-name="arrow right icon">
                        </i>
                    </a>
                </div>
            </div>
            <div className="grid gap-6 border-b border-[var(--ng-border)] py-9 lg:grid-cols-12 lg:gap-10" data-kid="2-1-2-4" data-name="audience row clinics">
                <div className="lg:col-span-7" data-kid="2-1-2-4-1" data-name="audience row text">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-muted)]" data-kid="2-1-2-4-1-1" data-name="audience row index">
                        04 · Equipos y clínicas
                    </p>
                    <h3 className="mt-4 text-[1.4rem] font-extrabold leading-tight tracking-[-0.02em]" data-kid="2-1-2-4-1-2" data-name="audience row title">
                        Coordiná a varios nutricionistas bajo tu propia marca
                    </h3>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--ng-muted)]" data-kid="2-1-2-4-1-3" data-name="audience row description">
                        Un equipo atendiendo con la misma base clínica y tu identidad, con lectura de la práctica a nivel de clínica.
                    </p>
                </div>
                <div className="lg:col-span-5 lg:border-l lg:border-[var(--ng-border)] lg:pl-10" data-kid="2-1-2-4-2" data-name="audience row route">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ng-accent)]" data-kid="2-1-2-4-2-1" data-name="audience route label">
                        Ruta recomendada
                    </p>
                    <p className="mt-3 text-[17px] font-extrabold tracking-[-0.02em] text-[var(--ng-ink)]" data-kid="2-1-2-4-2-2" data-name="audience route plan">
                        {clinicaPlan.name} · {clinicaPlan.price}/mes
                    </p>
                    <p className="mt-2 text-[14px] leading-relaxed text-[var(--ng-muted)]" data-kid="2-1-2-4-2-3" data-name="audience route detail">
                        {clinicaPlan.secondaryPrice}. Gestión de Equipo, Multi-nutricionista, Marca Personalizada, Analíticas Avanzadas y Soporte Prioritario VIP.
                    </p>
                    <a className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-bold text-[var(--ng-ink)] underline decoration-[var(--ng-accent)] decoration-2 underline-offset-[7px]" data-kid="2-1-2-4-2-4" data-name="audience route link" href="#planes">
                        <span data-kid="2-1-2-4-2-4-1" data-name="audience route link text">
                            Ver el plan Clínica
                        </span>
                        <i className="ph ph-arrow-right text-[14px]" data-kid="2-1-2-4-2-4-2" data-name="arrow right icon">
                        </i>
                    </a>
                </div>
            </div>
        </div>
    </section>
    {/* ===== CAMPUS ===== */}
    <section className="mx-auto max-w-[1180px] scroll-mt-24 px-6 pb-20 lg:px-10 lg:pb-24" data-kid="1-5" data-name="campus section" id="campus">
        <div className="relative overflow-hidden rounded-[32px] border border-[var(--ng-band-border)] bg-[var(--ng-ink-band)] px-8 py-14 text-[var(--ng-band-ink)] lg:px-16 lg:py-16" data-kid="1-5-1" data-name="campus content container">
            <span className="absolute left-0 top-0 h-1 w-full bg-[var(--ng-accent)]" data-kid="1-5-1-1" data-name="decorative top border">
            </span>
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16" data-kid="1-5-1-2" data-name="campus grid">
                <div className="lg:col-span-7" data-kid="1-5-1-2-1" data-name="campus text content container">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]" data-kid="1-5-1-2-1-1" data-name="campus tag line">
                        Nutringest Campus
                    </p>
                    <h2 className="mt-5 text-[1.9rem] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[2.3rem]" data-kid="1-5-1-2-1-2" data-name="campus headline text">
                        El programa para nutricionistas y estudiantes con acceso premium gratis.
                    </h2>
                    <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-[var(--ng-band-muted)]" data-kid="1-5-1-2-1-3" data-name="campus description text">
                        Nutringest Campus existe para que llegues a tus prácticas profesionales con una herramienta de nivel clínico:
                        <span className="font-bold text-[var(--ng-band-ink)]" data-kid="1-5-1-2-1-3-1" data-name="campus bold highlight text">
                            {" "}120 días de acceso premium gratuito
                        </span>
                        , sin tarjeta de crédito.
                    </p>
                </div>
                <div className="lg:col-span-5" data-kid="1-5-1-2-2" data-name="campus call to action container">
                    <ul className="space-y-3 border-t border-white/15 pt-7" data-kid="1-5-1-2-2-1" data-name="campus checklist container">
                        <li className="flex items-start gap-3 text-[14.5px] text-[var(--ng-band-ink)]" data-kid="1-5-1-2-2-1-1" data-name="checklist item one">
                            <i className="ph ph-check mt-0.5 text-[var(--ng-accent)]" data-kid="1-5-1-2-2-1-1-1" data-name="checkmark icon">
                            </i>
                            <span data-kid="1-5-1-2-2-1-1-2" data-name="list text">
                                Cursando el último año de la licenciatura
                            </span>
                        </li>
                        <li className="flex items-start gap-3 text-[14.5px] text-[var(--ng-band-ink)]" data-kid="1-5-1-2-2-1-2" data-name="checklist item two">
                            <i className="ph ph-check mt-0.5 text-[var(--ng-accent)]" data-kid="1-5-1-2-2-1-2-1" data-name="checkmark icon">
                            </i>
                            <span data-kid="1-5-1-2-2-1-2-2" data-name="list text">
                                O haciendo tus pasantías profesionales
                            </span>
                        </li>
                        <li className="flex items-start gap-3 text-[14.5px] text-[var(--ng-band-ink)]" data-kid="1-5-1-2-2-1-3" data-name="checklist item three">
                            <i className="ph ph-check mt-0.5 text-[var(--ng-accent)]" data-kid="1-5-1-2-2-1-3-1" data-name="checkmark icon">
                            </i>
                            <span data-kid="1-5-1-2-2-1-3-2" data-name="list text">
                                120 días de premium completo
                            </span>
                        </li>
                    </ul>
                    <a className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--ng-band-ink)] px-7 py-3.5 text-[15px] font-bold text-[var(--ng-ink-band)] transition-transform hover:-translate-y-0.5" data-kid="1-5-1-2-2-2" data-name="campus cta button" href="#empezar">
                        <span data-kid="1-5-1-2-2-2-1" data-name="campus cta button text">
                            Solicitar acceso Campus
                        </span>
                        <i className="ph ph-arrow-right text-[15px]" data-kid="1-5-1-2-2-2-2" data-name="right arrow icon">
                        </i>
                    </a>
                </div>
            </div>
        </div>
    </section>
    {/* ===== PLANES ===== */}
    <PricingSection />

    {/* ===== CASOS DE USO ===== */}
    <section className="scroll-mt-24 border-t border-[var(--ng-border)]" data-kid="3-2" data-name="use cases section" id="especialidades">
        <div className="mx-auto max-w-[1180px] px-6 py-20 lg:px-10 lg:py-24" data-kid="3-2-1" data-name="use cases content container">
            <div className="max-w-2xl" data-kid="3-2-1-1" data-name="use cases header">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]" data-kid="3-2-1-1-1" data-name="use cases tag line">
                    Casos de uso
                </p>
                <h2 className="mt-5 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[2.4rem]" data-kid="3-2-1-1-2" data-name="use cases headline text">
                    Software para nutricionistas adaptado a cuatro formas de trabajar
                </h2>
                <p className="mt-5 text-[15.5px] leading-relaxed text-[var(--ng-muted)]" data-kid="3-2-1-1-3" data-name="use cases description text">
                    Lo que cambia entre una práctica y otra no es el sistema, es qué parte de Nutringest usás todos los días.
                </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2" data-kid="3-2-1-2" data-name="use cases grid">
                {landingData.useCases.map((uc) => (
                  <article key={uc.id} className="flex flex-col rounded-3xl border border-[var(--ng-border)] bg-[var(--ng-surface)] p-8" data-kid={`3-2-1-2-${uc.id}`}>
                      <i className={`ph ${uc.icon} text-[22px] text-[var(--ng-accent)]`} />
                      <h3 className="mt-5 text-[1.3rem] font-extrabold leading-tight tracking-[-0.02em]">
                          {uc.title}
                      </h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-[var(--ng-muted)]">
                          {uc.description}
                      </p>
                      <p className="mt-6 border-t border-[var(--ng-border)] pt-5 text-[12px] font-bold uppercase tracking-wider text-[var(--ng-muted)]">
                          {uc.badge}
                      </p>
                  </article>
                ))}
            </div>
        </div>
    </section>
    {/* ===== PREGUNTAS FRECUENTES ===== */}
    <section className="mx-auto max-w-[1180px] scroll-mt-24 px-6 py-20 lg:px-10 lg:py-24" data-kid="1-7" data-name="faq section" id="faq">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16" data-kid="1-7-1" data-name="faq content container">
            <div className="lg:col-span-4" data-kid="1-7-1-1" data-name="faq text header">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-accent)]" data-kid="1-7-1-1-1" data-name="faq tag line">
                    Preguntas frecuentes
                </p>
                <h2 className="mt-5 text-[1.8rem] font-extrabold leading-[1.12] tracking-[-0.03em] sm:text-[2.1rem]" data-kid="1-7-1-1-2" data-name="faq headline">
                    Preguntas frecuentes sobre nuestro software para nutricionistas y clínicas.
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed text-[var(--ng-muted)]" data-kid="1-7-1-1-3" data-name="faq description text">
                    Si te queda una duda puntual, escribinos y la resolvemos.
                </p>
                <a className="mt-6 inline-flex items-center gap-2 text-[14.5px] font-bold text-[var(--ng-ink)] underline decoration-[var(--ng-accent)] decoration-2 underline-offset-[7px]" data-kid="1-7-1-1-4" data-name="faq whatsapp support link" href="https://wa.me/584243153383?text=Hola,%20tengo%20una%20consulta%20sobre%20Nutringest" rel="noopener noreferrer" target="_blank">
                    <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                    <span data-kid="1-7-1-1-4-2" data-name="support link text">
                        Escribinos por WhatsApp
                    </span>
                </a>
            </div>
            <div className="lg:col-span-8" data-kid="1-7-1-2" data-name="faq list container">
                {landingData.faqs.map((faq, idx) => (
                  <details key={faq.id} className={`border-t ${idx === landingData.faqs.length - 1 ? 'border-y' : ''} border-[var(--ng-border)] py-6`} data-kid={`1-7-1-2-${idx+1}`} open={faq.defaultOpen}>
                      <summary className="flex items-start justify-between gap-6" data-kid={`1-7-1-2-${idx+1}-1`}>
                          <span className="text-[16.5px] font-bold leading-snug">
                              {faq.question}
                          </span>
                          <span className="mt-1 shrink-0 text-[var(--ng-accent)]">
                              <i className="ph ph-plus ng-faq-plus text-[20px]" />
                              <i className="ph ph-minus ng-faq-minus text-[20px]" />
                          </span>
                      </summary>
                      <p className="mt-4 max-w-2xl pr-8 text-[15px] leading-relaxed text-[var(--ng-muted)]">
                          {faq.answer}
                      </p>
                  </details>
                ))}
            </div>
        </div>
    </section>
    {/* ===== CTA FINAL + NEWSLETTER ===== */}
    <section className="mx-auto max-w-[1180px] scroll-mt-24 px-6 py-20 lg:px-10 lg:py-24" data-kid="4-1" data-name="final cta section" id="cierre">
        <div className="rounded-[32px] border border-[var(--ng-border)] bg-[var(--ng-tint)] px-8 py-14 lg:px-16 lg:py-16" data-kid="4-1-1" data-name="final cta panel">
            <div className="grid gap-14 lg:grid-cols-12 lg:gap-16" data-kid="4-1-1-1" data-name="final cta grid">
                <div className="lg:col-span-7" data-kid="4-1-1-1-1" data-name="final cta content">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-tint-ink)]" data-kid="4-1-1-1-1-1" data-name="final cta tag line">
                        Empezá hoy
                    </p>
                    <h2 className="mt-5 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-[var(--ng-ink)] sm:text-[2.4rem]" data-kid="4-1-1-1-1-2" data-name="final cta headline text">
                        Probá la herramienta para nutricionistas y clínicas líder durante 14 días gratis.
                    </h2>
                    <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-[var(--ng-muted)]" data-kid="4-1-1-1-1-3" data-name="final cta description text">
                        Sin tarjeta de crédito y sin permanencia. Si sos estudiante de último año o estás en pasantías, tu ruta es Campus: 120 días de premium gratis.
                    </p>
                    <div className="mt-9 flex flex-wrap items-center gap-4" data-kid="4-1-1-1-1-4" data-name="final cta buttons group">
                        <a className="inline-flex items-center gap-2 rounded-full bg-[var(--ng-primary)] px-7 py-3.5 text-[15px] font-bold text-[var(--ng-primary-fg)] transition-transform hover:-translate-y-0.5" data-kid="4-1-1-1-1-4-1" data-name="final cta primary button" href="/register">
                            <span data-kid="4-1-1-1-1-4-1-1" data-name="final cta primary text">
                                Comenzar prueba de 14 días
                            </span>
                            <i className="ph ph-arrow-right text-[15px]" data-kid="4-1-1-1-1-4-1-2" data-name="arrow right icon">
                            </i>
                        </a>
                        <a className="inline-flex items-center gap-2 rounded-full border border-[var(--ng-accent)] px-7 py-3.5 text-[15px] font-bold text-[var(--ng-accent)] transition-colors hover:bg-[var(--ng-bg)]" data-kid="4-1-1-1-1-4-2" data-name="final cta campus button" href="#campus">
                            <span data-kid="4-1-1-1-1-4-2-1" data-name="final cta campus text">
                                Solicitar acceso Campus
                            </span>
                        </a>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3" data-kid="4-1-1-1-1-5" data-name="final cta direct channels">
                        <a className="inline-flex items-center gap-2 text-[14px] font-bold text-[var(--ng-ink)] underline decoration-[var(--ng-accent)] decoration-2 underline-offset-[7px]" data-kid="4-1-1-1-1-5-1" data-name="final cta whatsapp link" href="https://wa.me/584243153383?text=Hola,%20tengo%20una%20consulta%20sobre%20Nutringest" rel="noopener noreferrer" target="_blank">
                            <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                            <span data-kid="4-1-1-1-1-5-1-2" data-name="whatsapp link text">
                                Escribinos por WhatsApp
                            </span>
                        </a>
                    </div>
                </div>
                <div className="lg:col-span-5 lg:border-l lg:border-[var(--ng-border)] lg:pl-14" data-kid="4-1-1-1-2" data-name="newsletter container">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ng-tint-ink)]" data-kid="4-1-1-1-2-1" data-name="newsletter tag line">
                        Novedades para nutricionistas
                    </p>
                    <h3 className="mt-5 text-[1.35rem] font-extrabold leading-tight tracking-[-0.02em] text-[var(--ng-ink)]" data-kid="4-1-1-1-2-2" data-name="newsletter title">
                        Guías y novedades del producto, en tu correo
                    </h3>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--ng-muted)]" data-kid="4-1-1-1-2-3" data-name="newsletter description text">
                        Te escribimos cuando publicamos algo útil sobre consulta, antropometría o planes. Puedes darte de baja cuando quieras.
                    </p>
                    <form className="mt-7 flex flex-col gap-3 sm:flex-row" data-kid="4-1-1-1-2-4" data-name="newsletter form" onSubmit={(e) => e.preventDefault()}>
                        <label className="sr-only" data-kid="4-1-1-1-2-4-1" data-name="newsletter email label" htmlFor="ng-news-email">
                            Tu correo electrónico
                        </label>
                        <input className="w-full rounded-full border border-[var(--ng-border)] bg-[var(--ng-bg)] px-5 py-3 text-[14px] text-[var(--ng-ink)] outline-none placeholder:text-[var(--ng-muted)] sm:w-56" data-kid="4-1-1-1-2-4-2" data-name="newsletter email input" id="ng-news-email" name="email" placeholder="tu@email.com" type="email"/>
                        <button className="shrink-0 rounded-full border border-[var(--ng-ink)] px-6 py-3 text-[14px] font-bold text-[var(--ng-ink)] transition-colors hover:bg-[var(--ng-bg)]" data-kid="4-1-1-1-2-4-3" data-name="newsletter submit button" type="submit">
                            Suscribirme
                        </button>
                    </form>
                    <p className="mt-4 text-[12.5px] text-[var(--ng-muted)]" data-kid="4-1-1-1-2-5" data-name="newsletter disclaimer text">
                        No compartimos tu correo con terceros.
                    </p>
                </div>
            </div>
        </div>
    </section>
    {/* ===== FOOTER ===== */}
    <footer className="border-t border-[var(--ng-band-border)] bg-[var(--ng-ink-band)] text-[var(--ng-band-ink)]" data-kid="1-8" data-name="footer">
        <div className="mx-auto max-w-[1180px] px-6 py-16 lg:px-10" data-kid="1-8-1" data-name="footer content container">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16" data-kid="1-8-1-1" data-name="footer links grid">
                <div className="lg:col-span-5" data-kid="1-8-1-1-1" data-name="footer brand container">
                    <img alt="Nutringest" className="h-8 sm:h-9 w-auto" data-kid="1-8-1-1-1-1" data-name="footer white logo image" src="/png/ImagotipoBlanco.png"/>
                    <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-[var(--ng-band-muted)]" data-kid="1-8-1-1-1-2" data-name="footer description text">
                        Plataforma de gestión para consultorios nutricionales: pacientes, antropometría, planes alimentarios y seguimiento en un solo lugar.
                    </p>
                    <a className="mt-6 inline-flex items-center gap-2 text-[13.5px] font-bold text-[var(--ng-band-ink)]" data-kid="1-8-1-1-1-3" data-name="footer social link" href="https://www.instagram.com/nutringest/" rel="noopener noreferrer" target="_blank">
                        <i className="ph ph-instagram-logo text-[16px]" data-kid="1-8-1-1-1-3-1" data-name="instagram icon">
                        </i>
                        <span data-kid="1-8-1-1-1-3-2" data-name="instagram handle">
                            @nutringest
                        </span>
                    </a>
                </div>
                <div className="lg:col-span-3" data-kid="1-8-1-1-2" data-name="footer product links container">
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ng-band-muted)]" data-kid="1-8-1-1-2-1" data-name="product section title">
                        Producto
                    </h4>
                    <ul className="mt-5 space-y-3 text-[14px] font-semibold" data-kid="1-8-1-1-2-2" data-name="footer product links list">
                        <li data-kid="1-8-1-1-2-2-1" data-name="footer link list item">
                            <a className="text-[var(--ng-band-ink)] transition-opacity hover:opacity-70" data-kid="1-8-1-1-2-2-1-1" data-name="footer link one" href="#funciones">
                                Funciones
                            </a>
                        </li>
                        <li data-kid="1-8-1-1-2-2-5" data-name="footer link list item">
                            <a className="text-[var(--ng-band-ink)] transition-opacity hover:opacity-70" data-kid="1-8-1-1-2-2-5-1" data-name="footer link calculator" href="/calculadora">
                                Calculadora Gratuita
                            </a>
                        </li>
                        <li data-kid="1-8-1-1-2-2-2" data-name="footer link list item">
                            <a className="text-[var(--ng-band-ink)] transition-opacity hover:opacity-70" data-kid="1-8-1-1-2-2-2-1" data-name="footer link two" href="#planes">
                                Planes
                            </a>
                        </li>
                        <li data-kid="1-8-1-1-2-2-3" data-name="footer link list item">
                            <a className="text-[var(--ng-band-ink)] transition-opacity hover:opacity-70" data-kid="1-8-1-1-2-2-3-1" data-name="footer link three" href="#campus">
                                Nutringest Campus
                            </a>
                        </li>
                        <li data-kid="1-8-1-1-2-2-4" data-name="footer link list item">
                            <a className="text-[var(--ng-band-ink)] transition-opacity hover:opacity-70" data-kid="1-8-1-1-2-2-4-1" data-name="footer link four" href="#faq">
                                Preguntas frecuentes
                            </a>
                        </li>
                    </ul>
                </div>
                <div className="lg:col-span-4" data-kid="1-8-1-1-3" data-name="footer contact info container">
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ng-band-muted)]" data-kid="1-8-1-1-3-1" data-name="contact section title">
                        Contacto
                    </h4>
                    <ul className="mt-5 space-y-3.5 text-[14px] font-semibold" data-kid="1-8-1-1-3-2" data-name="footer contact links list">
                        <li data-kid="1-8-1-1-3-2-1" data-name="footer contact list item">
                            <a className="inline-flex items-center gap-2.5 text-[var(--ng-band-ink)] transition-opacity hover:opacity-70" data-kid="1-8-1-1-3-2-1-1" data-name="footer whatsapp link" href="https://wa.me/584243153383?text=Hola,%20quisiera%20más%20información%20sobre%20Nutringest" rel="noopener noreferrer" target="_blank">
                                <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                                <span data-kid="1-8-1-1-3-2-1-1-2" data-name="whatsapp number">
                                    WhatsApp: +58 424-3153383
                                </span>
                            </a>
                        </li>
                        <li data-kid="1-8-1-1-3-2-2" data-name="footer contact list item">
                            <a className="inline-flex items-center gap-2.5 break-all text-[var(--ng-band-ink)] transition-opacity hover:opacity-70" data-kid="1-8-1-1-3-2-2-1" data-name="footer email link" href="mailto:nutringest@gmail.com">
                                <i className="ph ph-envelope-simple text-[17px] text-[var(--ng-accent)]" data-kid="1-8-1-1-3-2-2-1-1" data-name="email icon">
                                </i>
                                <span data-kid="1-8-1-1-3-2-2-1-2" data-name="email address">
                                    nutringest@gmail.com
                                </span>
                            </a>
                        </li>
                        <li className="flex items-center gap-2.5 text-[var(--ng-band-muted)]" data-kid="1-8-1-1-3-2-3" data-name="footer contact list item">
                            <i className="ph ph-map-pin text-[17px] text-[var(--ng-accent)]" data-kid="1-8-1-1-3-2-3-1" data-name="location icon">
                            </i>
                            <span data-kid="1-8-1-1-3-2-3-2" data-name="location text">
                                Guárico, Venezuela
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/12 pt-7 text-[12.5px] text-[var(--ng-band-muted)] sm:flex-row" data-kid="1-8-1-2" data-name="footer copyright container">
                <p data-kid="1-8-1-2-1" data-name="copyright text">
                    © 2026 Nutringest. Todos los derechos reservados.
                </p>
                <p className="flex items-center gap-1.5" data-kid="1-8-1-2-2" data-name="footer mission text">
                    De nutricionistas, para nutricionistas
                </p>
            </div>
        </div>
    </footer>
    {/* ===== BURBUJAS FLOTANTES ===== */}
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3" data-kid="1-9" data-name="floating tools container">
        {/* Burbuja WhatsApp */}
        <a aria-label="Contactar por WhatsApp" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_18px_40px_-14px_rgba(37,211,102,0.9)] transition-transform hover:-translate-y-0.5" data-kid="1-9-3" data-name="whatsapp floating link" href="https://wa.me/584243153383?text=Hola,%20tengo%20una%20consulta%20sobre%20Nutringest" rel="noopener noreferrer" target="_blank">
            <WhatsAppIcon className="h-7 w-7 text-white" />
        </a>
    </div>
    
</div>

    </>
  );
}
