import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { AddExchangeItemPayload, ExchangeListDetail, getExchangeMacros } from '../types/exchange-list.unique.type';
import { ExchangeListEndpoints } from '../services/exchange-list.endpoint';
import { apiClient } from '@/shared/api/api.client';


export const useExchangeListDetail = (listId: string) => {
    // --- ESTADOS ---
    const [list, setList] = useState<ExchangeListDetail | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Estado UI Local
    const [searchTerm, setSearchTerm] = useState<string>('');

    // --- 1. FETCH DATA (Cargar Detalle) ---
    const fetchList = useCallback(async () => {
        if (!listId) return;

        try {
            setIsLoading(true);
            setError(null);

            // GET /api/exchange-list/:id/detail/api
            const response = await apiClient.get<ExchangeListDetail>(ExchangeListEndpoints.actions.unique(listId));

            setList(response.data);
        } catch (err: unknown) {
            console.error("Error cargando lista:", err);
            let errorMessage = "No se pudo cargar la lista.";
            if (axios.isAxiosError(err)) {
                errorMessage = (err.response?.data as { message?: string })?.message || errorMessage;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [listId]);

    // Cargar al montar o cambiar ID
    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // --- 2. ACCIONES DEL BACKEND (Agregar / Eliminar) ---

    const handleAddItem = async (payload: AddExchangeItemPayload): Promise<boolean> => {
        if (!list) return false;

        try {
            // POST /api/exchange-list/:id/items/api
            // Backend ahora devuelve la lista completa recalculada
            const response = await apiClient.post(ExchangeListEndpoints.actions.addItemApi(listId), payload);

            // Actualización con datos recalculados del backend
            setList(response.data);

            return true;
        } catch (err: unknown) {
            console.error("Error agregando item:", err);
            let errorMessage = "Error al agregar el alimento";
            if (axios.isAxiosError(err)) {
                errorMessage = (err.response?.data as { message?: string })?.message || errorMessage;
            }
            alert(errorMessage);
            return false;
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!list) return;

        // Guardar estado previo para rollback si falla (Optimistic UI)
        const previousList = list;

        // 1. Actualizar UI inmediatamente (filtro visual)
        setList(prev => prev ? {
            ...prev,
            items: prev.items.filter(i => i.id !== itemId)
        } : null);

        try {
            // 2. Llamada DELETE al Backend - devuelve lista recalculada
            const response = await apiClient.delete(ExchangeListEndpoints.actions.deleteItemApi(itemId));

            // 3. Actualizar con datos recalculados del backend
            setList(response.data);
        } catch (err: unknown) {
            console.error("Error eliminando item:", err);
            alert("No se pudo eliminar el item. Intenta de nuevo.");

            // 4. Rollback si falla
            setList(previousList);
        }
    };

    // --- 3. LÓGICA LOCAL (Filtros y Totalizador) ---

    // Filtrado de items por nombre de alimento (Case Insensitive)
    const filteredItems = useMemo(() => {
        if (!list) return [];
        if (!searchTerm) return list.items;

        const lowerTerm = searchTerm.toLowerCase();
        return list.items.filter(item => {
            const name = item.foodExchangeList?.name?.toLowerCase() || '';
            const category = item.foodExchangeList?.category?.toLowerCase() || '';
            const sub = item.foodExchangeList?.sub?.toLowerCase() || '';

            return name.includes(lowerTerm) ||
                category.includes(lowerTerm) ||
                sub.includes(lowerTerm);
        });
    }, [list, searchTerm]);

    // Totalizador: Suma real de macronutrientes de TODOS los items cargados
    const totals = useMemo(() => {
        if (!list || list.items.length === 0) {
            return { kcal: 0, protein: 0, fat: 0, carbs: 0 };
        }

        let totalKcal = 0;
        let totalProtein = 0;
        let totalFat = 0;
        let totalCarbs = 0;

        for (const item of list.items) {
            const macros = getExchangeMacros(
                item.foodExchangeList?.category,
                item.foodExchangeList?.sub
            );
            const raciones = Number(item.amount) || 1;

            totalKcal += macros.kcal * raciones;
            totalProtein += macros.protein * raciones;
            totalFat += macros.fat * raciones;
            totalCarbs += macros.carbs * raciones;
        }

        return {
            kcal: Math.round(totalKcal),
            protein: Number(totalProtein.toFixed(1)),
            fat: Number(totalFat.toFixed(1)),
            carbs: Number(totalCarbs.toFixed(1)),
        };
    }, [list]);

    return {
        // Estado Data
        list,
        isLoading,
        error,

        // Estado UI
        searchTerm,
        setSearchTerm,

        // Datos Computados
        filteredItems,
        totals,

        // Acciones
        handleAddItem,
        handleDeleteItem,
        refetch: fetchList
    };
};