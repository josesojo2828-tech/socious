import { DashboardCard } from "../../components/DashboardCard";

export const StatCardExchangeList = ({ title, value, subLabel, icon: Icon, colorClass, loading }: any) => {
    if (loading) {
        // Skeleton loading
        return (
            <DashboardCard className="p-5 h-32 animate-pulse flex flex-col justify-between">
                <div className="h-4 bg-base-200 w-1/2 rounded"></div>
                <div className="h-8 bg-base-300 w-3/4 rounded"></div>
                <div className="h-4 bg-base-200 w-1/3 rounded"></div>
            </DashboardCard>
        );
    }

    return (
        <DashboardCard className="p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-base-content/50 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-base-content truncate" title={String(value)}>{value}</h3>
                {subLabel && (
                    <div className="flex items-center mt-2 text-xs font-medium text-base-content/70 truncate">
                        {subLabel}
                    </div>
                )}
            </div>
            {/* Icono con fondo de color sólido */}
            <div className={`p-3 rounded-lg ${colorClass} text-white shadow-sm shrink-0 ml-2`}>
                <Icon size={24} />
            </div>
        </DashboardCard>
    );
};