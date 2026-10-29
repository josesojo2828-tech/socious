'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, ChefHat, Camera } from 'lucide-react';
import { MenuMetadataCard } from '@/features/nutringest/menu/components/MenuMetadataCard';
import { MenuNutritionCard } from '@/features/nutringest/menu/components/MenuNutritionCard';
import { MenuIngredientsTable } from '@/features/nutringest/menu/components/MenuIngredientsTable';
import { useMenuDetail } from '@/features/nutringest/menu/hooks/useMenuDetails';
import { useParams } from 'next/navigation';
import { MenuDetailHeader } from '@/features/nutringest/menu/components/MenuDetailsHeader';
import { MenuPublishCard } from '@/features/community/components/MenuPublishCard';
import { MenuCondimentsCard } from '@/features/nutringest/menu/components/MenuCondimentsCard';
import { MenuImageCard } from '@/features/nutringest/menu/components/MenuImageCard';
import { AddCondimentModal } from '@/features/nutringest/menu/components/AddCondimentModal';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { useModalStore } from '@/shared/store/ui/useModalStore';

type TabType = 'details' | 'recipe' | 'photo';

export default function MenuDetail() {
    const params = useParams();
    const pageId = params.id as string; 

    const { user } = useAuthStore();
    const { openModal, closeModal } = useModalStore();
    const [activeTab, setActiveTab] = useState<TabType>('details');

    // 1. Usar Hook
    const { 
        menu, 
        isLoading, 
        error, 
        filteredIngredients, 
        handleDeleteIngredient,
        refetch,
        handleAddIngredient,
        handleUpdateIngredient,
        handleAddCondiment,
        handleRemoveCondiment,
        handleUploadImage,
        handleRemoveImage
    } = useMenuDetail(pageId);

    // 2. Loading / Error States
    if (isLoading) {
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-base-300 rounded-full"></div>
                    <div className="w-48 h-4 bg-base-300 rounded"></div>
                </div>
            </div>
        );
    }

    if (error || !menu) {
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-base-content mb-2">Error al cargar menú</h2>
                    <p className="text-base-content/70 mb-4">{error || "No se encontró el menú solicitado."}</p>
                    <div className="flex items-center justify-center gap-3">
                        <Link href="/dashboard/menu" className="btn btn-primary btn-sm">Volver al catálogo</Link>
                        <button onClick={() => window.location.reload()} className="btn btn-outline btn-sm">Reintentar</button>
                    </div>
                </div>
            </div>
        );
    }

    // Solo el nutricionista dueño o un admin pueden administrar condimentos
    const canManageCondiments = user?.permits?.list?.includes("MENU_LIST_ALL") || user?.nutritionistProfile?.id === menu.nutritionistId;

    const tabs = [
        { id: 'details', label: 'Detalles', icon: FileText },
        { id: 'recipe', label: 'Receta', icon: ChefHat },
        { id: 'photo', label: 'Foto del Menú', icon: Camera },
    ];

    // 3. Render Principal
    return (
        <div className="min-h-screen bg-base-200 flex flex-col">
            
            {/* Header Sticky */}
            <MenuDetailHeader reload={refetch} menu={menu} />

            {/* Navegación de Pestañas */}
            <div className="bg-base-100 border-b border-base-300 px-4 sm:px-6 md:px-8 sticky top-0 z-10 shadow-xs">
                <nav className="flex gap-2 sm:gap-6 overflow-x-auto nav-scrollbar py-1 max-w-7xl mx-auto">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`
                                    flex items-center gap-2 py-3 sm:py-4 px-3 border-b-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer
                                    ${isActive
                                        ? 'border-emerald-600 text-emerald-600 font-semibold'
                                        : 'border-transparent text-base-content/70 hover:text-base-content hover:border-base-300'
                                    }
                                `}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Contenido Dinámico */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
                <div className="animate-in fade-in duration-300">
                    {/* Tab 1: Detalles (Metadata + Comunidad) */}
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <MenuMetadataCard reload={refetch} menu={menu} />
                            <MenuPublishCard menuId={menu.id} publishedAt={menu.publishedAt} />
                        </div>
                    )}

                    {/* Tab 2: Receta (Ingredientes, Nutrición y Condimentos) */}
                    {activeTab === 'recipe' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Columna Izq: Nutrición */}
                                <div className="lg:h-full">
                                    <MenuNutritionCard reload={refetch} menu={menu} />
                                </div>

                                {/* Columna Der: Ingredientes */}
                                <div className="lg:col-span-2 lg:h-full">
                                    <MenuIngredientsTable 
                                        handleAddIngredient={handleAddIngredient}
                                        handleUpdateIngredient={handleUpdateIngredient}
                                        items={filteredIngredients} 
                                        totalKcal={menu.totalKcal}
                                        onDelete={handleDeleteIngredient}
                                    />
                                </div>
                            </div>

                            {/* Condimentos Premium dentro de Receta */}
                            {menu.canViewCondiments && (
                                <MenuCondimentsCard
                                    menu={menu}
                                    canManage={canManageCondiments}
                                    onAdd={() => openModal(<AddCondimentModal onClose={closeModal} onAdd={handleAddCondiment} />)}
                                    onRemove={handleRemoveCondiment}
                                />
                            )}
                        </div>
                    )}

                    {/* Tab 3: Foto del Menú */}
                    {activeTab === 'photo' && (
                        <div className="space-y-6">
                            <MenuImageCard
                                menu={menu}
                                canManage={canManageCondiments}
                                onUpload={handleUploadImage}
                                onRemove={handleRemoveImage}
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}