import { MenuMetricsDistribution } from "../types/menus.dashboard.type";

export const CategoryDonutMenu = ({ distribution, total }: { distribution: MenuMetricsDistribution[], total: number }) => {
    if (!total || total === 0) {
        return <div className="text-center text-base-content/50 py-10">No hay datos suficientes</div>;
    }

    // Calculamos el gradiente cónico dinámicamente basado en los datos reales
    let currentDeg = 0;
    const gradientParts = distribution.map(cat => {
        const deg = (cat.count / total) * 360;
        const part = `${cat.color} ${currentDeg}deg ${currentDeg + deg}deg`;
        currentDeg += deg;
        return part;
    });

    const gradientStyle = distribution.length > 0
        ? `conic-gradient(${gradientParts.join(', ')})`
        : '#f3f4f6'; // Gris si no hay datos

    return (
        <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
            <div
                className="w-32 h-32 rounded-full relative flex items-center justify-center shrink-0 transition-all duration-500"
                style={{ background: gradientStyle }}
            >
                <div className="w-24 h-24 bg-base-100 rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-2xl font-bold text-base-content">{total}</span>
                    <span className="text-[10px] text-base-content/50 uppercase">Menús</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {distribution.map(cat => (
                    <div key={cat.category} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-base-content/70">{cat.category}</span>
                            <span className="text-xs text-base-content/50">{cat.percentage}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
