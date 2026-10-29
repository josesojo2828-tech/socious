"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { DashboardEndpoints } from '@/features/dashboard/service/dashboard.endpoints';
import { useTranslation } from '@/context/i18n.context';

const MapContent = dynamic(() => import('./MapContent'), { ssr: false });

export interface OfficeLocation {
    id: string;
    fullName: string;
    email: string;
    lat: number;
    lng: number;
}

interface LocationsResponse {
    list: OfficeLocation[];
}

const OfficeLocationsMap: React.FC = () => {
    const { t } = useTranslation();
    const [locations, setLocations] = useState<OfficeLocation[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        apiClient
            .get<LocationsResponse>(DashboardEndpoints.api.locations, { signal: controller.signal })
            .then((res) => setLocations(res.data?.list ?? []))
            .catch((err) => {
                if (err?.code !== 'ERR_CANCELED') {
                    console.error('Error fetching dashboard locations:', err);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            });
        return () => controller.abort();
    }, []);

    if (isLoading) {
        return (
            <div className="w-full h-[480px] rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                <p className="text-sm text-slate-400 font-medium flex items-center gap-2">
                    <MapPin size={16} className="animate-pulse text-primary" />
                    Cargando consultorios...
                </p>
            </div>
        );
    }

    if (!locations || locations.length === 0) {
        return (
            <div className="w-full h-[480px] rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                <p className="text-sm text-slate-400 font-medium flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    {t('dashboard.sections.analytics.office_locations_empty') || 'Aún no hay consultorios registrados'}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50 relative">
            <MapContent locations={locations} />
        </div>
    );
};

export default OfficeLocationsMap;