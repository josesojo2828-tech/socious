"use client";

import { apiClient } from "@/shared/api/api.client";
import { ActionsType } from "@/types/requets";
import { useQuery } from "@tanstack/react-query";

interface UseUniqueObjectResponse<T> {
    object: T;
    actions: ActionsType;
    [key: string]: any;
}

export function useUniqueObject<T>({ path, extraKey, headers }: { path: string, extraKey?: string, headers?: Record<string, string> }) {

    const { data, isLoading, refetch } = useQuery({
        queryKey: [path, extraKey, headers],
        queryFn: async () => {
            const response = await apiClient.get<any>(path, { headers });
            return response.data;
        }
    });

    const entity = (data?.object || (data && !('object' in data) ? data : null)) as T | null;
    const actions = data?.actions || { create: false, update: false, delete: false };
    const extra = data && extraKey ? (data as any)[extraKey] : {};

    const ManagementDelte = async (deletePath: string, cb?: () => void) => {
        try {
            await apiClient.post(deletePath);
            if (cb) cb();
        } catch (e) {
            console.error(e);
        }
    }

    return {
        entity,
        loading: isLoading,
        GetEntity: refetch, // Alias for backward compatibility
        actions,
        extra,
        ManagementDelte,
        Reload: refetch
    }
}
