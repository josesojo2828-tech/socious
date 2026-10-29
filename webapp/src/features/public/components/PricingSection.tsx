import { Check, Sparkles, ArrowRight, ShieldCheck, Zap, Users } from "lucide-react";
import { useTranslation } from "@/context/i18n.context";
import React from "react";

export const PricingSection: React.FC = () => {
    const { t } = useTranslation();

    // Feature lists
    const proFeatures = [
        t('landing.pricing.plans.pro.features.patients_unlimited'),
        t('landing.pricing.plans.pro.features.menus'),
        t('landing.pricing.plans.pro.features.exchanges'),
        t('landing.pricing.plans.pro.features.consultations'),
        t('landing.pricing.plans.pro.features.portal'),
        t('landing.pricing.plans.pro.features.shopping_list'),
        t('landing.pricing.plans.pro.features.anthropometry'),
        t('landing.pricing.plans.pro.features.food_db'),
    ];

    const premiumBaseFeatures = [
        t('landing.pricing.plans.premium.features.patients_unlimited'),
        t('landing.pricing.plans.premium.features.menus'),
        t('landing.pricing.plans.premium.features.exchanges'),
        t('landing.pricing.plans.premium.features.consultations'),
        t('landing.pricing.plans.premium.features.portal'),
        t('landing.pricing.plans.premium.features.shopping_list'),
        t('landing.pricing.plans.premium.features.anthropometry'),
        t('landing.pricing.plans.premium.features.food_db'),
    ];

    const premiumAdvancedFeatures = [
        t('landing.pricing.plans.premium.features.diet_templates'),
        t('landing.pricing.plans.premium.features.portfolios'),
        t('landing.pricing.plans.premium.features.custom_templates'),
        t('landing.pricing.plans.premium.features.sports_nutrition'),
        t('landing.pricing.plans.premium.features.pediatric_nutrition'),
        t('landing.pricing.plans.premium.features.referrals'),
        t('landing.pricing.plans.premium.features.group_care'),
    ];

    const clinicaFeatures = [
        t('landing.pricing.plans.clinica.features.everything_pro'),
        t('landing.pricing.plans.clinica.features.team_management'),
        t('landing.pricing.plans.clinica.features.clinic_branding'),
        t('landing.pricing.plans.clinica.features.priority_support'),
        t('landing.pricing.plans.clinica.features.multi_nutritionist'),
        t('landing.pricing.plans.clinica.features.analytics'),
    ];

    const proNormal = parseFloat(t('landing.pricing.plans.pro.price')) || 10;
    const proPresale = parseFloat(t('landing.pricing.plans.pro.presale_price')) || 4;
    const proSavings = Math.round(((proNormal - proPresale) / proNormal) * 100);

    const premiumNormal = parseFloat(t('landing.pricing.plans.premium.price')) || 25;
    const premiumPresale = parseFloat(t('landing.pricing.plans.premium.presale_price')) || 20;
    const premiumSavings = Math.round(((premiumNormal - premiumPresale) / premiumNormal) * 100);

    const CheckIcon = ({ className = "" }: { className?: string }) => (
        <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${className}`}>
            <Check className="w-3.5 h-3.5 stroke-[3]" />
        </span>
    );

    return (
        <section id="pricing" className="py-20 bg-gradient-to-b from-base-200 via-base-200/50 to-base-100 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-purple-500/8 blur-[140px] rounded-full pointer-events-none" />
            <div className="absolute bottom-10 right-1/4 w-[500px] h-[300px] bg-indigo-500/8 blur-[120px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 lg:px-8 relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-14">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/80 border border-purple-200/60 text-purple-800 text-xs font-black uppercase tracking-widest mb-5 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                        Planes Transparentes y Flexibles
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                        Planes diseñados para potenciar tu{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-violet-700 to-indigo-600">
                            consulta de nutrición
                        </span>
                    </h2>
                    <p className="mt-4 text-base md:text-lg text-base-content/70 font-normal max-w-2xl mx-auto">
                        {t('landing.pricing.subtitle')}
                    </p>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto items-stretch">

                    {/* PLAN PRO */}
                    <div className="group relative bg-white/95 backdrop-blur-sm rounded-3xl border border-base-300/90 hover:border-purple-300 shadow-xl shadow-base-300/30 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
                        {/* Avatar Hero Stage */}
                        <div className="relative bg-gradient-to-b from-purple-50/70 via-indigo-50/40 to-white pt-6 pb-4 px-6 flex flex-col items-center justify-center border-b border-base-200 overflow-hidden">
                            <div className="absolute -top-8 -left-8 w-36 h-36 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
                            {/* Top Tags */}
                            <div className="w-full flex items-center justify-between mb-2 z-10">
                                <span className="px-3 py-1 bg-purple-100/90 text-purple-800 text-[11px] font-extrabold rounded-lg tracking-wider uppercase border border-purple-200/60">
                                    Preventa
                                </span>
                                <span className="text-xs font-semibold text-base-content/50">
                                    Consultorio Individual
                                </span>
                            </div>
                            {/* Avatar */}
                            <div className="relative w-40 h-48 flex items-center justify-center my-1 z-10">
                                <div className="absolute w-36 h-36 rounded-full bg-gradient-to-b from-white via-purple-50/80 to-purple-100/60 border border-purple-100/80 -z-10 bottom-2 shadow-lg shadow-purple-500/10" />
                                <img
                                    alt="Nutringest Pro"
                                    className="max-h-44 w-auto object-contain drop-shadow-lg transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-105"
                                    src="/png/pro.png"
                                />
                            </div>
                            <div className="text-center mt-1 z-10">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-base-content/60 bg-white/90 border border-base-200 px-3 py-1 rounded-full shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    Especialistas en crecimiento
                                </span>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex flex-col flex-grow justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-2xl font-black tracking-tight">PRO</h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-base-200 text-base-content/70 border border-base-300">Básico Clínico</span>
                                </div>
                                <p className="text-xs text-base-content/60 mt-2 leading-relaxed">
                                    {t('landing.pricing.plans.pro.description')}
                                </p>

                                {/* Price */}
                                <div className="my-4 p-4 rounded-2xl bg-base-200/60 border border-base-300/50">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-4xl font-black tracking-tight">${t('landing.pricing.plans.pro.presale_price')}</span>
                                        <span className="text-sm font-bold text-base-content/50">/mes</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="line-through text-xs font-semibold text-base-content/40">${t('landing.pricing.plans.pro.price')}/mes</span>
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-purple-100 text-purple-800">
                                            Ahorra {proSavings}%
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-base-content/40 font-medium mt-1">Facturado mensualmente</p>
                                </div>

                                {/* CTA */}
                                <button className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gray-900 hover:bg-purple-700 text-white transition-all duration-200 shadow-sm hover:shadow-md mb-5 cursor-pointer">
                                    Elegir Plan Pro
                                </button>

                                {/* Features */}
                                <div className="pt-2 border-t border-base-200">
                                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-base-content/40 mb-3">
                                        Todo para empezar
                                    </h4>
                                    <ul className="space-y-2.5 text-xs sm:text-sm text-base-content/70">
                                        {proFeatures.map((feature, idx) => (
                                            <li key={idx} className="flex items-center gap-2.5">
                                                <CheckIcon className="bg-purple-50 text-purple-700" />
                                                <span className="font-medium">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 pb-4 text-center">
                            <span className="text-[11px] text-base-content/40 font-medium">Activación inmediata • Cancela cuando quieras</span>
                        </div>
                    </div>

                    {/* PLAN PREMIUM — DESTACADO */}
                    <div className="group relative bg-white rounded-3xl shadow-2xl shadow-purple-500/20 ring-2 ring-purple-600/80 transition-all duration-300 flex flex-col overflow-hidden z-10 lg:-translate-y-3 lg:-mb-4">
                        {/* Top Badge */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-full text-center">
                            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-700 to-indigo-600 text-white text-[11px] font-extrabold uppercase px-5 py-1.5 rounded-b-xl shadow-md tracking-wider">
                                <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                                Más Elegido
                            </span>
                        </div>

                        {/* Avatar Hero Stage */}
                        <div className="relative bg-gradient-to-b from-purple-600/15 via-purple-500/10 to-purple-50/30 pt-10 pb-4 px-6 flex flex-col items-center justify-center border-b border-purple-200/60 overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-400/25 rounded-full blur-3xl pointer-events-none" />
                            <div className="w-full flex items-center justify-between mb-2 mt-2 z-10">
                                <span className="px-3 py-1 bg-purple-700 text-white text-[11px] font-extrabold rounded-lg tracking-wider uppercase shadow-sm">
                                    Más Adquirido
                                </span>
                                <span className="text-xs font-bold text-purple-700 bg-white/95 px-2.5 py-0.5 rounded-md border border-purple-200">
                                    Profesional Full
                                </span>
                            </div>
                            {/* Avatar */}
                            <div className="relative w-44 h-52 flex items-center justify-center my-1 z-10">
                                <div className="absolute w-40 h-40 rounded-full bg-gradient-to-b from-white via-purple-50/80 to-purple-100/60 border border-purple-200/90 -z-10 bottom-2 shadow-xl shadow-purple-500/15" />
                                <img
                                    alt="Nutringest Premium"
                                    className="max-h-48 w-auto object-contain drop-shadow-xl transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-105"
                                    src="/png/premium.png"
                                />
                            </div>
                            <div className="text-center mt-1 z-10">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-900 bg-white/95 border border-purple-300/80 px-3.5 py-1 rounded-full shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    98% de satisfacción clínica
                                </span>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex flex-col flex-grow justify-between bg-gradient-to-b from-white via-purple-50/20 to-white">
                            <div>
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-2xl sm:text-3xl font-black text-purple-900 tracking-tight">PREMIUM</h3>
                                    <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                                        Todo Incluido
                                    </span>
                                </div>
                                <p className="text-xs text-base-content/60 mt-2 leading-relaxed font-medium">
                                    {t('landing.pricing.plans.premium.description')}
                                </p>

                                {/* Price */}
                                <div className="my-4 p-4 rounded-2xl bg-purple-50/50 border border-purple-200/70">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-4xl sm:text-5xl font-black text-purple-900 tracking-tight">${t('landing.pricing.plans.premium.presale_price')}</span>
                                        <span className="text-sm font-bold text-base-content/50">/mes</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="line-through text-xs font-semibold text-base-content/40">${t('landing.pricing.plans.premium.price')}/mes</span>
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            Ahorra {premiumSavings}%
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-base-content/40 font-medium mt-1">Facturado mensualmente</p>
                                </div>

                                {/* CTA */}
                                <button className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white shadow-xl shadow-purple-700/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 mb-5 cursor-pointer flex items-center justify-center gap-2">
                                    Comenzar Prueba Premium
                                    <ArrowRight className="w-4 h-4" />
                                </button>

                                {/* Advanced Features */}
                                <div className="pt-2 border-t border-purple-100 space-y-4">
                                    <div>
                                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-purple-800 mb-3 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-purple-700" />
                                            Herramientas Pro & Especialidades
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {premiumAdvancedFeatures.map((feature, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-white/90 p-2 rounded-lg border border-purple-200/80 shadow-sm">
                                                    <span className="w-4 h-4 rounded bg-purple-700 text-white flex items-center justify-center shrink-0">
                                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                    </span>
                                                    <span className="font-bold leading-tight">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-purple-100">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-base-content/50 mb-1.5">
                                            + Todo lo incluido en Plan Pro:
                                        </div>
                                        <p className="text-xs text-base-content/60 leading-relaxed">
                                            Pacientes ilimitados, Menús & Planes, Listas de Intercambio, Antropometría y Portal Paciente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 pb-4 pt-3 border-t border-purple-100 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-purple-800">
                                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                                <span>14 días de prueba sin compromiso</span>
                            </div>
                        </div>
                    </div>

                    {/* PLAN CLÍNICA */}
                    <div className="group relative bg-white/95 backdrop-blur-sm rounded-3xl border border-base-300/90 hover:border-slate-400/60 shadow-xl shadow-base-300/30 hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
                        {/* Avatar Hero Stage */}
                        <div className="relative bg-gradient-to-b from-slate-100/90 via-slate-50 to-white pt-6 pb-4 px-6 flex flex-col items-center justify-center border-b border-base-200 overflow-hidden">
                            <div className="absolute -top-8 -right-8 w-36 h-36 bg-slate-200/40 rounded-full blur-3xl pointer-events-none" />
                            <div className="w-full flex items-center justify-between mb-2 z-10">
                                <span className="px-3 py-1 bg-gray-900 text-white text-[11px] font-extrabold rounded-lg tracking-wider uppercase">
                                    Equipos
                                </span>
                                <span className="text-xs font-semibold text-base-content/50">
                                    Equipos & Clínicas
                                </span>
                            </div>
                            {/* Avatar */}
                            <div className="relative w-40 h-48 flex items-center justify-center my-1 z-10">
                                <div className="absolute w-36 h-36 rounded-full bg-gradient-to-b from-white to-slate-200/40 border border-slate-200/80 -z-10 bottom-2 shadow-lg" />
                                <img
                                    alt="Nutringest Clínica"
                                    className="max-h-44 w-auto object-contain drop-shadow-lg transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-105"
                                    src="/png/cclinica.png"
                                />
                            </div>
                            <div className="text-center mt-1 z-10">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-base-content/70 bg-white/90 border border-base-200 px-3 py-1 rounded-full shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                                    Multi-licencia escalable
                                </span>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex flex-col flex-grow justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-2xl font-black tracking-tight">Clínica</h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-base-200 text-base-content/70 border border-base-300">Empresarial</span>
                                </div>
                                <p className="text-xs text-base-content/60 mt-2 leading-relaxed">
                                    {t('landing.pricing.plans.clinica.description')}
                                </p>

                                {/* Price */}
                                <div className="my-4 p-4 rounded-2xl bg-base-200/60 border border-base-300/50">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-4xl font-black tracking-tight">${t('landing.pricing.plans.clinica.price')}</span>
                                        <span className="text-sm font-bold text-base-content/50">/mes</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                            {t('landing.pricing.plans.clinica.price_note')}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-base-content/40 font-medium mt-1">Facturado mensualmente</p>
                                </div>

                                {/* CTA */}
                                <button className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gray-900 hover:bg-slate-800 text-white transition-all duration-200 shadow-sm hover:shadow-md mb-5 cursor-pointer">
                                    {t('landing.pricing.plans.clinica.cta')}
                                </button>

                                {/* Features */}
                                <div className="pt-2 border-t border-base-200">
                                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-base-content/40 mb-3">
                                        Para empresas y equipos
                                    </h4>
                                    <ul className="space-y-2.5 text-xs sm:text-sm text-base-content/70">
                                        {clinicaFeatures.map((feature, idx) => (
                                            <li key={idx} className="flex items-center gap-2.5">
                                                <CheckIcon className={idx === 0 ? "bg-emerald-50 text-emerald-600" : "bg-gray-900 text-white"} />
                                                <span className={idx === 0 ? "font-bold text-emerald-600" : "font-medium"}>
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 pb-4 text-center">
                            <span className="text-[11px] text-base-content/40 font-medium">Contrato flexible • Facturación corporativa</span>
                        </div>
                    </div>

                </div>

                {/* Trust Banner */}
                <div className="mt-14 max-w-4xl mx-auto p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-base-300/80 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-base-content">Garantía de Satisfacción Nutringest</h4>
                            <p className="text-sm text-base-content/60 mt-0.5">
                                {t('landing.pricing.guarantee')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-base-content/60 bg-base-200/60 px-3.5 py-2 rounded-xl border border-base-300/60 shrink-0">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Pagos protegidos con cifrado SSL 256-bit</span>
                    </div>
                </div>

            </div>
        </section>
    );
};
