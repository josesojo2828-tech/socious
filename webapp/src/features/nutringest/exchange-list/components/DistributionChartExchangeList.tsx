import { ExchangeListDistribution } from "../types/exchange-list.dashbaord.type";

export const DistributionChart = ({ data }: { data: ExchangeListDistribution[] }) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-base-content/50 py-10 flex flex-col items-center justify-center h-full">No hay datos de grupos aún.</div>;
    }

    // Encontramos el valor máximo para calcular los porcentajes relativos
    const maxCount = Math.max(...data.map(d => d.count), 1);

    // Tomamos solo los top 6 para no saturar la vista si hay muchas listas
    const topData = data.slice(0, 6);

    return (
        <div className="space-y-5 my-auto">
            {topData.map((item) => (
                <div key={item.name} className="group relative">
                    <div className="flex justify-between text-sm mb-2 relative z-10">
                        <span className="font-medium text-base-content truncate pr-4">{item.name}</span>
                        <span className="text-base-content/70 text-xs whitespace-nowrap">{item.count} opciones</span>
                    </div>
                    {/* Fondo de la barra */}
                    <div className="h-3 bg-base-200 rounded-r-full overflow-hidden relative">
                        {/* Barra de progreso animada */}
                        <div
                            className="h-full bg-emerald-500 rounded-r-full transition-all duration-1000 ease-out group-hover:bg-emerald-600 relative"
                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                        >
                            {/* Efecto de brillo sutil en la barra */}
                            <div className="absolute inset-0 bg-white/20 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </div>
                </div>
            ))}
            {data.length > 6 && (
                <p className="text-center text-xs text-base-content/50 pt-2">
                    y {data.length - 6} grupos más...
                </p>
            )}
        </div>
    );
};