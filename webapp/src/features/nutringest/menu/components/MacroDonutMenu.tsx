import { MacroDonutProps } from "../types/menu.details";


export const MacroDonutMenu: React.FC<MacroDonutProps> = ({ p, c, f, size = 120 }) => {
    // Evitamos división por cero
    const total = (p + c + f) || 1; 
    
    const degP = (p / total) * 360;
    const degC = (c / total) * 360;
    
    // Cálculo estimado de Kcal visual (4-4-9) para el centro del donut
    const estimatedKcal = Math.round((p * 4) + (c * 4) + (f * 9));

    const backgroundStyle: React.CSSProperties = {
        background: `conic-gradient(
            #ef4444 0deg ${degP}deg, 
            #22c55e ${degP}deg ${degP + degC}deg, 
            #eab308 ${degP + degC}deg 360deg
        )`
    };

    return (
        <div 
            className="relative rounded-full flex items-center justify-center shadow-sm shrink-0 transition-all duration-500" 
            style={{ width: size, height: size, ...backgroundStyle }}
        >
            <div 
                className="bg-base-100 rounded-full flex flex-col items-center justify-center z-10" 
                style={{ width: size - 20, height: size - 20 }}
            >
                <span className="text-2xl font-black text-base-content">{estimatedKcal}</span>
                <span className="text-[10px] font-bold text-base-content/50 uppercase tracking-widest">Kcal</span>
            </div>
        </div>
    );
};