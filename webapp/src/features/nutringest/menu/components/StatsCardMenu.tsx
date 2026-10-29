import { DashboardCard } from "../../components/DashboardCard";

export const StatsCardMenu = ({ title, value, subLabel, icon: Icon, colorClass, loading }: any) => {
    if (loading) {
        return (
            <DashboardCard className="p-5 h-32 animate-pulse flex flex-col justify-between">
                <div className="h-4 bg-base-200 w-1/2 rounded"></div>
                <div className="h-8 bg-base-200 w-3/4 rounded"></div>
            </DashboardCard>
        );
    }

    return (
        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-base-content">{value}</h3>
                {subLabel && (
                    <div className="flex items-center mt-2 text-xs font-medium text-base-content/70">
                        {/* Aquí podrías agregar lógica de tendencias si el backend la devuelve */}
                        <span className="bg-base-200 px-2 py-0.5 rounded text-base-content/70">{subLabel}</span>
                    </div>
                )}
            </div>
            <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10 text-opacity-100`}>
                <Icon size={22} className={colorClass.replace('bg-', 'text-')} />
            </div>
        </DashboardCard>
    );
};
