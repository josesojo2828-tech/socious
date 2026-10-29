"use client";

import { DashboardCard } from "@/features/nutringest/components/DashboardCard";
import { ExchangeCategoryChart } from "@/features/nutringest/food/components/ExchangeCategoryChart";
import { ExchangeInfoCard } from "@/features/nutringest/food/components/ExchangeInfoCard";
import { ExchangeStatCard } from "@/features/nutringest/food/components/ExchangeStatsCard";
import { useCategorizedFoodMetrics } from "@/features/nutringest/food/hooks/useCategorizedFoodMetrics";
import { ExchangeEndpoints } from "@/features/nutringest/food/services/exchange-food.endpoint";
import { Text } from "@/shared/components/atoms/Text";
import { GenerateCrud } from "@/shared/components/organisms/crud";
import {
    Layers,
    Tag,
    Scale,
    Flame,
    PieChart,
    BookOpen
} from 'lucide-react';
import { useRouter } from "next/navigation";


export default function CategorizedFoodDashboard() {
    const router = useRouter();
    const { data, loading } = useCategorizedFoodMetrics();

    const handleFicha = (id: string, _delete: any, _update: any) => {
        router.push(`/dashboard/exchange-food/${id}`);
    };

    const stats = data?.overview || { totalItems: 0, totalCategories: 0, totalSubCategories: 0 };
    const averages = data?.averages || { avgCalories: 0 };
    const distribution = data?.distribution || [];

    return (
        <div className="min-h-screen bg-base-200/50 p-6 md:p-8 font-sans text-base-content">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <Text variant="h2" className="flex items-center gap-2 font-bold text-base-content">
                        <BookOpen className="text-orange-600" size={32} />
                        Alimentos Categorizados
                    </Text>
                    <p className="text-base-content/70 mt-1 ml-10">
                        Gestión del catálogo maestro para listas de intercambio.
                    </p>
                </div>
            </div>

            {/* 2. STAT CARDS (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <ExchangeStatCard
                    title="Total Ítems"
                    value={loading ? "..." : stats.totalItems}
                    subtext="Base de datos activa"
                    icon={Layers}
                    colorClass="bg-orange-500 text-orange-600"
                />
                <ExchangeStatCard
                    title="Categorías"
                    value={loading ? "..." : stats.totalCategories}
                    subtext="Grupos principales"
                    icon={PieChart}
                    colorClass="bg-purple-500 text-purple-600"
                />
                <ExchangeStatCard
                    title="Sub-Categorías"
                    value={loading ? "..." : stats.totalSubCategories}
                    subtext="Clasificaciones específicas"
                    icon={Tag}
                    colorClass="bg-emerald-500 text-emerald-600"
                />
                <ExchangeStatCard
                    title="Calorías Promedio"
                    value={loading ? "..." : averages.avgCalories}
                    subtext="Por porción estándar"
                    icon={Flame}
                    colorClass="bg-red-500 text-red-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

                {/* 3. CHART: CATEGORÍAS */}
                <DashboardCard className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-base-content">Distribución por Grupo</h3>
                    </div>
                    <ExchangeCategoryChart
                        data={distribution}
                        loading={loading}
                    />
                </DashboardCard>

                {/* 4. INFO / HELP CARD */}
                <div className="lg:col-span-2">
                    <ExchangeInfoCard className="h-full" />
                </div>
            </div>

            {/* 5. CRUD TABLE */}
            <DashboardCard className="overflow-hidden">
                <GenerateCrud
                    path={{
                        list: ExchangeEndpoints.actions.list(''),
                        create: ExchangeEndpoints.forms.create(),
                        view: ExchangeEndpoints.actions.unique,
                        update: ExchangeEndpoints.forms.update,
                        delete: ExchangeEndpoints.actions.delete,
                        sendCreate: ExchangeEndpoints.actions.create(),
                        sendUpdate: ExchangeEndpoints.actions.update,
                    }}
                    fichaComponent={handleFicha}
                    object="food-exchange-list" // Ajustado al contexto semántico
                />
            </DashboardCard>
        </div>
    );
}