"use client";

import React, { useState } from 'react';
import {
    LayoutDashboard,
    Activity,
    Target,
    FileText,
    Utensils,
    Users,
    ShoppingCart,
    Calculator
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { PatientHeader, ClinicalProfileType } from '../components/PatientHeader';
import { useRouter } from 'next/navigation';
import { AnthropometryTab } from '../components/AnthropometryTab';
import { GoalsTab } from '../components/GoalsTab';
import { LabResultsTab } from '../components/LabResultsTab';
import { PatientPlansTab } from '../components/PatientPlansTab';
import { PatientOverview } from '../components/PatientOverview';
import { PatientDietTab } from '../components/PatientDietTab';
import { PatientTeamTab } from '../components/PatientTeamTab';
import { PatientTab } from '@/features/calculadora/components/PatientTab';

import { useTranslation } from "@/context/i18n.context";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { hasEntitlement, isAdmin, ACCESS_KEYS } from "@/shared/authz";

interface Props {
    id: string; // ID del paciente (User ID o Patient ID según tu arquitectura)
}

type TabType = 'overview' | 'anthropometry' | 'goals' | 'labs' | 'plans' | 'shopping' | 'diet' | 'team' | 'calculadora';

export default function PatientDetail({ id }: Props) {
    const { t } = useTranslation();
    const router = useRouter();
    const { currentPatient, isLoading, error, fetchPatientById } = usePatient();
    const currentUser = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [clinicalProfile, setClinicalProfile] = useState<ClinicalProfileType>('GENERAL');

    // Cargar datos al montar (o usar useEffect con el ID si el hook no lo hace auto)
    React.useEffect(() => {
        fetchPatientById(id);
    }, [id, fetchPatientById]);

    if (isLoading) {
        return <div className="min-h-screen bg-base-200 flex items-center justify-center animate-pulse">
            <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-base-300 rounded-full"></div>
                <div className="w-48 h-4 bg-base-300 rounded"></div>
            </div>
        </div>;
    }

    if (error || !currentPatient) {
        return <div className="p-8 text-center text-red-500">Error: {error || t('dashboard.patients.detail.not_found')}</div>;
    }

    // --- Gating del tab Equipo ---
    const isPremiumViewer = hasEntitlement(currentUser, ACCESS_KEYS.PREMIUM) || isAdmin(currentUser);
    const viewerNutritionistId = currentUser?.nutritionistProfile?.id ?? null;
    const isTeamMember = (currentPatient.nutritionists ?? [])
        .filter((m) => m.isActive !== false)
        .some((m) => m.nutritionistId === viewerNutritionistId);
    const readOnly = isTeamMember && !isPremiumViewer;
    const showTeamTab = isPremiumViewer;

    // Configuración de Navegación
    const tabs = [
        { id: 'overview', label: t('dashboard.patients.detail.tabs.overview'), icon: LayoutDashboard },
        { id: 'anthropometry', label: t('dashboard.patients.detail.tabs.anthropometry'), icon: Activity },
        { id: 'goals', label: t('dashboard.patients.detail.tabs.goals'), icon: Target },
        { id: 'plans', label: t('dashboard.patients.detail.tabs.plans'), icon: Utensils },
        { id: 'labs', label: t('dashboard.patients.detail.tabs.labs'), icon: FileText },
        { id: 'diet', label: t('dashboard.patients.detail.tabs.diet'), icon: Utensils },
        { id: 'calculadora', label: t('dashboard.patients.detail.tabs.calculadora'), icon: Calculator },
        ...(showTeamTab
            ? [{ id: 'team', label: t('dashboard.patients.detail.tabs.team'), icon: Users }]
            : []),
        // { id: 'shopping', label: t('dashboard.patients.detail.tabs.shopping'), icon: ShoppingCart },
    ];

    return (
        <div className="min-h-screen mt-4 bg-base-200 flex flex-col">

            {/* 1. Header Fijo (Información Clave) */}
            <PatientHeader patient={currentPatient} onProfileChange={(mode) => setClinicalProfile(mode)} />

            {/* 2. Navegación de Pestañas */}
            <div className="bg-base-100 border-b border-base-300 px-4 sm:px-6 md:px-8 sticky top-0 z-10 shadow-sm scroll-fade">
                <nav className="flex gap-2 sm:gap-6 overflow-x-auto nav-scrollbar py-1">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`
                                    flex items-center gap-2 py-3 sm:py-4 px-1 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0
                                    ${isActive
                                        ? 'border-blue-600 text-emerald-600'
                                        : 'border-transparent text-base-content/60 hover:text-base-content hover:border-base-300'
                                    }
                                `}
                            >
                                <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* 3. Contenido Dinámico */}
            <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
                <div className="animate-in fade-in duration-300">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <PatientOverview patient={currentPatient} clinicalProfile={clinicalProfile} />
                        </div>
                    )}
                    {activeTab === 'anthropometry' && <AnthropometryTab patientId={currentPatient.id} patient={currentPatient} onUpdate={() => fetchPatientById(currentPatient.id)} />}
                    {activeTab === 'goals' && <GoalsTab patientId={currentPatient.id} onUpdate={() => fetchPatientById(currentPatient.id)} />}
                    {activeTab === 'labs' && <LabResultsTab patientId={currentPatient.id} onUpdate={() => fetchPatientById(currentPatient.id)} />}
                    {activeTab === 'plans' && <PatientPlansTab patientId={currentPatient.id} onUpdate={() => fetchPatientById(currentPatient.id)} />}
                    {activeTab === 'diet' && <PatientDietTab onRefresh={() => fetchPatientById(currentPatient.id)} patient={currentPatient} />}
                    {activeTab === 'team' && showTeamTab && <PatientTeamTab patientId={currentPatient.id} readOnly={readOnly} />}
                    {activeTab === 'calculadora' && <PatientTab patientId={currentPatient.id} patient={currentPatient} />}
                </div>
            </main>
        </div>
    );
}