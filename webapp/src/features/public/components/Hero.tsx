import React from "react";
import { ChevronRight, Star, Calendar, CheckCircle2, Clock, Zap, ArrowRight } from "lucide-react";
import { useTranslation } from "@/context/i18n.context";

export const Hero: React.FC = () => {
    const { t } = useTranslation();

    return (
        <section className="relative min-h-screen flex items-center pt-20 pb-12 overflow-hidden bg-white">
            {/* Fondo dinámico */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-200/30 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-sky-200/30 rounded-full blur-[100px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            </div>

            <div className="container mx-auto px-6 lg:px-8 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

                    {/* COLUMNA IZQUIERDA: TEXTO */}
                    <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm transition-all hover:bg-emerald-100/50 cursor-default">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-bold text-emerald-700 tracking-wide uppercase">
                                {t('landing.hero.badge_text_p1')} {t('landing.hero.badge_text_highlight')}
                            </span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
                            {t('landing.hero.title_p1')}{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                                {t('landing.hero.title_highlight')}
                            </span>{" "}
                            {t('landing.hero.title_p2')}
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                            {t('landing.hero.subtitle')}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            <button className="group btn h-14 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2 border-none">
                                <span className="font-bold">{t('landing.hero.cta')}</span>
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>

                            <div className="flex items-center justify-center gap-3 px-4">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                                            <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="User" />
                                        </div>
                                    ))}
                                </div>
                                <div className="text-left">
                                    <div className="flex text-amber-400">
                                        {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={12} fill="currentColor" />)}
                                    </div>
                                    <p className="text-xs font-bold text-slate-500">+500 nutricionistas confían</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: DASHBOARD + TIEMPO */}
                    <div className="flex-1 w-full relative">
                        {/* Widget de Ahorro de Tiempo (Solo Móvil: aparece arriba del Dashboard / Desktop: Flota) */}
                        <div className="lg:absolute -top-6 lg:left-0 z-20 mb-6 lg:mb-0 transform-gpu hover:scale-105 transition-transform">
                            <div className="bg-white/80 backdrop-blur-md border border-emerald-100 rounded-3xl p-4 shadow-2xl flex items-center gap-4 max-w-[280px] mx-auto lg:mx-0">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                    <Zap size={24} fill="currentColor" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tiempo Ganado</p>
                                    <p className="text-xl font-black text-slate-800 tracking-tight">3.5h <span className="text-emerald-500 text-sm">/ día</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Contenedor 3D adaptativo */}
                        <div className="relative perspective-[2000px]">
                            <div className="relative transform-gpu lg:rotate-y-[-15deg] lg:rotate-x-[8deg] transition-all duration-700">

                                {/* Mockup Principal */}
                                <div className="bg-slate-900 rounded-[2.5rem] p-3 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border border-slate-700/50">
                                    <div className="bg-slate-800 rounded-[1.8rem] p-4 aspect-[4/3] sm:aspect-video lg:aspect-square xl:aspect-video overflow-hidden relative group">

                                        {/* Comparativa de Tiempo Visual */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-6">
                                            {/* Fila Antes */}
                                            <div className="w-full bg-slate-700/30 rounded-2xl p-4 border border-slate-600/50 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-600/50 flex items-center justify-center"><Clock size={16} className="text-slate-400" /></div>
                                                    <span className="text-slate-300 font-medium">Planificación Manual</span>
                                                </div>
                                                <span className="text-slate-400 font-mono text-sm">~45 min</span>
                                            </div>

                                            {/* Flecha de Conexión */}
                                            <div className="h-8 w-px bg-gradient-to-b from-slate-600 to-emerald-500 relative">
                                                <div className="absolute -bottom-1 -left-[3px] w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                                            </div>

                                            {/* Fila Después */}
                                            <div className="w-full bg-emerald-500/10 rounded-2xl p-5 border border-emerald-500/40 flex items-center justify-between shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white"><Zap size={20} fill="white" /></div>
                                                    <span className="text-emerald-50 font-bold">Gracias a Nutringest</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-emerald-400 font-mono font-black text-xl">12 seg</span>
                                                    <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-tighter">99% más rápido</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Elementos Flotantes (Solo Desktop para no saturar móvil) */}
                                <div className="hidden lg:block">
                                    {/* Card: Próxima Cita */}
                                    <div className="absolute -top-10 -right-12 w-48 bg-white rounded-2xl p-4 shadow-2xl border border-slate-100 animate-float">
                                        <div className="flex items-center gap-3 mb-2 text-emerald-600">
                                            <Calendar size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Dashboard</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800">Carga completada</p>
                                        <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full w-full bg-emerald-500"></div>
                                        </div>
                                    </div>

                                    {/* Floating Notification */}
                                    <div className="absolute -bottom-8 -left-12 bg-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-3 animate-float-delayed">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <CheckCircle2 size={18} className="text-emerald-600" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">Paciente ahorró 15min</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Decoración inferior */}
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-slate-50 to-transparent"></div>
        </section>
    );
};