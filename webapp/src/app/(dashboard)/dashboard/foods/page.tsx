"use client";

import { useRouter } from "next/navigation";
import { FoodEndpoints } from "@/features/nutringest/food/services/food.endpoint";
import { GenerateCrud } from "@/shared/components/organisms/crud";
import {
    Database,
    Leaf,
    Zap,
    AlertCircle,
    CheckCircle2,
    BarChart3,
    ArrowUpRight,
    Scale
} from 'lucide-react';
import { Text } from "@/shared/components/atoms/Text";
import { DashboardCard } from "@/features/nutringest/components/DashboardCard";
import { CategoryBarChart } from "@/features/nutringest/food/components/CategoryBarChartFood";
import { useFoodMetrics } from "@/features/nutringest/food/hooks/useDashbaordFood";
import { StatCard } from "@/features/nutringest/food/components/StatCardFood";

import { useTranslation } from "@/context/i18n.context";

export default function FoodDashboard() {
    const { t } = useTranslation();
    const router = useRouter();
    const { data, loading, error } = useFoodMetrics();

    const HandleFicha = (id: string, _delete: any, _update: any) => {
        router.push(`/dashboard/foods/${id}`);
    }

    // Valores por defecto para evitar errores si 'metrics' es null durante la carga
    const stats = data?.overview || { totalFoods: 0, systemFoods: 0, needsReview: 0, userFoods: 0 };
    const quality = data?.dataQuality || { fiberCompletion: 0, sodiumCompletion: 0, ironCompletion: 0 };
    const averages = data?.averages || { avgCalories: 0, avgProtein: 0 };

    return (
        <div className="min-h-screen bg-base-200/50 p-6 md:p-8 font-sans text-base-content">

            {/* 1. HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <Text variant="h2" className="flex items-center gap-2">
                        <Leaf className="text-green-600" size={35} />
                        {t('dashboard.foods.title')}
                    </Text>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title={t('dashboard.foods.total_records')}
                    value={loading ? "..." : stats.totalFoods}
                    subtext={<span className="text-green-600 flex items-center gap-1"><ArrowUpRight size={14} /> {t('dashboard.foods.active')}</span>}
                    icon={Database}
                    colorClass="bg-green-500/20 text-green-600"
                />
                <StatCard
                    title={t('dashboard.foods.verified')}
                    value={loading ? "..." : stats.systemFoods}
                    subtext={t('dashboard.foods.system_data')}
                    icon={CheckCircle2}
                    colorClass="bg-emerald-500/20 text-emerald-600"
                />
                <StatCard
                    title={t('dashboard.foods.needs_review')}
                    value={loading ? "..." : stats.needsReview}
                    subtext={t('dashboard.foods.possible_errors')}
                    icon={AlertCircle}
                    colorClass="bg-orange-500/20 text-orange-600"
                />
                {/* Nota: Cambié IG por Calorías Promedio ya que FoodItem no tiene IG en el esquema */}
                <StatCard
                    title={t('dashboard.foods.avg_calories')}
                    value={loading ? "..." : `${averages.avgCalories} kcal`}
                    subtext={t('dashboard.foods.energy_density')}
                    icon={Scale}
                    colorClass="bg-purple-500/20 text-purple-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

                {/* CHART DE CATEGORÍAS (Viene de FoodExchangeList, pero se visualiza aquí según tu diseño) */}
                <DashboardCard className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-base-content">{t('dashboard.foods.category_dist')}</h3>
                        <button className="text-base-content/50 hover:text-green-600"><BarChart3 size={18} /></button>
                    </div>
                    <p className="text-xs text-base-content/70 mb-4">{t('dashboard.foods.based_on')}</p>
                    <CategoryBarChart />
                </DashboardCard>

                {/* HEALTH SCORE CARD - Conectado a metrics.dataQuality */}
                <DashboardCard className="p-6 lg:col-span-2 bg-linear-to-br from-base-100 to-green-500/5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-base-content flex items-center gap-2">
                            <Zap size={18} className="text-yellow-500 fill-yellow-500" />
                            {t('dashboard.foods.db_quality')}
                        </h3>
                        {!loading && (
                            <span className={`px-2 py-1 rounded text-xs font-bold ${quality.fiberCompletion > 80 ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400'}`}>
                                {quality.fiberCompletion > 80 ? t('dashboard.foods.healthy') : t('dashboard.foods.improvable')}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {/* MÉTRICA 1: Completitud de Fibra */}
                        <div className="p-4 bg-base-100 rounded-lg border border-base-300 shadow-sm">
                            <span className="text-xs text-base-content/50 font-bold uppercase">{t('dashboard.foods.fiber_data')}</span>
                            <div className="mt-2 h-2 w-full bg-base-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all duration-1000"
                                    style={{ width: `${quality.fiberCompletion}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-base-content/70 mt-2">{quality.fiberCompletion}{t('dashboard.foods.completed')}</p>
                        </div>

                        {/* MÉTRICA 2: Completitud de Sodio */}
                        <div className="p-4 bg-base-100 rounded-lg border border-base-300 shadow-sm">
                            <span className="text-xs text-base-content/50 font-bold uppercase">{t('dashboard.foods.sodium_data')}</span>
                            <div className="mt-2 h-2 w-full bg-base-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-1000"
                                    style={{ width: `${quality.sodiumCompletion}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-base-content/70 mt-2">{quality.sodiumCompletion}{t('dashboard.foods.completed')}</p>
                        </div>

                        {/* MÉTRICA 3: Completitud de Hierro */}
                        <div className="p-4 bg-base-100 rounded-lg border border-base-300 shadow-sm">
                            <span className="text-xs text-base-content/50 font-bold uppercase">{t('dashboard.foods.iron_data')}</span>
                            <div className="mt-2 h-2 w-full bg-base-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-yellow-400 transition-all duration-1000"
                                    style={{ width: `${quality.ironCompletion}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-base-content/70 mt-2">{quality.ironCompletion}{t('dashboard.foods.completed')}</p>
                        </div>
                    </div>
                </DashboardCard>
            </div>

            {/* 5. FOOD TABLE */}
            <DashboardCard className="overflow-hidden">
                {/* Toolbar */}
                <div className="p-5 border-b border-base-300 flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex gap-2 items-center">
                        <h3 className="font-bold text-base-content text-lg">{t('dashboard.foods.all_foods')}</h3>
                        {/* <span className="bg-base-200 text-base-content/50 text-xs px-2 py-0.5 rounded-full font-bold">{DB_STATS.totalFoods}</span> */}
                    </div>

                    <div className="flex gap-3">
                        {/* <div className="relative group">
                            <Search className="absolute left-3 top-2.5 text-base-content/50 group-focus-within:text-green-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, ID o tag..."
                                className="input input-sm input-bordered pl-9 w-full sm:w-72 focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-base-200 focus:bg-base-100 transition-all"
                            />
                        </div>
                        <button className="btn btn-sm btn-outline border-base-300 text-base-content/70 hover:bg-base-200 hover:text-base-content gap-2">
                            <Filter size={16} />
                            Filtrar
                        </button> */}
                    </div>
                </div>

                <GenerateCrud
                    path={{
                        list: FoodEndpoints.actions.list(''),
                        create: FoodEndpoints.forms.create(),
                        view: FoodEndpoints.actions.unique,
                        update: FoodEndpoints.forms.update,
                        delete: FoodEndpoints.actions.delete,

                        sendCreate: FoodEndpoints.actions.create(),
                        sendUpdate: FoodEndpoints.actions.update,
                    }}
                    fichaComponent={HandleFicha}
                    object="payment-method"
                    renderCell={(field, entity) => {
                        if (field === 'currentPrice') {
                            const price = entity?.currentPrice;
                            const unit = entity?.priceUnit;
                            if (price === null || price === undefined) {
                                return <span className="text-base-content/50">—</span>;
                            }
                            return <>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(Number(price))} / {unit}</>;
                        }
                        return undefined;
                    }}
                />
            </DashboardCard>
        </div>
    );
}
