"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { ArmstrongResource } from "@/features/nutringest/campus/components/ArmstrongResource";
import { PorcionResource } from "@/features/nutringest/campus/components/PorcionResource";
import { JarraResource } from "@/features/nutringest/campus/components/JarraResource";
import { HambreDiarioResource } from "@/features/nutringest/campus/components/HambreDiarioResource";
import { MasterclassAntropometriaResource } from "@/features/nutringest/campus/components/MasterclassAntropometriaResource";
import { ExcelPrescripcionResource } from "@/features/nutringest/campus/components/ExcelPrescripcionResource";
import { useEffect } from "react";

export default function CampusRecursoPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("print") === "true") {
            const timer = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [id]);

    const handleExport = () => {
        window.print();
    };

    const renderResource = () => {
        switch (id) {
            case "armstrong":
                return <ArmstrongResource />;
            case "porcion":
                return <PorcionResource />;
            case "jarra":
                return <JarraResource />;
            case "hambre-diario":
                return <HambreDiarioResource />;
            case "masterclass_antropometria":
                return <MasterclassAntropometriaResource />;
            case "excel_prescripcion_pro":
                return <ExcelPrescripcionResource />;
            default:
                return (
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold text-gray-900">Recurso no encontrado</h2>
                        <p className="text-gray-600 mt-2">El recurso educativo solicitado no existe o no está disponible.</p>
                        <button
                            onClick={() => router.push("/dashboard/campus")}
                            className="mt-6 px-4 py-2 bg-gray-900 text-white font-bold rounded-lg border-2 border-black zine-shadow hover:bg-gray-800 transition-all"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 text-gray-900 pb-12 relative overflow-x-hidden">
            {/* Marca de agua de fondo gigante para la web (no-print) */}
            <div className="no-print absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.02]">
                <img 
                    src="/png/IsologoNegro.png" 
                    alt="Nutringest Watermark" 
                    className="w-[600px] md:w-[800px] object-contain select-none" 
                />
            </div>

            {/* Controles Flotantes Superiores (no-print) */}
            <div className="no-print w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-30">
                {/* Botón Volver */}
                <button
                    onClick={() => router.push("/dashboard/campus")}
                    className="flex items-center justify-center p-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title="Volver"
                >
                    <ArrowLeft size={20} className="stroke-[2.5] text-slate-700" />
                </button>

                {/* Botón Exportar PDF */}
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#8b5cf6] hover:to-[#7c3aed] text-white font-black uppercase text-xs sm:text-sm tracking-wider rounded-2xl shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
                >
                    <Printer size={18} className="stroke-[2.5]" />
                    <span>Exportar PDF</span>
                </button>
            </div>

            {/* Inyección de estilos de impresión globales para recursos */}
            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    body {
                        background-color: white !important;
                        color: #1a1a1a !important;
                        font-size: 12px !important;
                    }
                    .zine-shadow, .zine-shadow-sm, .shadow-md {
                        box-shadow: none !important;
                        border-width: 2px !important;
                        transform: none !important;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

            {/* Contenido principal del recurso */}
            <main className="max-w-5xl mx-auto px-4 pt-2 relative z-10">
                {renderResource()}
            </main>
        </div>
    );
}
