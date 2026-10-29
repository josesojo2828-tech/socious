'use client';

import { apiClient } from "@/shared/api/api.client";
import { useEffect, useState, useCallback } from "react";
import { UserEndpoints } from "../services/user.endpoints";
import { ReferralStats } from "../types/reference.types";
import { useToastStore } from "@/shared/store/ui/useToastStore";

export const useReferrals = ({execute}: { execute?: boolean } = {}) => {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [loading, setLoading] = useState(true); // Empieza cargando
    const [error, setError] = useState(false);

    const { addToast } = useToastStore.getState(); // O usa el hook useToastStore()

    // Función para cargar datos
    const getStats = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get<ReferralStats>(UserEndpoints.referral.me());
            setStats(response.data);
            setError(false);
        } catch (err) {
            console.error("Error fetching referral stats", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    // Cargar al montar
    useEffect(() => {
        if(!execute) return;
        getStats();
    }, [getStats]);

    // Utilidad para copiar el código o link
    const copyReferralLink = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            addToast({
                type: 'success',
                message: 'Enlace de referido copiado al portapapeles.',
                title: '¡Copiado!'
            });
        } catch (err) {
            console.error("Error copying to clipboard", err);
            addToast({
                type: 'error',
                message: 'No se pudo copiar el enlace automáticamente.',
                title: 'Error'
            });
        }
    };

    return {
        stats,
        loading,
        error,
        copyReferralLink,
        refresh: getStats
    };
};