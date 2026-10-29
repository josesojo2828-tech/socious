"use client";

import { BookOpen, Sparkles, Users, BrainCircuit, HeartPulse, ClipboardList } from "lucide-react";

const BENEFICIOS = [
    {
        icon: BookOpen,
        title: "Recursos didácticos",
        description:
            "Fichas visuales y guías descargables diseñadas para tu formación clínica diaria.",
        color: "from-[#7c3aed] to-[#6d28d9]",
        bg: "bg-purple-500/10",
        textColor: "text-purple-300",
    },
    {
        icon: BrainCircuit,
        title: "Herramientas clínicas",
        description:
            "Escalas validadas, métodos de porcionado y evaluaciones listas para usar con tus pacientes.",
        color: "from-[#34d399] to-[#10b981]",
        bg: "bg-emerald-500/10",
        textColor: "text-[#34d399]",
    },
    {
        icon: Users,
        title: "Comunidad estudiantil",
        description:
            "Sumate a una red de futuros nutricionistas que comparten recursos y experiencias.",
        color: "from-[#3b82f6] to-[#1d4ed8]",
        bg: "bg-blue-500/10",
        textColor: "text-blue-300",
    },
    {
        icon: HeartPulse,
        title: "Nutrición basada en evidencia",
        description:
            "Todo el contenido está respaldado por guías oficiales y literatura científica actualizada.",
        color: "from-[#ec4899] to-[#be185d]",
        bg: "bg-pink-500/10",
        textColor: "text-pink-300",
    },
    {
        icon: ClipboardList,
        title: "Material descargable",
        description:
            "Descargá cada recurso en formato PDF optimizado para impresión y uso en consulta.",
        color: "from-[#06b6d4] to-[#0891b2]",
        bg: "bg-cyan-500/10",
        textColor: "text-cyan-300",
    },
    {
        icon: Sparkles,
        title: "Actualización constante",
        description:
            "Agregamos nuevos recursos periódicamente para mantenerte al día en tu formación.",
        color: "from-[#f59e0b] to-[#d97706]",
        bg: "bg-amber-500/10",
        textColor: "text-amber-300",
    },
];

export function CampusMessages() {
    return (
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
            {/* Luces de fondo */}
            <div className="absolute top-1/2 left-1/2 -z-10 opacity-15 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-[600px] h-[600px] rounded-full bg-[#7c3aed] blur-[150px]" />
            </div>

            {/* Header */}
            <div className="text-center mb-14">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#34d399] bg-[#34d399]/10 px-4 py-2 border border-[#34d399]/20 rounded-full">
                    ¿Por qué Campus Nutringest?
                </span>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-6 bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    Todo lo que necesitás para tu práctica
                </h2>
                <p className="mt-4 text-base font-semibold text-white/50 max-w-xl mx-auto">
                    Herramientas diseñadas para estudiantes de nutrición que quieren ir un paso
                    adelante.
                </p>
            </div>

            {/* Grid de beneficios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {BENEFICIOS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.title}
                            className="group p-6 bg-white/[0.04] border border-white/10 rounded-[2rem] backdrop-blur-sm hover:bg-white/[0.07] hover:border-white/20 transition-all duration-500 hover:-translate-y-1"
                        >
                            <div
                                className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mb-4`}
                            >
                                <Icon size={22} className={item.textColor} />
                            </div>
                            <h3 className="font-heading font-black text-lg uppercase tracking-tight text-white group-hover:text-[#34d399] transition-colors">
                                {item.title}
                            </h3>
                            <p className="mt-2 text-sm font-medium text-white/50 leading-relaxed">
                                {item.description}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
