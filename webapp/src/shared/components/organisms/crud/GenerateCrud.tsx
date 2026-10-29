'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from "@/context/i18n.context";
import { GenerateCrudProps } from "./generate-crud.types";
import { DynamicTable } from "../DynamicTable/DynamicTable";
import { useHandlerCrud } from "@/shared/hooks/crud/useHandlerCrud";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { DynamicRenderForm } from "../DynamicForm/DynamicRenderForm";
import { DeleteAlert } from "./AlertDelete";
import { DynamicFilter } from "./DynamicFilter";
import { Pagination } from "../../molecules/Pagination";
import { Button } from "../../atoms/Button";
import { Card } from "../cards/Card";
import { Plus } from "lucide-react";
import { Text } from "../../atoms/Text";

export function GenerateCrud<T>({
    path,
    fichaComponent,
    handlers,
    title: manualTitle,
    onReload,
    renderCell,
    tabs,
    extraActions,
    userPermits = [],
    openModal: externalOpenModal,
    actionsOverride,
    onTabChange,
}: GenerateCrudProps) {
    const { t } = useTranslation();

    // Active tab state (first tab by default)
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const activeTab = tabs?.[activeTabIndex];

    // Memoize extraParams to avoid infinite re-renders / request loop
    const extraParams = useMemo(() => activeTab?.queryParam ?? {}, [activeTab]);

    // Use external openModal if provided, otherwise use internal store
    const internalStore = useModalStore();
    const openModal = externalOpenModal ?? internalStore.openModal;
    const closeModal = internalStore.closeModal;

    const {
        actions: apiActions,
        column,
        list,
        page,
        title,
        ChangePage,
        ManagementDelte,
        Reload: InternalReload,
        ManagementSearch,
        currentFilters,
        filterConfig,
        isLoading
    } = useHandlerCrud<T>({
        path: path.list,
        extraParams,
    });

    // Merge API actions with overrides (e.g., hide view/update for archived tab)
    const actions = useMemo(
        () => actionsOverride ? { ...apiActions, ...actionsOverride } : apiActions,
        [apiActions, actionsOverride]
    );

    const Reload = () => {
        InternalReload();
        if (onReload) onReload();
    }

    // ------ PAGINATION CHANGE ------ //
    const HandleNext = () => ChangePage(page.current + 1);
    const HandlePrev = () => ChangePage(page.current - 1);
    const HandleChangePage = (p: number) => ChangePage(p);

    // ------ ACTIONS ------ //
    const HandleAction = (actionKey: string, item: Record<string, unknown>) => {
        if (actionKey === 'view') ViewExecute(item.id as string)
        else if (actionKey === 'update') UpdateExecute(item.id as string);
        else if (actionKey === 'delete') ExecuteDelete(item.id as string);
    }
    const HandleSearch = () => { }
    const HandleDelete = (id: string) => ManagementDelte(path.delete(id));
    const HandleCreate = () => {
        if (handlers?.create) handlers.create({}, () => { })
        else openModal(<DynamicRenderForm cb={() => { closeModal(); Reload() }} path={path.create} pathSend={path.sendCreate} />);
    }

    const ExecuteDelete = (id: string) => {
        openModal(<DeleteAlert isOpen={true} onClose={() => { closeModal(); Reload() }} onConfirm={() => { HandleDelete(id); Reload() }} />);
    }

    const ViewExecute = (id: string) => {
        fichaComponent(id, ExecuteDelete, UpdateExecute);
    }

    const UpdateExecute = (id: string) => {
        openModal(<DynamicRenderForm cb={() => { closeModal(); Reload() }} path={path.update(id)} />)
    }

    const displayTitle = manualTitle || title;

    // Build extraActions per row, passing openModal so they can open modals
    const renderExtraActions = (item: T) =>
        extraActions ? extraActions(item, openModal, Reload) : null;

    return (
        <Card className="w-full bg-base-100 shadow mt-2 rounded-xl p-4 sm:p-5">
            {/* Header: Title and Create Button side-by-side */}
            <div className="flex items-center justify-between gap-4 mb-6 pt-1 px-2 sm:px-4">
                {displayTitle && (
                    <Text variant="h2" className="text-base-content font-black uppercase text-xl sm:text-2xl tracking-tighter">
                        {t(displayTitle)}
                    </Text>
                )}
                <Button 
                    onClick={HandleCreate} 
                    className="rounded-xl shadow-md shadow-primary/20 transition-all shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm" 
                    variant="primary"
                >
                    <Plus size={18} />
                    {t('dashboard.entities.common.create')}
                </Button>
            </div>

            {/* Tab bar — only render if tabs prop is provided */}
            {tabs && tabs.length > 0 && (
                <div className="flex items-center gap-1 mb-4 px-2">
                    {tabs.map((tab, idx) => (
                        <button
                            key={idx}
                            onClick={() => { setActiveTabIndex(idx); onTabChange?.(idx); }}
                            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2 ${
                                activeTabIndex === idx
                                    ? 'border-primary text-primary bg-primary/10'
                                    : 'border-transparent text-base-content/70 hover:text-base-content hover:bg-base-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Filter toolbar: Search & Dropdowns */}
            <div className="mb-6 px-2 sm:px-4 w-full">
                <DynamicFilter
                    config={filterConfig}
                    currentFilters={currentFilters}
                    onFilter={ManagementSearch}
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden">
                <DynamicTable
                    tableDef={{
                        columns: column,
                        limit: page.limit,
                        list,
                        title,
                        total: page.totalPages,
                        currentPage: page.current
                    }}
                    actions={actions}
                    isLoading={isLoading}
                    renderCell={renderCell}
                    handleChangePage={HandleChangePage}
                    handleNext={HandleNext}
                    handlePrev={HandlePrev}
                    handleAction={HandleAction}
                    handleSearch={HandleSearch}
                    handleCreate={HandleCreate}
                    extraActions={renderExtraActions}
                />
            </div>

            {/* Bottom Pagination */}
            {page.totalPages > 1 && (
                <div className="flex justify-center sm:justify-end mt-6 pt-4 border-t border-base-200 px-2 sm:px-4">
                    <Pagination
                        currentPage={page.current}
                        totalPages={page.totalPages}
                        handleChangePage={HandleChangePage}
                        handleNext={HandleNext}
                        handlePrev={HandlePrev}
                    />
                </div>
            )}
        </Card>
    )
}
