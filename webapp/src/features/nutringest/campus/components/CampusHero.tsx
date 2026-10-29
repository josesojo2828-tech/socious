"use client";

import { GraduationCap, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function CampusHero() {
    const router = useRouter();

    return (
        <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-20 text-center">
            {/* Luces orgánicas de fondo */}
            <div className="absolute top-0 right-0 -z-10 opacity-30 translate-x-1/4 -translate-y-1/4 pointer-events-none">
                <div className="w-[700px] h-[700px] rounded-full bg-[#7c3aed] blur-[180px]" />
            </div>
            <div className="absolute top-[20%] left-0 -z-10 opacity-20 -translate-x-1/4 pointer-events-none">
                <div className="w-[500px] h-[500px] rounded-full bg-[#34d399] blur-[120px]" />
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
                <GraduationCap size={16} className="text-[#34d399]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#34d399]">
                    Campus Nutringest
                </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] max-w-4xl mx-auto">
                <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    El Campus que tu{" "}
                </span>
                <span className="bg-gradient-to-r from-[#a78bfa] via-[#7c3aed] to-[#6d28d9] bg-clip-text text-transparent">
                    formación merece
                </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg md:text-xl font-semibold text-white/60 max-w-2xl mx-auto leading-relaxed">
                Accedé a recursos didácticos exclusivos, herramientas clínicas y contenido
                actualizado para potenciar tu práctica profesional como nutricionista.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                    onClick={() => router.push("/campus/solicitar")}
                    className="group px-8 py-4 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#8b5cf6] hover:to-[#7c3aed] text-white font-black uppercase text-sm tracking-wider rounded-2xl shadow-lg shadow-purple-950/40 transition-all duration-300 hover:-translate-y-1 active:scale-95 cursor-pointer border-none flex items-center gap-3"
                >
                    <span>Solicitar Acceso</span>
                    <ArrowRight
                        size={18}
                        className="stroke-[2.5] transition-transform duration-300 group-hover:translate-x-1"
                    />
                </button>

                <button
                    onClick={() => {
                        document
                            .getElementById("campus-recursos")
                            ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold uppercase text-sm tracking-wider rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 active:scale-95 cursor-pointer"
                >
                    Explorar Recursos
                </button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                {[
                    { value: "4+", label: "Recursos didácticos" },
                    { value: "100%", label: "Gratuito para estudiantes" },
                    { value: "Actualizado", label: "Contenido clínico vigente" },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl backdrop-blur-sm"
                    >
                        <p className="text-2xl font-black text-white">{stat.value}</p>
                        <p className="text-xs font-semibold text-white/40 mt-1 uppercase tracking-wider">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
