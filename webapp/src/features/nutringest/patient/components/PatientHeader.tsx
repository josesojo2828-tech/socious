import React, { useState, useEffect } from 'react';
import { Mail, Phone, Edit, Calendar, ArrowLeft, Activity, Settings, Check, X, Baby, Trophy, FileText } from 'lucide-react';
import { PatientDetail } from '@/types/nutringest/patient.interface';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { CreateConsultationModal } from '@/features/nutringest/components/CreateConsultationModal';
import { apiClient } from '@/shared/api/api.client';
import { ConsultationEndpoints } from '@/features/nutringest/diet/services/consultation.endpoint';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/i18n.context';
import { useAuthStore } from '@/shared/store/auth/useAuthStore';

export type ClinicalProfileType = 'GENERAL' | 'PEDIATRIC' | 'SPORTS';

interface Props {
    patient: PatientDetail;
    onProfileChange?: (mode: ClinicalProfileType) => void;
}

export const PatientHeader = ({ patient, onProfileChange }: Props) => {
    const { t } = useTranslation();
    const { openModal, closeModal } = useModalStore();
    const router = useRouter();
    const { user } = useAuthStore();
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Determinar si el usuario es PRO (sin acceso a pediatría/deportiva)
    const activeSub = user?.subscriptions?.find((s: any) => s.status === 'ACTIVE') || user?.subscriptions?.[0];
    const planName = (activeSub?.plan?.name || '').toUpperCase();
    const isPRO = planName === 'PRO';

    // Calculation of age if not coming from backend
    const calculateAge = (birthDate: string) => {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const age = patient.age || calculateAge(patient.birthDate);

    // Storage key per patient
    const storageKey = `nutringest_patient_clinical_profile_${patient.id}`;
    const [clinicalProfile, setClinicalProfile] = useState<ClinicalProfileType>('GENERAL');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(storageKey);
            if (saved === 'GENERAL' || saved === 'PEDIATRIC' || saved === 'SPORTS') {
                setClinicalProfile(saved as ClinicalProfileType);
                onProfileChange?.(saved as ClinicalProfileType);
            } else {
                const initial = age < 18 ? 'PEDIATRIC' : 'GENERAL';
                setClinicalProfile(initial);
                onProfileChange?.(initial);
            }
        }
    }, [patient.id, age]);

    const handleSelectProfile = (mode: ClinicalProfileType) => {
        setClinicalProfile(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, mode);
        }
        onProfileChange?.(mode);
        setIsConfigOpen(false);
    };

    // Helper to get gender badge styles
    const getGenderBadgeStyles = (gender?: string) => {
        if (!gender) return '';
        const g = gender.toUpperCase();
        if (g === 'FEMALE' || g === 'FEMENINO') {
            return 'bg-pink-50 text-pink-700 border border-pink-100';
        }
        if (g === 'MALE' || g === 'MASCULINO') {
            return 'bg-blue-50 text-blue-700 border border-blue-100';
        }
        return 'bg-base-200 text-base-content/80 border border-base-300';
    };

    const handleCreateConsultation = () => {
        openModal(
            <CreateConsultationModal
                isOpen={true}
                onClose={closeModal}
                defaultPatient={{ id: patient.id, fullName: `${patient.firstName} ${patient.lastName}` }}
                onSubmit={async (data) => {
                    try {
                        const scheduledAt = new Date(`${data.date}T${data.time}`).toISOString();
                        await apiClient.post(ConsultationEndpoints.actions.create(), {
                            patientId: data.patientId,
                            scheduledAt,
                            type: data.type,
                            reason: data.reason
                        });
                        closeModal();
                        // Refrescar página para ver cambios
                        window.location.reload();
                        return true;
                    } catch (error) {
                        console.error("Error creating consultation:", error);
                        return false;
                    }
                }}
            />
        );
    };

    return (
        <div className="bg-base-100 border-b border-base-300 px-4 py-5 sm:px-6 md:px-8 relative">
            <div className="max-w-7xl mx-auto mb-3 sm:mb-4 print:hidden">
                <button 
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 text-xs font-bold text-base-content/70 hover:text-emerald-600 transition-colors uppercase tracking-wider"
                >
                    <ArrowLeft size={16} /> Regresar
                </button>
            </div>
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-5 md:gap-6 items-start md:items-center justify-between">

                <div className="flex items-center gap-3.5 sm:gap-5 w-full md:w-auto">
                    {/* Avatar */}
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl sm:text-2xl font-bold border-2 sm:border-4 border-base-100 shadow-sm shrink-0">
                        {patient.avatarUrl ? (
                            <img src={patient.avatarUrl} alt={patient.firstName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span>{patient.firstName.charAt(0)}{patient.lastName.charAt(0)}</span>
                        )}
                    </div>

                    {/* Info Principal */}
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl font-bold text-base-content leading-tight truncate" translate="no">
                            <span className="notranslate">{patient.firstName} {patient.lastName}</span>
                        </h1>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm text-base-content/70 mt-1">
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] sm:text-xs font-bold border border-emerald-100">
                                {patient.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                            </span>
                            <span className="flex items-center gap-1 font-medium text-base-content/70">
                                <Calendar size={14} /> {age} años
                            </span>
                            {patient.gender && (
                                <span className={`px-2 py-0.5 rounded text-[11px] sm:text-xs font-bold capitalize ${getGenderBadgeStyles(patient.gender)}`}>
                                    {t('common.gender.' + patient.gender.toLowerCase())}
                                </span>
                            )}

                            {/* Badge de Modalidad Clínica */}
                            {clinicalProfile === 'PEDIATRIC' && (
                                <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded text-[11px] sm:text-xs font-extrabold flex items-center gap-1">
                                    <Baby size={13} className="text-sky-600" /> Pediátrico
                                </span>
                            )}
                            {clinicalProfile === 'SPORTS' && (
                                <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[11px] sm:text-xs font-extrabold flex items-center gap-1">
                                    <Trophy size={13} className="text-purple-600" /> Deportivo
                                </span>
                            )}
                            {clinicalProfile === 'GENERAL' && (
                                <span className="bg-base-200 text-base-content border border-base-300 px-2 py-0.5 rounded text-[11px] sm:text-xs font-extrabold flex items-center gap-1">
                                    <FileText size={13} className="text-base-content/70" /> General
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Datos de Contacto y Acciones */}
                <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                    {(patient.phone || patient.email) && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-base-content/70">
                            {patient.phone && (
                                <div className="flex items-center gap-1.5">
                                    <Phone size={15} className="text-base-content/50 shrink-0" />
                                    <span>{patient.phone}</span>
                                </div>
                            )}
                            {patient.email && (
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <Mail size={15} className="text-base-content/50 shrink-0" />
                                    <a href={`mailto:${patient.email}`} className="hover:text-emerald-600 transition-colors truncate max-w-[220px] sm:max-w-none">
                                        {patient.email}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Acciones del Encabezado */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full md:w-auto mt-1 md:mt-0">
                        {/* Botón de Configuración de Perfil Clínico (Solo PREMIUM) */}
                        {!isPRO && (
                            <button
                                onClick={() => setIsConfigOpen(true)}
                                className="btn btn-sm btn-outline border-base-300 text-base-content hover:bg-base-200 gap-1.5 shadow-sm flex-1 sm:flex-initial min-w-0 text-xs sm:text-sm justify-center"
                                title="Configurar Modalidad de Ficha"
                            >
                                <Settings size={15} className="text-base-content/70 shrink-0" />
                                <span className="truncate">Configurar Ficha</span>
                            </button>
                        )}

                        {/* Botón de Historia según Perfil Clínico Activo - No visible para PRO */}
                        {!isPRO && clinicalProfile === 'PEDIATRIC' && (
                            <>
                                <button
                                    onClick={() => router.push(`/dashboard/patients/${patient.id}/historia-pediatrica`)}
                                    className="btn btn-sm bg-sky-700 text-white hover:bg-sky-800 gap-1.5 flex-1 sm:flex-initial shadow-sm border-none min-w-0 text-xs sm:text-sm justify-center"
                                >
                                    <Baby size={15} className="shrink-0" />
                                    <span className="truncate">Historia Pediátrica</span>
                                </button>
                                <button
                                    onClick={() => router.push(`/dashboard/patients/${patient.id}/clinical-history`)}
                                    className="btn btn-sm btn-outline border-base-300 text-base-content hover:bg-base-200 gap-1.5 flex-1 sm:flex-initial min-w-0 text-xs sm:text-sm justify-center"
                                >
                                    <Edit size={14} className="shrink-0" />
                                    <span className="truncate">Historia General</span>
                                </button>
                            </>
                        )}
                        {!isPRO && clinicalProfile === 'SPORTS' && (
                            <>
                                <button
                                    onClick={() => router.push(`/dashboard/patients/${patient.id}/historia-deportiva`)}
                                    className="btn btn-sm bg-purple-600 text-white hover:bg-purple-700 gap-1.5 flex-1 sm:flex-initial shadow-sm border-none min-w-0 text-xs sm:text-sm justify-center"
                                >
                                    <Trophy size={15} className="shrink-0" />
                                    <span className="truncate">Historia Deportiva</span>
                                </button>
                                <button
                                    onClick={() => router.push(`/dashboard/patients/${patient.id}/clinical-history`)}
                                    className="btn btn-sm btn-outline border-base-300 text-base-content hover:bg-base-200 gap-1.5 flex-1 sm:flex-initial min-w-0 text-xs sm:text-sm justify-center"
                                >
                                    <Edit size={14} className="shrink-0" />
                                    <span className="truncate">Historia General</span>
                                </button>
                            </>
                        )}
                        {clinicalProfile === 'GENERAL' && (
                            <button
                                onClick={() => router.push(`/dashboard/patients/${patient.id}/clinical-history`)}
                                className="btn btn-sm bg-base-300 text-base-content hover:bg-base-200 gap-1.5 flex-1 sm:flex-initial shadow-sm border-none min-w-0 text-xs sm:text-sm justify-center"
                            >
                                <Edit size={15} className="shrink-0" />
                                <span className="truncate">Historia Clínica General</span>
                            </button>
                        )}

                        <button
                            onClick={handleCreateConsultation}
                            className="btn btn-sm btn-primary bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex-1 sm:flex-initial min-w-0 text-xs sm:text-sm justify-center col-span-2 sm:col-span-1"
                        >
                            <span className="truncate">Nueva Consulta</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Configuración de Perfil Clínico */}
            {isConfigOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-base-100 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-base-300 space-y-5 relative">
                        <div className="flex justify-between items-center border-b border-base-300 pb-3">
                            <div className="flex items-center gap-2">
                                <Settings className="text-emerald-600" size={20} />
                                <h3 className="font-bold text-base-content text-lg">Configuración de Ficha</h3>
                            </div>
                            <button
                                onClick={() => setIsConfigOpen(false)}
                                className="p-1 rounded-lg text-base-content/50 hover:text-base-content hover:bg-base-200 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-base-content/70">
                            Selecciona la <strong>modalidad especializada</strong> para este paciente. Esto habilitará las herramientas y botones de historia clínica correspondientes.
                        </p>

                        <div className="space-y-3">
                            {/* Opción General */}
                            <button
                                onClick={() => handleSelectProfile('GENERAL')}
                                className={`w-full p-3.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                                    clinicalProfile === 'GENERAL'
                                        ? 'border-base-content bg-base-200 ring-2 ring-base-content/10'
                                        : 'border-base-300 hover:border-base-content/30 hover:bg-base-200/50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-base-200 rounded-lg text-base-content shrink-0 mt-0.5">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base-content text-sm">Clínica General / Adultos</h4>
                                        <p className="text-xs text-base-content/70 mt-0.5">Evaluación clínica convencional, anamnesis general y seguimiento estándar.</p>
                                    </div>
                                </div>
                                {clinicalProfile === 'GENERAL' && <Check size={18} className="text-base-content shrink-0 mt-1" />}
                            </button>

                            {/* Opción Pediatría - Solo para Premium/Clinica (no PRO) */}
                            {!isPRO && (
                            <button
                                onClick={() => handleSelectProfile('PEDIATRIC')}
                                className={`w-full p-3.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                                    clinicalProfile === 'PEDIATRIC'
                                        ? 'border-sky-600 bg-sky-50/60 ring-2 ring-sky-600/10'
                                        : 'border-base-300 hover:border-sky-300 hover:bg-sky-50/20'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-sky-100 rounded-lg text-sky-700 shrink-0 mt-0.5">
                                        <Baby size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base-content text-sm">Pediatría & Crecimiento</h4>
                                        <p className="text-xs text-base-content/70 mt-0.5">Curvas OMS/CDC, percentiles, maduración biológica PHV y registro de fórmulas infantiles.</p>
                                    </div>
                                </div>
                                {clinicalProfile === 'PEDIATRIC' && <Check size={18} className="text-sky-600 shrink-0 mt-1" />}
                            </button>
                            )}

                            {/* Opción Nutrición Deportiva - Solo para Premium/Clinica (no PRO) */}
                            {!isPRO && (
                            <button
                                onClick={() => handleSelectProfile('SPORTS')}
                                className={`w-full p-3.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                                    clinicalProfile === 'SPORTS'
                                        ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/10'
                                        : 'border-base-300 hover:border-purple-300 hover:bg-purple-50/20'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg text-purple-700 shrink-0 mt-0.5">
                                        <Trophy size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base-content text-sm">Nutrición Deportiva</h4>
                                        <p className="text-xs text-base-content/70 mt-0.5">Somatocarta Heath-Carter, tasa de sudoración, periodización y suplementación de alto rendimiento.</p>
                                    </div>
                                </div>
                                {clinicalProfile === 'SPORTS' && <Check size={18} className="text-purple-600 shrink-0 mt-1" />}
                            </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};