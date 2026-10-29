import React from "react";
import { CheckCircle, File, RefreshCcw, Smartphone, Utensils, Activity, BellRing, Menu } from "lucide-react";
import { useTranslation } from "@/context/i18n.context";

// Asumo que FeatureProps viene de tu archivo de tipos
interface FeatureProps {
    icon: any;
    title: string;
    description: string;
    color: string;
}

export const FeaturesSection: React.FC = () => {
    const { t } = useTranslation();

    const featuresData: FeatureProps[] = [
        {
            icon: Utensils,
            title: t('landing.features.items.menus.title'),
            description: t('landing.features.items.menus.description'),
            color: "emerald"
        },
        {
            icon: RefreshCcw,
            title: t('landing.features.items.exchanges.title'),
            description: t('landing.features.items.exchanges.description'),
            color: "purple"
        },
        {
            icon: Activity,
            title: t('landing.features.items.monitoring.title'),
            description: t('landing.features.items.monitoring.description'),
            color: "orange"
        },
        {
            icon: File,
            title: t('landing.features.items.new_features.title'),
            description: t('landing.features.items.new_features.description'),
            color: "sky"
        }
    ];

    // Mapeo de colores para Tailwind v4 / v3 dinámico
    const colorStyles: Record<string, string> = {
        emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
        purple: "bg-purple-50 text-purple-600 ring-purple-100",
        orange: "bg-orange-50 text-orange-600 ring-orange-100",
        sky: "bg-sky-50 text-sky-600 ring-sky-100",
    };

    // Lista de beneficios para mostrar DENTRO del teléfono
    const benefitsList = [
        t('landing.features.benefits.0'),
        t('landing.features.benefits.1'),
        "Recordatorios automáticos de citas",
        "Chat directo con el especialista",
        "Visualización de progreso en tiempo real"
    ];

    const date = new Date();
    const customDate = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    return (
        <section id="features" className="py-24 bg-slate-50/50 relative overflow-hidden">
             {/* Decoración de fondo */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
                <div className="absolute top-24 left-10 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-24 right-10 w-72 h-72 bg-sky-200/20 rounded-full blur-3xl"></div>
            </div>

            <div className="container mx-auto px-4 md:px-8">
                {/* Header Section - Sin cambios */}
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-emerald-600 font-bold tracking-[0.2em] uppercase text-xs mb-4">
                        {t('landing.features.badge')}
                    </h2>
                    <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                        {t('landing.features.title_p1')}{" "}
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-600 to-teal-500">
                            {t('landing.features.title_highlight')}
                        </span>
                    </h3>
                    <p className="text-lg text-slate-600 leading-relaxed">
                        {t('landing.features.subtitle')}
                    </p>
                </div>

                {/* Grid de Características - Sin cambios */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
                    {featuresData.map((feature, index) => (
                        <div key={index} className="group relative bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ring-4 ${colorStyles[feature.color]} transition-transform group-hover:scale-110`}>
                                <feature.icon size={24} strokeWidth={2.5} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h4>
                            <p className="text-slate-500 leading-relaxed text-sm">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* SECCIÓN CENTRAL DEL TELÉFONO */}
                <div className="flex justify-center">
                    {/* Contenedor con perspectiva para el efecto 3D.
                        Define el ancho máximo del teléfono.
                    */}
                    <div className="relative w-full max-w-[380px] perspective-[2000px] group">
                        
                        {/* Glow Effect detrás del teléfono */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] bg-linear-to-tr from-emerald-500/30 to-teal-400/30 blur-[60px] -z-10 rounded-full lg:group-hover:scale-110 transition-transform duration-500"></div>

                        {/* El Marco del Teléfono
                            - Móvil: w-full, max-h-[75vh] (evita que sea eterno), sin rotación.
                            - Desktop (lg:): Altura automática, rotación 3D, transición suave al hover.
                        */}
                        <div className="relative bg-slate-900 rounded-[2.5rem] p-3 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-4 border-slate-800 ring-1 ring-slate-700/50
                                        w-full max-h-[75vh] flex flex-col
                                        lg:max-h-none lg:aspect-[9/18] lg:transform-gpu lg:rotate-y-[-15deg] lg:rotate-x-[5deg] lg:group-hover:rotate-y-[-10deg] lg:group-hover:rotate-x-[2deg] transition-all duration-500 ease-out">
                            
                            {/* Notch y Sensores */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-slate-900 rounded-b-3xl z-20 flex justify-center items-start pt-1">
                                <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
                            </div>
                            
                            {/* Pantalla Interior (Scrollable en móvil si es necesario) */}
                            <div className="bg-slate-50 rounded-[1.8rem] overflow-hidden flex-1 relative overflow-y-auto scrollbar-hide font-sans flex flex-col">
                                
                                {/* App Status Bar Mock */}
                                <div className="bg-white px-5 pt-4 pb-2 flex justify-between items-center text-xs font-medium text-slate-900 z-10 relative border-b border-slate-100">
                                    <span>{customDate}</span>
                                    <div className="flex gap-1.5">
                                        <Activity size={12} />
                                        <Smartphone size={12} />
                                    </div>
                                </div>
                                
                                {/* App Header */}
                                <div className="bg-white p-5 pt-2 pb-4 flex justify-between items-center shadow-xs relative z-10">
                                    <div>
                                        <h5 className="text-sm text-slate-500">Bienvenido,</h5>
                                        <h4 className="text-xl font-bold text-slate-900">{t('landing.features.connected_patients')}</h4>
                                    </div>
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center relative">
                                        <BellRing size={20} className="text-slate-600" />
                                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                    </div>
                                </div>

                                {/* App Body Content */}
                                <div className="p-5 flex-1 bg-slate-50/80 space-y-5">
                                    {/* Un widget de ejemplo */}
                                    <div className="bg-linear-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
                                        <div className="flex justify-between items-start mb-4">
                                            <h5 className="font-semibold text-lg">Tu Plan Hoy</h5>
                                            <Menu size={20} className="text-emerald-100" />
                                        </div>
                                        <div className="flex gap-3 mt-2">
                                            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 text-sm font-medium">🍏 Media Mañana</div>
                                        </div>
                                    </div>

                                    {/* La lista de beneficios transformada en UI de App */}
                                    <div>
                                        <h6 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider ml-1">Beneficios Activos</h6>
                                        <div className="space-y-3">
                                            {benefitsList.map((item, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-100 shadow-xs">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                        <CheckCircle size={16} className="text-emerald-600" strokeWidth={3} />
                                                    </div>
                                                    <span className="text-slate-700 font-medium text-sm leading-tight">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* App Bottom Nav Mock (Opcional) */}
                                <div className="bg-white border-t border-slate-100 p-4 flex justify-around items-center text-slate-400 sticky bottom-0">
                                     <div className="w-full h-1 bg-slate-200 rounded-full mx-auto max-w-[100px]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};