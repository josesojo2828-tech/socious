import { Image } from "@/shared/components/atoms/Image";

// --- Loading Component ---
export const LoadingScreen = ({ show }: { show: boolean }) => (
    <div
        // Usamos 'fixed inset-0 z-[100]' para cubrir todo.
        // 'transition-all duration-700' es la clave para el desvanecimiento suave.
        // Si 'show' es falso, aplicamos opacidad 0 y 'pointer-events-none' para que no bloquee clicks mientras desaparece.
        className={`fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${show ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
            }`}
    >
        <div className="relative flex flex-col items-center">
            {/* Un destello sutil detrás del logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full animate-pulse" style={{ animationDuration: '3s' }} />

            {/* El Logo con una animación suave de flotación */}
            <div className="relative z-10 animate-[bounce_3s_ease-in-out_infinite]">
                <Image alt='Nutringest Logo' src="/wlogo.png" width={180} height={120} className="drop-shadow-2xl" />
            </div>

            {/* Una barra de carga minimalista y elegante debajo */}
            <div className="mt-12 h-1 w-48 bg-slate-800/50 rounded-full overflow-hidden relative z-10">
                <div className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 animate-[shimmer_2s_linear_infinite]" style={{ backgroundSize: '200% 100%' }}></div>
            </div>
        </div>

        {/* Estilos específicos para las animaciones de carga */}
        <style jsx>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
    </div>
);