import { apiClient } from '@/shared/api/api.client';
import { useState, useEffect } from 'react';

// Tipado de la respuesta
export interface ShoppingItem {
    foodId: string;
    name: string;
    brand: string | null;
    totalQuantity: number;
    unit: string;
    checked: boolean;
}

export const useShoppingList = (planId: string) => {
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!planId) return;

        const fetchList = async () => {
            try {
                setLoading(true);
                // Ajusta la URL a tu API real
                const res = await apiClient.get<{items:ShoppingItem[]}>(`/api/plans/${planId}/shopping-list`);
                const data = res.data;
                setItems(data ? data.items : []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchList();
    }, [planId]);

    // Función para marcar items como comprados (solo localmente en UI por ahora)
    const toggleItem = (foodId: string) => {
        setItems((prev) =>
            prev.map((item) =>
                item.foodId === foodId ? { ...item, checked: !item.checked } : item
            )
        );
    };

    return { items, loading, error, toggleItem };
};