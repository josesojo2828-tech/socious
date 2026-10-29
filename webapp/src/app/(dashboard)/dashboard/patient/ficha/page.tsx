"use client";

import React, { useState } from 'react';
import { LayoutDashboard, Activity, Target, FileText, Utensils, Users, Baby } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { usePatientFicha } from '@/features/nutringest/patient/hooks/usePatientFicha';

import { PatientFichaOverview } from '@/features/nutringest/patient/components/patient-ficha/PatientFichaOverview';
import { PatientFichaAnthropometry } from '@/features/nutringest/patient/components/patient-ficha/PatientFichaAnthropometry';
import { PatientFichaGoals } from '@/features/nutringest/patient/components/patient-ficha/PatientFichaGoals';
import { PatientFichaPlans } from '@/features/nutringest/patient/components/patient-ficha/PatientFichaPlans';
import { PatientFichaLabs } from '@/features/nutringest/patient/components/patient-ficha/PatientFichaLabs';
import { PatientFichaDiet } from '@/features/nutringest/patient/components/patient-ficha/PatientFichaDiet';
import { PatientFichaTeam } from '@/features/nutringest/patient/components/patient-ficha/PatientFichaTeam';
import { PatientFichaPediatric } from '@/features/nutringest/patient/components/patient-ficha/PatientFichaPediatric';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';
import { hasEntitlement, isAdmin, ACCESS_KEYS } from '@/shared/authz';

type TabType = 'overview' | 'anthropometry' | 'goals' | 'plans' | 'labs' | 'diet' | 'team' | 'pediatric';

export default function PatientFichaPage() {
    const { user } = useAuthStore();
    const { patient, isLoading, error } = usePatientFicha();
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get('tab') as TabType) || 'overview';
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    const showTeamTab = hasEntitlement(user, ACCESS_KEYS.PREMIUM) || isAdmin(user);

    const isPediatric = Boolean(
        (patient?.age && patient.age < 18) ||
        (patient?.birthDate && (new Date().getFullYear() - new Date(patient.birthDate).getFullYear() < 18))
    );

    const tabs = [
        { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
        ...(isPediatric ? [{ id: 'pediatric', label: 'Ficha Pediátrica', icon: Baby }] : []),
        { id: 'anthropometry', label: 'Antropometría', icon: Activity },
        { id: 'goals', label: 'Metas', icon: Target },
        { id: 'plans', label: 'Planes', icon: Utensils },
        { id: 'labs', label: 'Análisis', icon: FileText },
        { id: 'diet', label: 'Dieta', icon: Utensils },
        ...(showTeamTab ? [{ id: 'team', label: 'Equipo', icon: Users }] : []),
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                    <div className="w-48 h-4 bg-gray-200 rounded"></div>
                    <div className="w-32 h-3 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="bg-red-50 p-5 rounded-full mb-4 text-red-500 mx-auto w-fit">
                        <FileText size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-500 text-sm">{error || 'No se encontró tu expediente.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 py-6">
                <h1 className="text-2xl font-black text-gray-900">
                    {patient.firstName} {patient.lastName}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    {patient.age || '-'} años · {patient.gender || '-'} · {patient.email}
                </p>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 sticky top-0 z-10 shadow-sm">
                <nav className="flex gap-2 sm:gap-6 overflow-x-auto py-1">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0
                                    ${isActive
                                        ? 'border-emerald-600 text-emerald-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Content */}
            <main className="p-6 md:p-8 max-w-7xl mx-auto">
                <div className="animate-in fade-in duration-300">
                    {activeTab === 'overview' && (
                        <PatientFichaOverview
                            patient={patient}
                            onTabChange={(t) => setActiveTab(t as TabType)}
                        />
                    )}
                    {activeTab === 'pediatric' && isPediatric && (
                        <PatientFichaPediatric patient={patient} />
                    )}
                    {activeTab === 'anthropometry' && <PatientFichaAnthropometry patient={patient} />}
                    {activeTab === 'goals' && <PatientFichaGoals patient={patient} />}
                    {activeTab === 'plans' && <PatientFichaPlans patient={patient} />}
                    {activeTab === 'labs' && <PatientFichaLabs patient={patient} />}
                    {activeTab === 'diet' && <PatientFichaDiet patient={patient} />}
                    {activeTab === 'team' && showTeamTab && <PatientFichaTeam patient={patient} />}
                </div>
            </main>
        </div>
    );
}
