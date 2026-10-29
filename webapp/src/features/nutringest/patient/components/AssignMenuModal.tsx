"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, Clock, ChefHat, Loader2, Zap, BookOpen } from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { MenuEndpoints } from '@/features/nutringest/menu/services/menu.endpoint';
import {
    EATING_MOMENTS,
    eatingMomentToCategory,
} from '@/features/nutringest/patient/lib/eating-moments';
import { useTranslation } from "@/context/i18n.context";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { menuId: string, eatingMoment: string, notes: string }) => Promise<boolean>;
}

export const AssignMenuModal = ({ isOpen, onClose, onSubmit }: Props) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'library' | 'quick'>('library');
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Data Sources
    const [availableMenus, setAvailableMenus] = useState<any[]>([]);

    // Form State - Library (con selección múltiple)
    const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
    const [menuId, setMenuId] = useState('');
    const [eatingMoment, setEatingMoment] = useState('Desayuno');
    const [notes, setNotes] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Form State - Quick Menu
    const [quickName, setQuickName] = useState('');
    const [quickDescription, setQuickDescription] = useState('');
    const [quickEatingMoment, setQuickEatingMoment] = useState('Desayuno');
    const [quickPrepTime, setQuickPrepTime] = useState<number | string>('');
    const [quickDifficulty, setQuickDifficulty] = useState('Media');
    const [quickNotes, setQuickNotes] = useState('');

    // Cargar menús disponibles
    useEffect(() => {
        if (!isOpen) return;

        const fetchMenus = async () => {
            setIsSearching(true);
            try {
                const response = await apiClient.get(MenuEndpoints.actions.list());
                setAvailableMenus(response.data.list || response.data || []);
            } catch (error) {
                console.error("Error cargando menús:", error);
            } finally {
                setIsSearching(false);
            }
        };

        fetchMenus();
    }, [isOpen]);

    const filteredMenus = availableMenus.filter(m =>
        m.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleSelectMenu = (id: string) => {
        setSelectedMenuIds(prev =>
            prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
        );
        setMenuId(id);
    };

    const handleAssignExisting = async (e: React.FormEvent) => {
        e.preventDefault();
        const idsToAssign = selectedMenuIds.length > 0 ? selectedMenuIds : (menuId ? [menuId] : []);
        if (idsToAssign.length === 0) return;

        setIsLoading(true);
        let allSuccess = true;
        for (const mId of idsToAssign) {
            const success = await onSubmit({ menuId: mId, eatingMoment, notes });
            if (!success) allSuccess = false;
        }
        setIsLoading(false);

        if (allSuccess) {
            onClose();
            setSelectedMenuIds([]);
            setMenuId('');
            setNotes('');
        }
    };

    const handleCreateAndAssignQuick = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickName.trim()) return;

        setIsLoading(true);
        try {
            // 1. Crear menú estándar en el backend
            const createRes = await apiClient.post(MenuEndpoints.actions.create(), {
                name: quickName.trim(),
                description: quickDescription.trim() || undefined,
                category: eatingMomentToCategory(quickEatingMoment),
                tags: quickEatingMoment,
                prepTime: quickPrepTime !== '' ? Number(quickPrepTime) : undefined,
                difficulty: quickDifficulty || undefined,
            });

            const createdEntity = createRes.data?.entity || createRes.data?.data || createRes.data;
            const createdId = createdEntity?.id;

            if (!createdId) {
                throw new Error("No se pudo obtener el identificador del nuevo menú.");
            }

            // 2. Asignar menú al paciente
            const success = await onSubmit({
                menuId: createdId,
                eatingMoment: quickEatingMoment,
                notes: quickNotes.trim() || quickDescription.trim(),
            });

            if (success) {
                onClose();
                setQuickName('');
                setQuickDescription('');
                setQuickPrepTime('');
                setQuickDifficulty('Media');
                setQuickNotes('');
            }
        } catch (error: any) {
            console.error("Error creando menú rápido:", error);
            alert(error.response?.data?.message || "No se pudo crear y asignar el menú rápido.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
                    <h3 className="font-bold text-base-content flex items-center gap-2">
                        <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                            <ChefHat size={18} />
                        </div>
                        {t('dashboard.modals.assign_menu.title') || "Asignar Menú al Paciente"}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-base-300 rounded-full text-base-content/50 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-base-200 bg-base-100 px-6 pt-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('library')}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
                            activeTab === 'library'
                                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-base-content/60 hover:text-base-content'
                        }`}
                    >
                        <BookOpen size={16} />
                        Biblioteca de Menús
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('quick')}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
                            activeTab === 'quick'
                                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-base-content/60 hover:text-base-content'
                        }`}
                    >
                        <Zap size={16} className="text-amber-500" />
                        Crear Menú Rápido ⚡
                    </button>
                </div>

                {/* Tab 1: Existente */}
                {activeTab === 'library' && (
                    <form onSubmit={handleAssignExisting} className="p-6 space-y-5 overflow-y-auto">
                        {/* Buscador de Menú */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-base-content/60 uppercase">
                                {t('dashboard.modals.assign_menu.search_label') || "Buscar Menú en Biblioteca"}
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                                <input
                                    type="text"
                                    placeholder={t('dashboard.modals.assign_menu.search_placeholder') || "Escribe el nombre del menú..."}
                                    className="w-full pl-9 pr-3 py-2 bg-base-200 border border-base-300 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Lista de Selección con Soporte Múltiple */}
                            <div className="border border-base-300 rounded-xl max-h-48 overflow-y-auto bg-base-100 mt-2 divide-y divide-base-200">
                                {isSearching ? (
                                    <div className="p-4 text-center text-xs text-base-content/50">Cargando menús...</div>
                                ) : filteredMenus.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-base-content/50">No se encontraron menús</div>
                                ) : (
                                    filteredMenus.map(menu => {
                                        const isSelected = selectedMenuIds.includes(menu.id) || menuId === menu.id;
                                        return (
                                            <div
                                                key={menu.id}
                                                onClick={() => toggleSelectMenu(menu.id)}
                                                className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                                                    isSelected ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold' : 'hover:bg-base-200 text-base-content/90'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}}
                                                        className="checkbox checkbox-primary checkbox-xs rounded pointer-events-none"
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-xs sm:text-sm truncate">{menu.name}</div>
                                                        {menu.description && (
                                                            <div className="text-[11px] text-base-content/60 line-clamp-1">{menu.description}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-xs text-base-content/50 shrink-0 ml-2">
                                                    {menu.totalKcal ? `${Number(menu.totalKcal).toFixed(0)} kcal` : ''}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            {selectedMenuIds.length > 0 && (
                                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                                    ✓ {selectedMenuIds.length} {selectedMenuIds.length === 1 ? 'menú seleccionado' : 'menús seleccionados'}
                                </p>
                            )}
                        </div>

                        {/* Momento */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/60 uppercase">
                                {t('dashboard.modals.assign_menu.moment_label') || "Momento del Día"}
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                                <select
                                    className="w-full pl-9 pr-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-purple-500"
                                    value={eatingMoment}
                                    onChange={(e) => setEatingMoment(e.target.value)}
                                >
                                    {EATING_MOMENTS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Notas */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/60 uppercase">
                                {t('dashboard.modals.assign_menu.notes_label') || "Indicaciones / Notas"}
                            </label>
                            <textarea
                                rows={2}
                                placeholder={t('dashboard.modals.assign_menu.notes_placeholder') || "Indicaciones específicas para el paciente..."}
                                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-purple-500"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-base-300 rounded-lg text-sm font-medium hover:bg-base-200">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={(selectedMenuIds.length === 0 && !menuId) || isLoading}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                            >
                                {isLoading && <Loader2 size={14} className="animate-spin" />}
                                {selectedMenuIds.length > 1 ? `Asignar ${selectedMenuIds.length} Menús` : "Asignar Menú"}
                            </button>
                        </div>
                    </form>
                )}

                {/* Tab 2: Crear Menú Estándar */}
                {activeTab === 'quick' && (
                    <form onSubmit={handleCreateAndAssignQuick} className="p-6 space-y-4 overflow-y-auto">
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-xl text-xs text-purple-800 dark:text-purple-300 flex items-start gap-2">
                            <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <span>Creá un menú estándar con su receta e indicaciones. Se registrará en la biblioteca y se asignará al paciente de inmediato.</span>
                        </div>

                        {/* Nombre del Menú */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">
                                Nombre del Menú *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Desayuno Proteico de Avena, Almuerzo Mediterráneo..."
                                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-purple-500"
                                value={quickName}
                                onChange={(e) => setQuickName(e.target.value)}
                            />
                        </div>

                        {/* Momento */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">
                                Tipo / Categoría / Momento *
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                                <select
                                    className="w-full pl-9 pr-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-purple-500"
                                    value={quickEatingMoment}
                                    onChange={(e) => setQuickEatingMoment(e.target.value)}
                                >
                                    {EATING_MOMENTS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tiempo y Dificultad */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-base-content/70 uppercase">
                                    Tiempo (minutos)
                                </label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Ej: 15"
                                        className="w-full pl-9 pr-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-purple-500"
                                        value={quickPrepTime}
                                        onChange={(e) => setQuickPrepTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-base-content/70 uppercase">
                                    Dificultad
                                </label>
                                <select
                                    className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-purple-500"
                                    value={quickDifficulty}
                                    onChange={(e) => setQuickDifficulty(e.target.value)}
                                >
                                    <option value="Fácil">Fácil</option>
                                    <option value="Media">Media</option>
                                    <option value="Difícil">Difícil</option>
                                </select>
                            </div>
                        </div>

                        {/* Receta / Preparación / Indicaciones */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">
                                Receta / Preparación / Indicaciones (Opcional)
                            </label>
                            <textarea
                                rows={4}
                                placeholder="Redactá la receta completa, ingredientes con porciones, modo de preparación y recomendaciones prácticas para el paciente..."
                                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-purple-500 leading-relaxed"
                                value={quickDescription}
                                onChange={(e) => setQuickDescription(e.target.value)}
                            />
                        </div>

                        {/* Notas adicionales */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-base-content/70 uppercase">
                                Notas Adicionales (Opcional)
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Recomendaciones o variaciones opcionales..."
                                className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-xl text-sm outline-none focus:border-purple-500"
                                value={quickNotes}
                                onChange={(e) => setQuickNotes(e.target.value)}
                            />
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-base-300 rounded-lg text-sm font-medium hover:bg-base-200">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={!quickName.trim() || isLoading}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                            >
                                {isLoading && <Loader2 size={14} className="animate-spin" />}
                                ⚡ Crear Menú Estándar y Asignar
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};