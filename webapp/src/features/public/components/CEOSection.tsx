import React from 'react';
import { Quote, Sparkles, Activity, Brain, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/context/i18n.context";

export const CeoSection: React.FC = () => {
    const { t } = useTranslation();
    return (
        <section className="relative py-24 bg-slate-50 overflow-hidden">
            {/* Elemento decorativo de fondo (Blob) */}
            <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-3xl z-0" />

            <div className="container mx-auto px-4 lg:px-8 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                    {/* Columna de Imagen (Izquierda) */}
                    <div className="w-full lg:w-1/2 relative group">
                        <div className="absolute top-1/2 left-0 w-64 h-64 bg-emerald-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob z-0"></div>
                        <div className="absolute top-1/2 right-10 w-64 h-64 bg-teal-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 z-0"></div>

                        <div className="relative rounded-4xl overflow-hidden shadow-2xl bg-white aspect-4/5 lg:aspect-square">
                            {/* AQUÍ VA LA FOTO REAL DE WINDER */}
                            <img
                                src="/ceo.jpeg"
                                alt="Lic. Winder Gonzalez"
                                className="w-full h-full object-cover object-center"
                            />

                            {/* Card flotante sobre la imagen */}
                            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-lg">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                                        <Quote size={24} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 italic">
                                        {t('landing.ceo.quote')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna de Texto (Derecha) */}
                    <div className="w-full lg:w-1/2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold tracking-widest uppercase mb-6">
                            <Sparkles size={14} />
                            {t('landing.ceo.badge')}
                        </div>

                        <h2 className="text-4xl lg:text-5xl font-extrabold text-slate-900 mb-2 leading-tight">
                            {t('landing.ceo.name_p1')} <span className="text-emerald-500">{t('landing.ceo.name_highlight')}</span>
                        </h2>
                        <p className="text-xl text-slate-500 font-medium mb-8">
                            {t('landing.ceo.role')}
                        </p>

                        <div className="prose prose-lg text-slate-600 mb-8 leading-relaxed">
                            <p className="mb-4">
                                {t('landing.ceo.bio_p1')} <span className="font-bold text-slate-800">{t('landing.ceo.bio_highlight1')}</span>
                                {t('landing.ceo.bio_p2')} <span className="font-bold text-emerald-600">{t('landing.ceo.bio_highlight2')}</span>
                                {t('landing.ceo.bio_p3')} <span className="inline-block bg-orange-100 text-orange-700 px-1 italic font-bold transform -skew-x-12">{t('landing.ceo.bio_highlight3')}</span>
                                {t('landing.ceo.bio_p4')}
                            </p>
                        </div>

                        {/* Badges de Especialidad */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-emerald-200 transition-colors">
                                <Brain className="text-emerald-500 mt-1 shrink-0" size={20} />
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">{t('landing.ceo.specialties.psycho.title')}</h4>
                                    <p className="text-xs text-slate-500 mt-1">{t('landing.ceo.specialties.psycho.desc')}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-emerald-200 transition-colors">
                                <Activity className="text-emerald-500 mt-1 shrink-0" size={20} />
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">{t('landing.ceo.specialties.sports.title')}</h4>
                                    <p className="text-xs text-slate-500 mt-1">{t('landing.ceo.specialties.sports.desc')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};