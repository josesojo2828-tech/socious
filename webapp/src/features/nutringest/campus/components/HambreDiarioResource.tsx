"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const HambreDiarioResource = () => {
    // La página 1 está en blanco, empezamos en la página 2
    const [currentPage, setCurrentPage] = useState(2);
    const totalPages = 49;

    const handlePrev = () => {
        if (currentPage > 2) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const formatPageNum = (num: number) => String(num).padStart(2, "0");

    // Generar array de páginas para la impresión completa (páginas de la 2 a la 49)
    const printPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 py-4">
            {/* Visualizador de la Página Activa (SÓLO PANTALLA) */}
            <div className="print:hidden w-full relative aspect-[1/1.414] bg-white rounded-[2.5rem] border border-black/5 shadow-2xl overflow-hidden">
                {/* Logo de Nutringest Oficial (esquina superior derecha, opacidad 25%) */}
                <div className="absolute top-[3%] right-[4%] pointer-events-none z-10 opacity-25 w-28 sm:w-36 flex flex-col items-end">
                    <img 
                        src="/png/ImagotipoNegro.png" 
                        alt="Nutringest" 
                        className="w-full object-contain" 
                    />
                    <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-black/40 mt-1 font-heading">
                        CAMPUS OFICIAL
                    </span>
                </div>

                {/* Marca de agua institucional sutil en la esquina inferior derecha (Isologo + Texto, opacidad 20%) */}
                <div className="absolute bottom-[3%] right-[4%] pointer-events-none z-10 opacity-20 w-20 sm:w-24 flex items-center justify-end gap-1.5">
                    <span className="text-[6px] sm:text-[7px] font-bold uppercase tracking-wider text-black/45 font-heading">
                        NUTRINGEST
                    </span>
                    <img 
                        src="/png/IsologoNegro.png" 
                        alt="Nutringest Logo" 
                        className="w-3.5 h-3.5 object-contain" 
                    />
                </div>

                {/* Imagen del Recurso original en alta definición */}
                <img 
                    key={currentPage}
                    src={`/png/campus/hambre-diario-${formatPageNum(currentPage)}.png`} 
                    alt={`Diario de Hambre - Página ${currentPage}`} 
                    className="w-full h-full object-contain relative z-0"
                />

                {/* Badge de Página Flotante */}
                <div className="absolute bottom-6 right-6 bg-black/85 backdrop-blur-md text-white px-4 py-2 rounded-full border border-white/10 text-xs font-black uppercase tracking-wider shadow-lg">
                    Pág. {currentPage} / {totalPages}
                </div>
            </div>

            {/* Controles de Paginación Web (SÓLO PANTALLA) */}
            <div className="print:hidden w-full flex items-center justify-between bg-white border border-black/5 rounded-[2.5rem] p-5 shadow-2xl mt-2">
                <button
                    onClick={handlePrev}
                    disabled={currentPage === 2}
                    className={`flex items-center gap-1.5 px-5 py-3 rounded-full border border-black/10 font-bold uppercase text-xs tracking-wider transition-all cursor-pointer ${
                        currentPage === 2
                            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                            : "bg-white text-gray-700 hover:bg-gray-50 active:scale-95 shadow-sm"
                    }`}
                >
                    <ChevronLeft size={16} className="stroke-[2.5]" />
                    <span>Anterior</span>
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                        Diario de Hambre
                    </span>
                    <span className="text-sm font-black text-gray-900 mt-0.5">
                        Página {currentPage - 1} de {totalPages - 1}
                    </span>
                </div>

                <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-1.5 px-5 py-3 rounded-full border border-transparent font-bold uppercase text-xs tracking-wider transition-all cursor-pointer ${
                        currentPage === totalPages
                            ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                            : "bg-[#7c3aed] text-white hover:bg-[#6d28d9] active:scale-95 shadow-lg shadow-purple-200"
                    }`}
                >
                    <span>Siguiente</span>
                    <ChevronRight size={16} className="stroke-[2.5]" />
                </button>
            </div>

            {/* SECCIÓN COMPLETA DE IMPRESIÓN (SÓLO IMPRESIÓN / OCULTA EN WEB) */}
            <div className="hidden print:flex flex-col gap-8 w-full">
                {printPages.map((pageNum) => (
                    <div 
                        key={pageNum} 
                        className="w-full relative aspect-[1/1.414] bg-white overflow-hidden page-break-after-always"
                    >
                        {/* Logo de Nutringest Oficial (esquina superior derecha, opacidad 25%) */}
                        <div className="absolute top-[3%] right-[4%] pointer-events-none z-10 opacity-25 w-36 flex flex-col items-end">
                            <img 
                                src="/png/ImagotipoNegro.png" 
                                alt="Nutringest" 
                                className="w-full object-contain" 
                            />
                            <span className="text-[9px] font-black uppercase tracking-widest text-black/40 mt-1 font-heading">
                                CAMPUS OFICIAL
                            </span>
                        </div>

                        {/* Marca de agua institucional sutil en la esquina inferior derecha (Isologo + Texto, opacidad 20%) */}
                        <div className="absolute bottom-[3%] right-[4%] pointer-events-none z-10 opacity-20 w-20 sm:w-24 flex items-center justify-end gap-1.5">
                            <span className="text-[6px] sm:text-[7px] font-bold uppercase tracking-wider text-black/45 font-heading">
                                NUTRINGEST
                            </span>
                            <img 
                                src="/png/IsologoNegro.png" 
                                alt="Nutringest Logo" 
                                className="w-3.5 h-3.5 object-contain" 
                            />
                        </div>

                        {/* Imagen del Recurso original en alta definición */}
                        <img 
                            src={`/png/campus/hambre-diario-${formatPageNum(pageNum)}.png`} 
                            alt={`Diario de Hambre - Página ${pageNum}`} 
                            className="w-full h-full object-contain relative z-0"
                        />
                    </div>
                ))}
            </div>

            {/* Estilos específicos de impresión */}
            <style jsx global>{`
                @media print {
                    .max-w-4xl {
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .page-break-after-always {
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    /* Forzar a que los fondos y elementos absolutos se impriman */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
        </div>
    );
};
