"use client";

import {
    Archive,
    ArchiveRestore,
    MoreVertical,
    Trash,
    Users,
    Utensils,
    Zap,
    PieChart,
} from 'lucide-react';
import { useMenuDashboard } from "@/features/nutringest/menu/hooks/useMenuDashboard";
import { StatsCardMenu } from "@/features/nutringest/menu/components/StatsCardMenu";
import { DashboardCard } from "@/features/nutringest/components/DashboardCard";
import { CategoryDonutMenu } from "@/features/nutringest/menu/components/CategoryDonut";
import { MacroBarMenu } from "@/features/nutringest/menu/components/MacroBar";
import { GenerateCrud } from '@/shared/components/organisms/crud';
import { MenuEndpoints } from '@/features/nutringest/menu/services/menu.endpoint';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useTranslation } from "@/context/i18n.context";
import { apiClient } from '@/shared/api/api.client';
import { Button } from '@/shared/components/atoms/Button';
import { DeleteAlert } from '@/shared/components/organisms/crud/AlertDelete';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { useToastStore } from '@/shared/store/ui/useToastStore';

export default function ExchangeFoodsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { data, isLoading, error } = useMenuDashboard();
    const { openModal, closeModal } = useModalStore();
    const { addToast } = useToastStore();
    const [activeTab, setActiveTab] = useState(0);

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
                await apiClient.post(MenuEndpoints.actions.archive(entity.id));
                addToast({
                    type: 'success',
                    title: t('menu.notifications.archive_success'),
                    message: t('menu.notifications.archive_message', { name: entity.name }),
                });
            } catch (err: any) {
                notifyError('Error al archivar menú', err);
            }
        },
        [addToast, notifyError, t],
    );

    const handleUnarchive = useCallback(
        async (entity: any) => {
            try {
                await apiClient.post(MenuEndpoints.actions.unarchive(entity.id));
                addToast({
                    type: 'success',
                    title: t('menu.notifications.unarchive_success'),
                    message: t('menu.notifications.unarchive_message', { name: entity.name }),
                });
            } catch (err: any) {
                notifyError('Error al desarchivar menú', err);
            }
        },
        [addToast, notifyError, t],
    );

    const handleDelete = useCallback(
        async (entity: any) => {
            try {
                await apiClient.post(MenuEndpoints.actions.delete(entity.id));
                addToast({
                    type: 'success',
                    title: t('menu.notifications.delete_success'),
                    message: t('menu.notifications.delete_message', { name: entity.name }),
                });
            } catch (err: any) {
                notifyError('Error al eliminar menú', err);
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
                    title={t('menu.archive')}
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
                    title={t('menu.unarchive')}
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
        return <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg">{t('common.status.error')}: {error}</div>;
    }

    const HandleFicha = (id: string, HandleDelete: (id: string) => void, HandleUpdate: (id: string) => void) => {
        // openModal(<FichaPaymentMethod id={id} HandleDelete={HandleDelete} HandleUpdate={HandleUpdate} />)
        router.push(`/dashboard/menu/${id}`)
    }

    // Valores por defecto seguros para evitar crashes mientras carga o si es null
    const overview = data?.overview || { totalMenus: 0, avgCalories: 0, topCategory: 'N/A', assignedPatients: 0 };
    const averages = data?.averages || { avgProtein: 0, avgCarbs: 0, avgFats: 0, avgCalories: 0 };
    const distribution = data?.distribution || [];

    // Objetivos macro nutricionales (Podrían venir de config en el futuro)
    const TARGETS = { protein: 30, carbs: 50, fats: 15 };

    return (
        <div className="mb-8 animate-in fade-in duration-500 mt-4">
            {/* 2. KPIS / STAT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCardMenu
                    loading={isLoading}
                    title={t('dashboard.menu.total_menus')}
                    value={overview.totalMenus}
                    subLabel={t('dashboard.menu.active_system')}
                    icon={Utensils}
                    colorClass="bg-purple-500/40 text-purple-600 dark:text-purple-400"
                />
                <StatsCardMenu
                    loading={isLoading}
                    title={t('dashboard.menu.avg_calories')}
                    value={averages.avgCalories}
                    subLabel={t('dashboard.menu.kcal_per_menu')}
                    icon={Zap}
                    colorClass="bg-yellow-500/40 text-yellow-600 dark:text-yellow-400"
                />
                <StatsCardMenu
                    loading={isLoading}
                    title={t('dashboard.menu.top_category')}
                    value={overview.topCategory || t('dashboard.menu.no_data')}
                    subLabel={t('dashboard.menu.most_frequent')}
                    icon={PieChart}
                    colorClass="bg-green-500/40 text-green-600 dark:text-green-400"
                />
                <StatsCardMenu
                    loading={isLoading}
                    title={t('dashboard.menu.assigned_patients')}
                    value={overview.assignedPatients}
                    subLabel={t('dashboard.menu.active_plans')}
                    icon={Users}
                    colorClass="bg-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 3. CHART: DISTRIBUCIÓN POR CATEGORÍA */}
                <DashboardCard className="p-6 col-span-1 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-base-content">{t('dashboard.menu.category_distribution')}</h3>
                        <button className="btn btn-xs btn-ghost text-base-content/50"><MoreVertical size={16} /></button>
                    </div>
                    <div className="flex justify-center py-4">
                        {isLoading ? (
                            <div className="h-32 w-32 rounded-full bg-base-200 animate-pulse"></div>
                        ) : (
                            <CategoryDonutMenu distribution={distribution} total={overview.totalMenus} />
                        )}
                    </div>
                </DashboardCard>

                {/* 4. CHART: MACROS PROMEDIO */}
                <DashboardCard className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-base-content">{t('dashboard.menu.avg_macros')}</h3>
                        <span className="text-xs font-medium text-base-content/70 bg-base-200 px-2 py-1 rounded">{t('dashboard.menu.global')}</span>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-4 bg-base-200 rounded w-full"></div>
                            <div className="h-4 bg-base-200 rounded w-full"></div>
                            <div className="h-4 bg-base-200 rounded w-full"></div>
                        </div>
                    ) : (
                        <div className="space-y-6 py-2">
                            <MacroBarMenu 
                                name={t('dashboard.menu.protein')} 
                                label="P" 
                                value={averages.avgProtein} 
                                target={TARGETS.protein} 
                                color="bg-red-500" 
                            />
                            <MacroBarMenu 
                                name={t('dashboard.menu.carbs')} 
                                label="C" 
                                value={averages.avgCarbs} 
                                target={TARGETS.carbs} 
                                color="bg-green-500" 
                            />
                            <MacroBarMenu 
                                name={t('dashboard.menu.fats')} 
                                label="G" 
                                value={averages.avgFats} 
                                target={TARGETS.fats} 
                                color="bg-yellow-500" 
                            />
                        </div>
                    )}

                    {!isLoading && (
                        <div className="mt-6 pt-4 border-t border-base-300 text-center">
                            <p className="text-xs text-base-content/50">
                                {t('dashboard.menu.trend')} <span className="text-purple-600 dark:text-purple-400 font-bold">
                                    {averages.avgProtein > TARGETS.protein ? t('dashboard.menu.high_protein') : t('dashboard.menu.balanced')}
                                </span>.
                            </p>
                        </div>
                    )}
                </DashboardCard>
            </div>

            {/* 5. FOOD TABLE */}
            <DashboardCard className="overflow-hidden mt-6">
                {/* Toolbar */}
                <div className="p-5 border-b border-base-300 flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex gap-2 items-center">
                        <h3 className="font-bold text-base-content text-lg">{t('dashboard.menu.all_foods')}</h3>
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
                        list: MenuEndpoints.actions.list(),
                        create: MenuEndpoints.forms.create(),
                        view: MenuEndpoints.actions.detailApi,
                        update: MenuEndpoints.forms.update,
                        delete: MenuEndpoints.actions.delete,

                        sendCreate: MenuEndpoints.actions.create(),
                        sendUpdate: MenuEndpoints.actions.update,
                    }}
                    fichaComponent={HandleFicha}
                    object="menu"
                    title="Menús"
                    tabs={[
                        { label: t('menu.tabs.active'), queryParam: { includeArchived: false } },
                        { label: t('menu.tabs.archived'), queryParam: { includeArchived: true } },
                    ]}
                    extraActions={renderExtraActions}
                    actionsOverride={activeTab === 1 ? { view: false, update: false } : { delete: false }}
                    onTabChange={setActiveTab}
                    openModal={openModal}
                    renderCell={(field, entity: any) => {
                        if (field === 'createdBy.username') {
                            const isImported = Boolean(entity.importedFromId || entity.importedFrom);
                            const authorName = entity.importedFrom?.createdBy?.username || entity.createdBy?.username || (isImported ? 'Comunidad' : '—');
                            
                            if (isImported) {
                                return (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-medium text-base-content/90">{authorName}</span>
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                            Importado
                                        </span>
                                    </div>
                                );
                            }
                            return <span className="text-base-content/80">{authorName}</span>;
                        }
                        return undefined;
                    }}
                />
            </DashboardCard>
        </div>
    );
}