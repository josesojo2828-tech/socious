import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, User, FileText, Search, Loader2, ChevronDown } from 'lucide-react';
import { apiClient } from '@/shared/api/api.client';
import { PatientEndpoints } from '@/features/nutringest/patient/services/patient.endpoint';
import { useTranslation } from "@/context/i18n.context";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<boolean>;
    defaultPatient?: { id: string; fullName: string };
}

export const CreateConsultationModal = ({ isOpen, onClose, onSubmit, defaultPatient }: Props) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Data Sources
    const [availablePatients, setAvailablePatients] = useState<any[]>([]);

    // Form State
    const [patientId, setPatientId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [type, setType] = useState('FIRST_TIME');
    const [reason, setReason] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Pre-populate patient if defaultPatient is provided
    useEffect(() => {
        if (isOpen) {
            if (defaultPatient) {
                setPatientId(defaultPatient.id);
                setSearchTerm(defaultPatient.fullName);
            } else {
                setPatientId('');
                setSearchTerm('');
            }
        }
    }, [isOpen, defaultPatient]);

    // Cargar pacientes
    useEffect(() => {
        if (!isOpen) return;

        const fetchPatients = async () => {
            setIsSearching(true);
            try {
                const response = await apiClient.get(PatientEndpoints.actions.list());
                const listData = response.data.list || response.data || [];
                const normalized = listData.map((p: any) => ({
                    ...p,
                    fullName: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Paciente sin nombre'
                }));
                setAvailablePatients(normalized);
            } catch (error) {
                console.error("Error cargando pacientes:", error);
            } finally {
                setIsSearching(false);
            }
        };

        fetchPatients();
    }, [isOpen]);

    // Filtrado de pacientes
    const filteredPatients = availablePatients.filter(p => {
        const selectedPatient = availablePatients.find(ap => ap.id === patientId);
        if (selectedPatient && searchTerm === selectedPatient.fullName) {
            return true;
        }
        return p.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId || !date || !time) return;

        setIsLoading(true);
        const success = await onSubmit({
            patientId,
            date,
            time,
            type,
            reason
        });
        setIsLoading(false);

        if (success) {
            onClose();
            // Reset
            setPatientId('');
            setReason('');
            setSearchTerm('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-full flex flex-col">
            {/* Header */}
            <div className="pb-4 mb-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                        <Calendar size={18} />
                    </div>
                    {t('dashboard.modals.create_consultation.title')}
                </h3>
                <button type="button" onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto max-h-[60vh]">

                    {/* Buscador de Paciente */}
                    <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-gray-500 uppercase">{t('dashboard.modals.create_consultation.patient_label')}</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                             <input
                                ref={inputRef}
                                type="text"
                                placeholder={t('dashboard.modals.create_consultation.patient_placeholder')}
                                className="w-full pl-9 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 font-medium"
                                value={searchTerm}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPatientId(''); // Clear selected patient ID if they change the input text manually
                                    setIsFocused(true);
                                }}
                            />
                            {searchTerm ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setPatientId('');
                                        setIsFocused(true);
                                        inputRef.current?.focus();
                                    }}
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    <X size={16} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (isFocused) {
                                            inputRef.current?.blur();
                                        } else {
                                            inputRef.current?.focus();
                                        }
                                    }}
                                >
                                    <ChevronDown size={16} className={`transition-transform duration-200 ${isFocused ? 'rotate-180' : ''}`} />
                                </button>
                            )}
                        </div>

                        {/* Lista de Selección */}
                        {isFocused && (
                            <div className="absolute z-50 w-full left-0 border border-gray-200 rounded-xl max-h-40 overflow-y-auto bg-white mt-1 shadow-lg">
                                {isSearching ? (
                                    <div className="p-4 text-center text-xs text-gray-400">{t('dashboard.modals.assign_menu.loading')}</div>
                                ) : filteredPatients.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-gray-400">{t('dashboard.modals.assign_menu.no_results')}</div>
                                ) : (
                                    filteredPatients.map(patient => (
                                        <div
                                            key={patient.id}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setPatientId(patient.id);
                                                setSearchTerm(patient.fullName);
                                                setIsFocused(false);
                                            }}
                                            className={`px-4 py-2 text-sm cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center transition-colors ${patientId === patient.id ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            <span className="font-medium">{patient.fullName}</span>
                                            <span className="text-xs text-gray-400">{patient.email}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">{t('dashboard.modals.create_consultation.date_label')}</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input
                                    type="date"
                                    required
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase">{t('dashboard.modals.create_consultation.time_label')}</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input
                                    type="time"
                                    required
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">{t('dashboard.modals.create_consultation.type_label')}</label>
                        <select
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value="FIRST_TIME">{t('dashboard.modals.create_consultation.types.first_time')}</option>
                            <option value="FOLLOW_UP">{t('dashboard.modals.create_consultation.types.follow_up')}</option>
                            <option value="EMERGENCY">{t('dashboard.modals.create_consultation.types.emergency')}</option>
                        </select>
                    </div>

                    {/* Motivo */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">{t('dashboard.modals.create_consultation.reason_label')}</label>
                        <textarea
                            rows={2}
                            placeholder={t('dashboard.modals.create_consultation.reason_placeholder')}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                            {t('dashboard.modals.create_consultation.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!patientId || isLoading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading && <Loader2 size={14} className="animate-spin" />}
                            {t('dashboard.modals.create_consultation.schedule')}
                        </button>
                    </div>
            </form>
        </div>
    );
};