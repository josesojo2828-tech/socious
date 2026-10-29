"use client";

export const JarraResource = () => {
    return (
        <div className="w-full max-w-4xl mx-auto flex justify-center py-4">
            {/* Contenedor de la Ficha con marca de agua y logo superpuestos */}
            <div className="w-full relative aspect-[1/1.333] rounded-[2.5rem] border border-black/5 shadow-2xl overflow-hidden bg-white">
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
                    src="/png/campus/jarra-2.png" 
                    alt="Jarra del Buen Beber" 
                    className="w-full h-full object-contain relative z-0" 
                />
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
