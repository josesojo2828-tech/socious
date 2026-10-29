import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MenuEndpoints } from '../services/menu.endpoint';
import { AddMenuCondimentPayload, AddMenuIngredientPayload, MenuDetail } from '../types/menu.details';
import { apiClient } from '@/shared/api/api.client';

export const useMenuDetail = (menuId: string) => {
    // --- ESTADOS ---
    const [menu, setMenu] = useState<MenuDetail | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState<boolean>(false); // Para spinners de carga en botones

    // Estado UI Local
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Ref para evitar closures stale en funciones pasadas a modales
    const menuRef = useRef<MenuDetail | null>(null);
    menuRef.current = menu;

    // --- 1. FETCH DATA ---
    const fetchMenu = useCallback(async () => {
        if (!menuId) return;

        try {
            setIsLoading(true);
            setError(null);

            // GET /api/menu/:id/detail/api
            const response = await apiClient.get<MenuDetail>(MenuEndpoints.actions.detailApi(menuId));

            setMenu(response.data);
        } catch (err: any) {
            console.error("Error cargando menú:", err);
            setError(err.response?.data?.message || "No se pudo cargar el menú.");
        } finally {
            setIsLoading(false);
        }
    }, [menuId]);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    // --- 2. ACCIONES (Agregar / Eliminar Ingredientes) ---

    const handleAddIngredient = useCallback(async (payload: AddMenuIngredientPayload): Promise<boolean> => {
        // Usar ref para evitar closure stale cuando se llama desde un modal
        if (!menuRef.current) return false;
        setIsUpdating(true);

        try {
            // POST /api/menu/:id/items/api
            // El backend devuelve el objeto Menu COMPLETO y RECALCULADO
            const response = await apiClient.post<MenuDetail>(
                MenuEndpoints.actions.addItemApi(menuId),
                payload
            );

            // Actualizamos todo el estado con la respuesta del servidor (incluye nuevos totales)
            setMenu(response.data);
            return true;

        } catch (err: any) {
            console.error("Error agregando ingrediente:", err);
            alert(err.response?.data?.message || "Error al agregar el ingrediente");
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, [menuId]);

    const handleUpdateIngredient = useCallback(async (itemId: string, payload: AddMenuIngredientPayload): Promise<boolean> => {
        if (!menuRef.current) return false;
        setIsUpdating(true);

        try {
            // POST /api/menu/items/:itemId/update/api
            // El backend devuelve el objeto Menu COMPLETO y RECALCULADO
            const response = await apiClient.post<MenuDetail>(
                MenuEndpoints.actions.updateItemApi(itemId),
                payload
            );

            // Actualizamos todo el estado con la respuesta del servidor (incluye nuevos totales)
            setMenu(response.data);
            return true;

        } catch (err: any) {
            console.error("Error editando ingrediente:", err);
            alert(err.response?.data?.message || "Error al editar el ingrediente");
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, []);

    const handleDeleteIngredient = async (itemId: string) => {
        if (!menu) return;

        const previousMenu = { ...menu };
        setMenu({
            ...menu,
            items: menu.items.filter(i => i.id !== itemId)
        });

        try {
            // DELETE /api/menu/items/:itemId/api
            // El backend devuelve el objeto Menu RECALCULADO
            const response = await apiClient.delete<MenuDetail>(MenuEndpoints.actions.deleteItemApi(itemId));

            // Actualizamos con los datos reales (totales corregidos)
            setMenu(response.data);

        } catch (err: any) {
            console.error("Error eliminando ingrediente:", err);
            alert("No se pudo eliminar el ingrediente.");
            // Rollback si falla
            setMenu(previousMenu);
        }
    };

    const handleAddCondiment = useCallback(async (payload: AddMenuCondimentPayload): Promise<boolean> => {
        // Usar ref para evitar closure stale cuando se llama desde un modal
        if (!menuRef.current) return false;
        setIsUpdating(true);

        try {
            // POST /api/menu/:id/condiments/api
            // El backend devuelve el objeto Menu COMPLETO (con condimentos)
            const response = await apiClient.post<MenuDetail>(
                MenuEndpoints.actions.addCondimentApi(menuId),
                payload
            );

            // Actualizamos todo el estado con la respuesta del servidor
            setMenu(response.data);
            return true;

        } catch (err: any) {
            console.error("Error agregando condimento:", err);
            alert(err.response?.data?.message || "Error al agregar el condimento");
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, [menuId]);

    const handleRemoveCondiment = useCallback(async (mcId: string): Promise<boolean> => {
        // Usar ref para evitar closure stale cuando se llama desde un modal
        if (!menuRef.current) return false;
        setIsUpdating(true);

        try {
            // DELETE /api/menu/condiments/:condimentId/api
            // El backend devuelve el objeto Menu COMPLETO (con condimentos)
            const response = await apiClient.delete<MenuDetail>(
                MenuEndpoints.actions.deleteCondimentApi(mcId)
            );

            // Actualizamos todo el estado con la respuesta del servidor
            setMenu(response.data);
            return true;

        } catch (err: any) {
            console.error("Error eliminando condimento:", err);
            alert(err.response?.data?.message || "Error al eliminar el condimento");
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, [menuId]);

    const handleUploadImage = useCallback(async (file: File): Promise<boolean> => {
        if (!menuRef.current) return false;
        setIsUpdating(true);

        try {
            // POST /api/menu/:id/image/api (multipart)
            // El backend devuelve el objeto Menu COMPLETO con la nueva imageUrl
            const formData = new FormData();
            formData.append("file", file);

            const response = await apiClient.post<MenuDetail>(
                MenuEndpoints.actions.uploadImageApi(menuId),
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            setMenu(response.data);
            return true;

        } catch (err: any) {
            console.error("Error subiendo foto del menú:", err);
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, [menuId]);

    const handleRemoveImage = useCallback(async (): Promise<boolean> => {
        if (!menuRef.current) return false;
        setIsUpdating(true);

        try {
            // DELETE /api/menu/:id/image/api
            // El backend devuelve el objeto Menu COMPLETO sin imageUrl
            const response = await apiClient.delete<MenuDetail>(
                MenuEndpoints.actions.deleteImageApi(menuId)
            );

            setMenu(response.data);
            return true;

        } catch (err: any) {
            console.error("Error eliminando foto del menú:", err);
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, [menuId]);

    // --- 3. LÓGICA LOCAL (Filtros) ---

    const filteredIngredients = useMemo(() => {
        if (!menu) return [];
        if (!searchTerm) return menu.items;

        const lower = searchTerm.toLowerCase();
        return menu.items.filter(item =>
            item.food.name.toLowerCase().includes(lower)
        );
    }, [menu, searchTerm]);

    return {
        // Datos
        menu,
        isLoading,
        error,
        isUpdating,

        // UI
        searchTerm,
        setSearchTerm,
        filteredIngredients,

        // Acciones
        handleAddIngredient,
        handleUpdateIngredient,
        handleDeleteIngredient,
        handleAddCondiment,
        handleRemoveCondiment,
        handleUploadImage,
        handleRemoveImage,
        refetch: fetchMenu
    };
};