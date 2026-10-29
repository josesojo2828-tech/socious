import Link from 'next/link';
import { Settings, Clock, MessageCircle, ArrowLeft } from 'lucide-react';
import { Text } from "@/shared/components/atoms/Text";
import { Button } from "@/shared/components/atoms/Button";

export default function MaintenancePage() {
    return (
        <main className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-6">
            <div className="container max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* LADO IZQUIERDO: Información */}
                <div className="flex flex-col items-start space-y-6">
                    {/* Badge al estilo Lcdo. Winder */}
                    <div className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1.5 border border-emerald-200">
                        <Settings className="w-4 h-4 text-emerald-600 mr-2 animate-spin-slow" />
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                            Mejorando para ti
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight">
                        Estamos <span className="text-emerald-500">optimizando</span> tu panel.
                    </h1>

                    <p className="text-lg text-slate-500 max-w-md leading-relaxed">
                        Nutringest se está actualizando para ofrecerte herramientas más rápidas y precisas. Volveremos en unos minutos.
                    </p>
                </div>

                {/* LADO DERECHO: Visual (Estilo Tarjeta Dark Nutringest) */}
                <div className="relative">
                    {/* Tarjeta Principal Oscura */}
                    <div className="relative z-10 bg-[#1A202C] rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-slate-700 overflow-hidden">

                        {/* Decoración de fondo (glow verde) */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] -z-10"></div>

                        <div className="space-y-8">
                            {/* Header de la tarjeta */}
                            <div className="flex justify-between items-center">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                </div>
                                <Text className="text-slate-500 text-xs font-mono">system_update.v2</Text>
                            </div>

                            {/* Indicador de Progreso Estilizado */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                                <div className="flex justify-between mb-4">
                                    <Text className="text-white font-bold">Progreso de actualización</Text>
                                    <Text className="text-emerald-400 font-bold">85%</Text>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                                    <div className="bg-emerald-500 h-full w-[85%] rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                                </div>
                            </div>

                            {/* Lista de tareas (Estilo Dashboard) */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                                    <Clock className="text-emerald-400 w-5 h-5" />
                                    <div>
                                        <p className="text-white text-sm font-bold">Base de datos optimizada</p>
                                        <p className="text-emerald-400/60 text-xs">Completado</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 opacity-60">
                                    <Settings className="text-slate-400 w-5 h-5 animate-spin" />
                                    <div>
                                        <p className="text-slate-300 text-sm font-bold">Migración de archivos...</p>
                                        <p className="text-slate-500 text-xs">En curso</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Elementos Flotantes (Estilo Hero) */}
                    <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl z-20 hidden md:flex items-center gap-3 border border-slate-100">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <Settings className="text-purple-600 w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Estimado</p>
                            <p className="text-sm font-black text-slate-900">20 min restantes</p>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}