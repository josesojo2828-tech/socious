import { useState, useCallback, useEffect } from 'react';
import { apiClient } from "@/shared/api/api.client";
import { SportDisciplineEndpoints } from '../services/sport-discipline.endpoint';

export interface SportDisciplineItem {
    id: string;
    code: string;
    name: string;
    metValue: number;
    category: string;
}

export const useSportDisciplines = () => {
    const [disciplines, setDisciplines] = useState<SportDisciplineItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDisciplines = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // GET /api/patient/sport-disciplines -> [{ id, code, name, metValue, category }]
            const response = await apiClient.get(SportDisciplineEndpoints.actions.list());
            const list = Array.isArray(response.data) ? response.data : response.data.list ?? [];
            setDisciplines(list.map((d: any) => ({
                id: d.id ?? d.code,
                code: d.code,
                name: d.name,
                metValue: Number(d.metValue),
                category: d.category,
            })));
        } catch (error: any) {
            console.error("Error cargando disciplinas deportivas:", error);
            setError(error.response?.data?.message || "Error al cargar las disciplinas deportivas.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDisciplines();
    }, [fetchDisciplines]);

    return {
        disciplines,
        loading,
        error
    };
};
