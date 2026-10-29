"use client";

import { ExchangeListEndpoints } from "@/features/nutringest/exchange-list/services/exchange-list.endpoint";
// import { FichaPaymentMethod } from "@/features/user/components/payment-method/FichaPaymentMethod";
import { GenerateCrud } from "@/shared/components/organisms/crud";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
    Archive,
    ArchiveRestore,
    Search,
    Plus,
    Filter,
    MoreVertical,
    Layers,
    Database,
    Scale,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    Edit3,
    BarChart3,
    Trash
} from 'lucide-react';
import { useTranslation } from "@/context/i18n.context";
import { apiClient } from '@/shared/api/api.client';
import { Button } from '@/shared/components/atoms/Button';
import { DeleteAlert } from '@/shared/components/organisms/crud/AlertDelete';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { useToastStore } from '@/shared/store/ui/useToastStore';
import { useExchangeMetrics } from "@/features/nutringest/exchange-list/hooks/useExchangeListDashboard";
import { DashboardCard } from "@/features/nutringest/components/DashboardCard";
import { DistributionChart } from "@/features/nutringest/exchange-list/components/DistributionChartExchangeList";
import { StatCardExchangeList } from "@/features/nutringest/exchange-list/components/StatCardExchangeList";

const EXCHANGE_STATS = {
    totalLists: 8,
    totalFoods: 342, // Total de alimentos registrados en todas las listas
    mostDiverseGroup: "Cereales y Tubérculos", // El grupo con más opciones
    avgKcalPerExchange: 85,
    trends: {
        foods: "+24", // nuevos alimentos agregados
    }
};

const EXCHANGE_GROUPS = [
    {
        id: "ex1",
        name: "Cereales y Tubérculos",
        description: "Pan, arroz, pasta, papa, yuca, plátano...",
        baseKcal: 80,
        baseMacros: { p: 2, c: 15, f: 0 },
        foodCount: 85,
        color: "bg-orange-100 text-orange-700 border-orange-200"
    },
    {
        id: "ex2",
        name: "Frutas",
        description: "Frutas frescas, secas y jugos naturales.",
        baseKcal: 60,
        baseMacros: { p: 0, c: 15, f: 0 },
        foodCount: 62,
        color: "bg-pink-100 text-pink-700 border-pink-200"
    },
    {
        id: "ex3",
        name: "Cárnicos Magros",
        description: "Pollo, pescado blanco, lomo de cerdo, atún.",
        baseKcal: 55,
        baseMacros: { p: 7, c: 0, f: 3 },
        foodCount: 45,
        color: "bg-red-100 text-red-700 border-red-200"
    },
    {
        id: "ex4",
        name: "Lácteos Descremados",
        description: "Leche descremada, yogur light.",
        baseKcal: 90,
        baseMacros: { p: 8, c: 12, f: 0 },
        foodCount: 18,
        color: "bg-emerald-100 text-emerald-700 border-blue-200"
    },
    {
        id: "ex5",
        name: "Grasas",
        description: "Aceites, aguacate, nueces, semillas.",
        baseKcal: 45,
        baseMacros: { p: 0, c: 0, f: 5 },
        foodCount: 34,
        color: "bg-yellow-100 text-yellow-700 border-yellow-200"
    },
    {
        id: "ex6",
        name: "Vegetales",
        description: "Verduras de hoja verde, crucíferas, tomate.",
        baseKcal: 25,
        baseMacros: { p: 2, c: 5, f: 0 },
        foodCount: 56,
        color: "bg-green-100 text-green-700 border-green-200"
    }
];


// // Gráfico de Barras Vertical (Comparación de Cantidad de Alimentos)
// const FoodCountChart = () => {
//     const maxCount = Math.max(...EXCHANGE_GROUPS.map(g => g.foodCount));

//     return (
//         <div className="flex items-end justify-between h-48 gap-2 pt-6">
//             {EXCHANGE_GROUPS.map((group) => (
//                 <div key={group.id} className="flex flex-col items-center gap-2 group w-full">
//                     <div className="relative w-full flex justify-center h-full items-end">
//                         {/* Tooltip on hover */}
//                         <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none">
//                             {group.foodCount} ítems
//                         </div>
//                         {/* Bar */}
//                         <div
//                             // Usamos la clase de texto del grupo para colorear el fondo vía currentColor
//                             className={`w-full max-w-[40px] rounded-t-lg transition-all hover:opacity-80 ${group.color}`}
//                             style={{ height: `${(group.foodCount / maxCount) * 100}%`, backgroundColor: 'currentColor' }}
//                         ></div>
//                     </div>
//                     {/* Label Eje X */}
//                     <span className="text-[10px] text-gray-500 font-medium truncate w-16 text-center">{group.name.split(' ')[0]}</span>
//                 </div>
//             ))}
//         </div>
//     );
// };




export default function ExchangeFoodsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { openModal, closeModal } = useModalStore();
    const { addToast } = useToastStore();
    const [activeTab, setActiveTab] = useState(0);

    const { data, isLoading, error } = useExchangeMetrics();

    const notifyError = useCallback(
        (fallback: string, err: any) => {
            addToast({
                type: 'error',
                title: t('common.status.error') || 'Error',
                message: err?.response?.data?.message || fallback,
            });
        },
        [addToast, t],
    );

    const handleArchive = useCallback(
        async (entity: any) => {
            try {
                await apiClient.post(ExchangeListEndpoints.actions.archive(entity.id));
                addToast({
                    type: 'success',
                    title: t('exchange.notifications.archive_success'),
                    message: t('exchange.notifications.archive_message', { name: entity.name }),
                });
            } catch (err: any) {
                notifyError('Error al archivar la lista', err);
            }
        },
        [addToast, notifyError, t],
    );

    const handleUnarchive = useCallback(
        async (entity: any) => {
            try {
                await apiClient.post(ExchangeListEndpoints.actions.unarchive(entity.id));
                addToast({
                    type: 'success',
                    title: t('exchange.notifications.unarchive_success'),
                    message: t('exchange.notifications.unarchive_message', { name: entity.name }),
                });
            } catch (err: any) {
                notifyError('Error al desarchivar la lista', err);
            }
        },
        [addToast, notifyError, t],
    );

    const handleDelete = useCallback(
        async (entity: any) => {
            try {
                await apiClient.post(ExchangeListEndpoints.actions.delete(entity.id));
                addToast({
                    type: 'success',
                    title: t('exchange.notifications.delete_success'),
                    message: t('exchange.notifications.delete_message', { name: entity.name }),
                });
            } catch (err: any) {
                notifyError('Error al eliminar la lista', err);
            }
        },
        [addToast, notifyError, t],
    );

    const renderExtraActions = (item: any, _openModal: any, reload?: () => void) => {
        const isArchived = Boolean(item?.archivedAt);

        if (!isArchived) {
            return (
                <Button
                    variant="ghost"
                    size="sm"
                    className="!p-0 !w-8 !h-8 !min-h-8 !min-w-8 text-amber-500 hover:bg-amber-100"
                    title={t('exchange.archive')}
                    onClick={async (e) => {
                        e.stopPropagation();
                        await handleArchive(item);
                        reload?.();
                    }}
                >
                    <Archive size={16} />
                </Button>
            );
        }

        return (
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    className="!p-0 !w-8 !h-8 !min-h-8 !min-w-8 text-amber-500 hover:bg-amber-100"
                    title={t('exchange.unarchive')}
                    onClick={async (e) => {
                        e.stopPropagation();
                        await handleUnarchive(item);
                        reload?.();
                    }}
                >
                    <ArchiveRestore size={16} />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="!p-0 !w-8 !h-8 !min-h-8 !min-w-8 text-red-500 hover:bg-red-100"
                    title={t('common.actions.delete')}
                    onClick={(e) => {
                        e.stopPropagation();
                        openModal(
                            <DeleteAlert
                                isOpen={true}
                                onClose={closeModal}
                                onConfirm={async () => {
                                    await handleDelete(item);
                                    reload?.();
                                }}
                            />,
                        );
                    }}
                >
                    <Trash size={16} />
                </Button>
            </div>
        );
    };

    if (error) {
        // Estado de error simple
        return (
            <div className="mb-8 p-6 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3">
                <Info size={20} />
                <p>No se pudieron cargar las estadísticas: {error}</p>
            </div>
        );
    }

    // 2. Preparamos datos seguros (defaults) para evitar errores de renderizado si data es null temporalmente
    const {
        totalGroups = 0,
        totalFoodItems = 0,
        mostDiverseGroup = null,
        mostDiverseCount = 0,
        avgCalories = 0
    } = data?.overview || {};

    const distribution = data?.distribution || [];

    // Formateamos valores para visualización segura
    const displayDiverseGroup = mostDiverseGroup || "Ninguno";
    const displayAvgCalories = avgCalories ?? 0; // Nullish coalescing para asegurar número

    const HandleFicha = (id: string, HandleDelete: (id: string) => void, HandleUpdate: (id: string) => void) => {
        // openModal(<FichaPaymentMethod id={id} HandleDelete={HandleDelete} HandleUpdate={HandleUpdate} />)
        router.push(`/dashboard/exchange-list/${id}`)
    }

    return (
        <div className="min-h-screen bg-base-200/50 p-6 md:p-8 font-sans text-base-content">

            {/* 1. HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
                        <Layers className="text-emerald-600" />
                        Listas de Intercambio
                    </h1>
                    <p className="text-base-content/70 mt-1">Gestiona los grupos de alimentos y sus valores nutricionales estándar.</p>
                </div>
                <div className="flex gap-3">
                    {/* <button className="btn btn-ghost bg-base-100 border border-base-300 text-base-content/70 shadow-sm hover:bg-base-200 gap-2">
                        <Database size={18} />
                        Importar Base de Datos
                    </button>
                    <button className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-blue-600 text-white gap-2 shadow-lg shadow-blue-200">
                        <Plus size={18} />
                        Nuevo Grupo
                    </button> */}
                </div>
            </div>

            {/* SECCIÓN 1: TARJETAS DE ESTADÍSTICAS (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCardExchangeList
                    loading={isLoading}
                    title="Total Grupos"
                    value={totalGroups}
                    subLabel="Listas activas"
                    icon={Layers}
                    colorClass="bg-emerald-500" // Azul sólido
                />
                <StatCardExchangeList
                    loading={isLoading}
                    title="Base de Alimentos"
                    value={totalFoodItems}
                    subLabel="Ítems totales registrados"
                    icon={Database}
                    colorClass="bg-purple-500" // Morado sólido
                />
                <StatCardExchangeList
                    loading={isLoading}
                    title="Grupo más diverso"
                    value={displayDiverseGroup}
                    subLabel={`${mostDiverseCount} opciones disponibles`}
                    icon={BarChart3}
                    colorClass="bg-orange-500" // Naranja sólido
                />
                <StatCardExchangeList
                    loading={isLoading}
                    title="Promedio Calórico"
                    value={`${displayAvgCalories} kcal`}
                    subLabel="Por intercambio estándar"
                    icon={Scale}
                    colorClass="bg-green-500" // Verde sólido
                />
            </div>

            {/* SECCIÓN 2: GRÁFICOS Y PANELES LATERALES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

                {/* GRÁFICO: VARIEDAD DE ALIMENTOS (Ocupa 2/3 del ancho en desktop) */}
                <DashboardCard className="p-6 col-span-1 lg:col-span-2 flex flex-col">
                    <div className="mb-8">
                        <h3 className="font-bold text-base-content text-lg flex items-center gap-2">
                            Variedad de Alimentos por Grupo
                        </h3>
                        <p className="text-sm text-base-content/70 mt-1">
                            Cantidad de opciones disponibles para el paciente en cada lista de intercambio.
                        </p>
                    </div>

                    <div className="flex-grow flex flex-col justify-center min-h-[250px]">
                        {isLoading ? (
                            // Skeleton para el gráfico
                            <div className="space-y-6 animate-pulse py-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i}>
                                        <div className="flex justify-between mb-2">
                                            <div className="h-4 bg-base-200 rounded w-24"></div>
                                            <div className="h-3 bg-base-200 rounded w-8"></div>
                                        </div>
                                        <div className="h-3 bg-base-200 rounded-r-full w-full"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <DistributionChart data={distribution} />
                        )}
                    </div>
                </DashboardCard>

                {/* PANEL LATERAL: GUÍA RÁPIDA (Ocupa 1/3 del ancho en desktop) */}
                <DashboardCard className="p-6 h-full border-l-[6px] border-l-emerald-500/30 flex flex-col bg-base-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-base-content text-lg">Guía Rápida</h3>
                        <Info size={20} className="text-emerald-500" />
                    </div>

                    {/* Caja de información principal */}
                    <div className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/20 mb-8 shadow-sm">
                        <h4 className="text-emerald-700 dark:text-emerald-300 font-bold text-sm mb-3 flex items-center gap-2">
                            ¿QUÉ ES UN INTERCAMBIO?
                        </h4>
                        <p className="text-emerald-800 dark:text-emerald-200 text-sm leading-relaxed">
                            Es una cantidad específica de alimento que aporta aproximadamente el mismo valor nutricional (carbohidratos, proteínas, grasas y calorías) que otros alimentos dentro del mismo grupo o lista.
                        </p>
                    </div>

                    {/* Leyenda de colores (Estática) */}
                    <div className="mt-auto">
                        <p className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-4">Referencia de Macros en Listas</p>
                        <div className="space-y-3 bg-base-200 p-4 rounded-lg border border-base-300">
                            <div className="flex items-center gap-3 text-sm text-base-content/70 font-medium">
                                <span className="w-4 h-4 rounded-full bg-red-400 shadow-sm ring-2 ring-red-400/20"></span> Proteína
                            </div>
                            <div className="flex items-center gap-3 text-sm text-base-content/70 font-medium">
                                <span className="w-4 h-4 rounded-full bg-emerald-400 shadow-sm ring-2 ring-emerald-400/20"></span> Carbohidratos
                            </div>
                            <div className="flex items-center gap-3 text-sm text-base-content/70 font-medium">
                                <span className="w-4 h-4 rounded-full bg-amber-400 shadow-sm ring-2 ring-amber-400/20"></span> Grasa
                            </div>
                        </div>
                    </div>
                </DashboardCard>
            </div>

            <GenerateCrud
                path={{
                    list: ExchangeListEndpoints.actions.list(),
                    create: ExchangeListEndpoints.forms.create(),
                    view: ExchangeListEndpoints.actions.unique,
                    update: ExchangeListEndpoints.forms.update,
                    delete: ExchangeListEndpoints.actions.delete,

                    sendCreate: ExchangeListEndpoints.actions.create(),
                    sendUpdate: ExchangeListEndpoints.actions.update,
                }}
                fichaComponent={HandleFicha}
                object="exchange-list"
                tabs={[
                    { label: t('exchange.tabs.active'), queryParam: { includeArchived: false } },
                    { label: t('exchange.tabs.archived'), queryParam: { includeArchived: true } },
                ]}
                extraActions={renderExtraActions}
                actionsOverride={activeTab === 1 ? { view: false, update: false } : { delete: false }}
                onTabChange={setActiveTab}
                openModal={openModal}
            />
        </div>

    )
}