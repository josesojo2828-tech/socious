'use client';

import { apiClient } from "@/shared/api/api.client";
import { GetStructAndTable } from "@/shared/service/crud/crud.service";
import { Column } from "@/types/backend/table.type";
import { FilterConfig } from "@/types/filter.type";
import { ActionsType, ReponseStrucTable } from "@/types/requets";
import { useEffect, useState, useCallback, useRef } from "react";

interface Props {
    path: string;
    execute?: boolean;
    /** Extra query params merged into every request (e.g., { includeArchived: 'true' }) */
    extraParams?: Record<string, unknown>;
}

export function useHandlerCrud<T>({ path, execute, extraParams = {} }: Props) {
    const [title, setTitle] = useState('');
    const [list, setList] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Configuración de paginación
    const [page, setPage] = useState<{ current: number, total: number; limit: number, totalPages: number }>({ current: 1, limit: 10, total: 10, totalPages: 1 });

    const [column, setColumn] = useState<Column[]>([]);
    const [actions, setActions] = useState<ActionsType>({ create: false, update: false, delete: false });

    // --- NUEVO: Estado para la Configuración de Filtros (schema) ---
    const [filterConfig, setFilterConfig] = useState<FilterConfig | null>(null);

    // Estado para los valores actuales de los filtros
    const [filters, setFilters] = useState<Record<string, unknown>>({});

    const [refresh, setRefresh] = useState(0);

    const isInitializedRef = useRef(false);
    const lastPathRef = useRef(path);

    // Reiniciar inicialización si la ruta cambia
    if (lastPathRef.current !== path) {
        lastPathRef.current = path;
        isInitializedRef.current = false;
    }

    const ChangePage = (p: number) => {
        setPage(prev => ({ ...prev, current: p }));
    }

    const Reload = () => {
        setRefresh(prev => prev + 1);
    }

    // Get unique data
    const pageCurrent = page.current;
    const pageLimit = page.limit;

    // Serializar objects a strings para estabilizar el dependency array
    const filtersKey = JSON.stringify(filters);
    const extraParamsKey = JSON.stringify(extraParams);

    const fetchData = useCallback(async () => {
        const queryParams = new URLSearchParams();

        if (!path.includes('page=')) {
            queryParams.append('page', pageCurrent.toString());
        }
        if (!path.includes('limit=')) {
            queryParams.append('limit', pageLimit.toString());
        }

        // Merge extraParams (e.g., includeArchived)
        const parsedExtraParams = JSON.parse(extraParamsKey);
        Object.entries(parsedExtraParams).forEach(([key, val]) => {
            if (val !== undefined && val !== '' && val !== null && val !== false) {
                queryParams.append(key, String(val));
            }
        });

        // Merge dynamic filters
        const parsedFilters = JSON.parse(filtersKey);
        Object.keys(parsedFilters).forEach(key => {
            const val = parsedFilters[key];
            if (val !== undefined && val !== '' && val !== null) {
                queryParams.append(key, String(val));
            }
        });

        const queryStr = queryParams.toString();
        const separator = path.includes('?') ? '&' : '?';
        const url = queryStr ? `${path}${separator}${queryStr}` : path;
        setIsLoading(true);
        try {
            const response = await GetStructAndTable<ReponseStrucTable<T>>({ path: url });
            setList(response.list || []);
            setPage(prev => ({
                ...prev,
                total: response.total ?? prev.total,
                totalPages: response.totalPages ?? prev.totalPages,
                current: response.currentPage ?? prev.current
            }));

            // Inicializar metadatos estructurales (columnas, acciones, título, filtros) una sola vez por path
            if (!isInitializedRef.current) {
                if (response.columns) setColumn(response.columns);
                if (response.actions) setActions(response.actions);
                if (response.pageTitle) setTitle(response.pageTitle);
                if (response.filters) setFilterConfig(response.filters);
                isInitializedRef.current = true;
            }
        } catch (error) {
            console.error("Error in useHandlerCrud fetchData:", error);
        } finally {
            setIsLoading(false);
        }
    }, [path, pageCurrent, pageLimit, filtersKey, extraParamsKey]);

    useEffect(() => {
        if (execute !== false) {
            fetchData();
        }
    }, [execute, refresh, fetchData]);

    const ManagementDelte = async (path: string) => {
        apiClient.post(path).then(() => Reload())
    }

    const ManagementSearch = (newFilters: Record<string, unknown>) => {
        setFilters(newFilters);
        setPage(prev => ({ ...prev, current: 1 }));
    }

    return {
        page,
        list,
        actions,
        column,
        title,
        filterConfig,
        currentFilters: filters,
        isLoading,

        ChangePage,
        ManagementDelte,
        ManagementSearch,
        Reload,
    }
}
