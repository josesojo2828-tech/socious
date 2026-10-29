"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight, CheckCircle2 } from "lucide-react";

const REQUISITOS = [
    "Ser estudiante activo de Nutrición",
    "Completar el formulario de solicitud",
    "Adjuntar constancia de estudios o credencial",
];

export function CampusCTA() {
    const router = useRouter();

    return (
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
            {/* Luces de fondo */}
            <div className="absolute bottom-0 right-0 -z-10 opacity-25 translate-x-1/4 translate-y-1/4 pointer-events-none">
                <div className="w-[600px] h-[600px] rounded-full bg-[#34d399] blur-[150px]" />
            </div>
            <div className="absolute top-0 left-1/2 -z-10 opacity-15 -translate-x-1/2 pointer-events-none">
                <div className="w-[400px] h-[400px] rounded-full bg-[#7c3aed] blur-[120px]" />
            </div>

            <div className="relative bg-gradient-to-br from-[#7c3aed]/20 via-[#6d28d9]/10 to-transparent border border-[#7c3aed]/20 rounded-[3rem] p-8 md:p-14 overflow-hidden backdrop-blur-sm">
                {/* Decorative blob inside card */}
                <div className="absolute -top-20 -right-20 -z-10 opacity-20 pointer-events-none">
                    <div className="w-[300px] h-[300px] rounded-full bg-[#7c3aed] blur-[100px]" />
                </div>

                <div className="grid md:grid-cols-2 gap-10 items-center">
                    {/* Left: Info */}
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#34d399] bg-[#34d399]/10 px-4 py-2 border border-[#34d399]/20 rounded-full inline-block">
                            Acceso Gratuito
                        </span>

                        <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-6 bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                            ¿Sos estudiante de nutrición?
                        </h2>

                        <p className="mt-4 text-base font-semibold text-white/60 leading-relaxed">
                            Solicitá tu acceso al Campus Nutringest y llevá tu formación al
                            siguiente nivel con recursos diseñados para vos.
                        </p>

                        {/* Requisitos */}
                        <ul className="mt-8 space-y-3">
                            {REQUISITOS.map((req) => (
                                <li key={req} className="flex items-start gap-3">
                                    <CheckCircle2
                                        size={18}
                                        className="text-[#34d399] shrink-0 mt-0.5 stroke-[2.5]"
                                    />
                                    <span className="text-sm font-semibold text-white/70">{req}</span>
                                </li>
                            ))}
                        </ul>

                        {/* CTA */}
                        <button
                            onClick={() => router.push("/campus/solicitar")}
                            className="mt-10 group px-8 py-4 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#8b5cf6] hover:to-[#7c3aed] text-white font-black uppercase text-sm tracking-wider rounded-2xl shadow-lg shadow-purple-950/40 transition-all duration-300 hover:-translate-y-1 active:scale-95 cursor-pointer border-none flex items-center gap-3"
                        >
                            <GraduationCap size={18} />
                            <span>Solicitar Acceso Ahora</span>
                            <ArrowRight
                                size={18}
                                className="stroke-[2.5] transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </button>
                    </div>

                    {/* Right: Visual */}
                    <div className="hidden md:flex items-center justify-center">
                        <div className="relative w-full max-w-xs aspect-square">
                            {/* Círculos decorativos */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#7c3aed]/30 to-[#34d399]/20 blur-2xl animate-pulse" />
                            <div className="absolute inset-[15%] rounded-full bg-gradient-to-br from-[#34d399]/20 to-[#7c3aed]/30 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                                <div className="text-center">
                                    <GraduationCap size={48} className="mx-auto text-[#34d399]" />
                                    <p className="mt-3 font-heading font-black text-lg uppercase text-white">
                        Campus
                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#34d399]">
                        Nutringest
                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
