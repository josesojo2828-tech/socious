"use client";

import { ExchangeFoodTable } from '@/features/nutringest/exchange-list/components/FoodTablesExchangeList';
import { ExchangePatternCard } from '@/features/nutringest/exchange-list/components/PatterCardExchangeList';
import { ExchangeListHeader } from '@/features/nutringest/exchange-list/components/ExchangeListHeader';
import { useExchangeListDetail } from '@/features/nutringest/exchange-list/hooks/useUniqueExchangeList';
import { useParams } from 'next/navigation'; 

export default function ExchangeListDetailView() {
    const params = useParams();
    const pageId = params.id as string; 

    const {
        list,
        isLoading,
        error,
        searchTerm,
        setSearchTerm,
        filteredItems,
        handleDeleteItem,
        totals,
        refetch
    } = useExchangeListDetail(pageId);

    // 2. Manejo de estados de carga y error
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base-200">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-base-300 rounded-full mb-4"></div>
                    <div className="h-4 w-48 bg-base-300 rounded"></div>
                </div>
            </div>
        );
    }

    if (error || !list) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base-200 p-6">
                <div className="text-center max-w-md">
                    <h3 className="text-lg font-bold text-base-content mb-2">Error al cargar la lista</h3>
                    <p className="text-base-content/70 mb-4">{error || "No se encontró la información solicitada."}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn btn-primary btn-sm"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    // 3. Renderizado de la Vista
    return (
        <div className="min-h-screen bg-base-200/50 p-6 md:p-8 font-sans text-base-content flex justify-center">
            <div className="max-w-7xl w-full flex flex-col gap-6">

                {/* Cabecera */}
                <ExchangeListHeader refresh={refetch} pageId={pageId} list={list} />

                <div className="flex flex-col md:flex-row gap-6">

                    {/* Panel Izquierdo (Totalizador) */}
                    <ExchangePatternCard
                        totals={totals}
                        itemCount={list.items.length}
                    />

                    {/* Panel Derecho (Tabla) */}
                    <ExchangeFoodTable
                        handleAddIngredient={async () => true}
                        pageId={pageId}
                        items={filteredItems}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        totalItems={list.items.length}
                        onDelete={handleDeleteItem}
                        refresh={refetch}
                    />
                </div>
            </div>
        </div>
    );
}