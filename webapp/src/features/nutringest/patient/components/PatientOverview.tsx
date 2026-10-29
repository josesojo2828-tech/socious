import React from 'react';
import {
    AlertCircle,
    Activity,
    CalendarClock,
    Utensils,
    FileText,
    CheckCircle2,
    Trophy,
    Baby,
    Zap,
    Flame,
    TrendingUp,
    Milk,
    ArrowRight,
    Award
} from 'lucide-react';
import { PatientDetail } from '@/types/nutringest/patient.interface';
import { ConsultationStatus } from '../../diet/types/consultation.type';
import { ClinicalProfileType } from './PatientHeader';
import { useRouter } from 'next/navigation';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { CreateConsultationModal } from '@/features/nutringest/components/CreateConsultationModal';
import { apiClient } from '@/shared/api/api.client';
import { ConsultationEndpoints } from '../../diet/services/consultation.endpoint';

interface Props {
    patient: PatientDetail;
    clinicalProfile?: ClinicalProfileType;
}

const getBmiTextColor = (bmi: number | null | undefined): string => {
    if (!bmi) return 'text-base-content';
    const val = Number(bmi);
    if (val < 18.5) return 'text-amber-600';
    if (val < 25.0) return 'text-emerald-600';
    if (val < 30.0) return 'text-amber-600';
    return 'text-rose-600';
};

export const PatientOverview = ({ patient, clinicalProfile = 'GENERAL' }: Props) => {
    const router = useRouter();
    const { openModal, closeModal } = useModalStore();

    const handleScheduleConsultation = () => {
        const patientFullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Paciente';
        openModal(
            <CreateConsultationModal
                isOpen={true}
                onClose={closeModal}
                defaultPatient={{ id: patient.id, fullName: patientFullName }}
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

    // Helpers para datos seguros
    const anamnesis = patient.anamnesis || {};
    const lastAnthro = patient.anthropometrics?.[0]; // Asumimos orden descendente
    const nextConsultation = patient.consultations?.find(c => c.status === ConsultationStatus.SCHEDULED);
    const activePlan = patient.plans?.find(p => p.status === 'ACTIVE');

    // Somatotipo helper
    const endo = lastAnthro?.endomorphy ? Number(lastAnthro.endomorphy).toFixed(1) : '-';
    const meso = lastAnthro?.mesomorphy ? Number(lastAnthro.mesomorphy).toFixed(1) : '-';
    const ecto = lastAnthro?.ectomorphy ? Number(lastAnthro.ectomorphy).toFixed(1) : '-';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* COLUMNA IZQUIERDA (2/3): INFORMACIÓN CLÍNICA Y WIDGETS ESPECIALIZADOS */}
            <div className="lg:col-span-2 space-y-6">

                {/* --- BANNER DINÁMICO SEGÚN PERFIL CLÍNICO --- */}

                {/* 1. MÓDULO DEPORTIVO (Si la modalidad activa es SPORTS) */}
                {clinicalProfile === 'SPORTS' && (
                    <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-purple-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-400/20 pb-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-500/20 border border-purple-400/30 rounded-xl text-purple-300 backdrop-blur-sm">
                                    <Trophy size={24} />
                                </div>
                                <div>
                                    <span className="text-xs uppercase font-extrabold tracking-wider text-purple-300">Perfil de Rendimiento Deportivo</span>
                                    <h3 className="text-xl font-black text-white">Evaluación y Somatotipo</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push(`/dashboard/patients/${patient.id}/historia-deportiva`)}
                                className="btn btn-sm bg-purple-600 hover:bg-purple-500 text-white border-none gap-2 shadow-md shrink-0"
                            >
                                Ver Ficha Deportiva <ArrowRight size={14} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Card Somatocarta */}
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                                <div className="flex items-center justify-between text-purple-200 text-xs font-bold uppercase mb-1">
                                    <span>Somatotipo (H-C)</span>
                                    <Zap size={14} className="text-amber-400" />
                                </div>
                                <div className="text-lg font-black text-white">
                                    {endo} - {meso} - {ecto}
                                </div>
                                <p className="text-[11px] text-purple-200 mt-1">Endo • Meso • Ecto</p>
                            </div>

                            {/* Card Tasa Sudoración */}
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                                <div className="flex items-center justify-between text-purple-200 text-xs font-bold uppercase mb-1">
                                    <span>Tasa de Sudoración</span>
                                    <Flame size={14} className="text-orange-400" />
                                </div>
                                <div className="text-lg font-black text-white">
                                    {anamnesis.sportsAnamnesis?.sweatRate ? `${anamnesis.sportsAnamnesis.sweatRate} L/h` : 'No calculada'}
                                </div>
                                <p className="text-[11px] text-purple-200 mt-1">Hidratación intra-entreno</p>
                            </div>

                            {/* Card Disciplina / Fase */}
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                                <div className="flex items-center justify-between text-purple-200 text-xs font-bold uppercase mb-1">
                                    <span>Periodización</span>
                                    <Award size={14} className="text-emerald-400" />
                                </div>
                                <div className="text-lg font-black text-white truncate">
                                    {anamnesis.sportsAnamnesis?.phase || 'General'}
                                </div>
                                <p className="text-[11px] text-purple-200 mt-1 truncate">
                                    {anamnesis.sportsAnamnesis?.sport || 'Atleta Nutringest'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. MÓDULO PEDIÁTRICO (Si la modalidad activa es PEDIATRIC) */}
                {clinicalProfile === 'PEDIATRIC' && (
                    <div className="bg-gradient-to-br from-sky-900 via-blue-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-sky-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-sky-400/10 rounded-full blur-2xl pointer-events-none"></div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-400/20 pb-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-sky-500/20 border border-sky-400/30 rounded-xl text-sky-300 backdrop-blur-sm">
                                    <Baby size={24} />
                                </div>
                                <div>
                                    <span className="text-xs uppercase font-extrabold tracking-wider text-sky-200">Perfil Pediátrico & Crecimiento</span>
                                    <h3 className="text-xl font-black text-white">Monitoreo Infantil OMS</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push(`/dashboard/patients/${patient.id}/historia-pediatrica`)}
                                className="btn btn-sm bg-sky-600 hover:bg-sky-500 text-white border-none gap-2 shadow-md shrink-0 font-bold"
                            >
                                Ver Ficha Pediátrica <ArrowRight size={14} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Card Edad / Meses */}
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                                <div className="flex items-center justify-between text-sky-200 text-xs font-bold uppercase mb-1">
                                    <span>Edad Evaluada</span>
                                    <TrendingUp size={14} className="text-sky-300" />
                                </div>
                                <div className="text-lg font-black text-white">
                                    {(patient as any).ageMonths ? `${(patient as any).ageMonths} meses` : `${patient.age || '-'} años`}
                                </div>
                                <p className="text-[11px] text-sky-200/80 mt-1">Categoría Infantil</p>
                            </div>

                            {/* Card Maduración Biológica */}
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                                <div className="flex items-center justify-between text-sky-200 text-xs font-bold uppercase mb-1">
                                    <span>PHV / Maduración</span>
                                    <Activity size={14} className="text-emerald-400" />
                                </div>
                                <div className="text-lg font-black text-white">
                                    {anamnesis.pediatricAnamnesis?.phvStatus || 'En Seguimiento'}
                                </div>
                                <p className="text-[11px] text-sky-200/80 mt-1">Velocidad Pico de Crecimiento</p>
                            </div>

                            {/* Card Alimentación Infantil */}
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                                <div className="flex items-center justify-between text-sky-200 text-xs font-bold uppercase mb-1">
                                    <span>Alimentación</span>
                                    <Milk size={14} className="text-blue-300" />
                                </div>
                                <div className="text-lg font-black text-white truncate">
                                    {anamnesis.pediatricAnamnesis?.feedingType || 'Lactancia / Dieta'}
                                </div>
                                <p className="text-[11px] text-sky-200/80 mt-1 truncate">Fórmulas o complementaria</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. ALERTA CLÍNICA (Si hay alergias o condiciones) */}
                {((anamnesis.allergies?.length ?? 0) > 0 || (anamnesis.intolerances?.length ?? 0) > 0) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                        <div className="p-2 bg-white rounded-full text-red-600 shadow-sm shrink-0">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-800 text-sm uppercase tracking-wide">Alertas Alimentarias</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {anamnesis.allergies?.map((a: string) => (
                                    <span key={a} className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md border border-red-200">
                                        Alergia: {a}
                                    </span>
                                ))}
                                {anamnesis.intolerances?.map((i: string) => (
                                    <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-md border border-orange-200">
                                        Intolerancia: {i}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. RESUMEN ANTROPOMÉTRICO (Ajustado según la modalidad) */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-4 sm:p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-base-content flex items-center gap-2">
                            <Activity className="text-emerald-600" size={20} />
                            Última Medición Registrada
                        </h3>
                        {lastAnthro && (
                            <span className="text-xs text-base-content/70 bg-base-200 px-2.5 py-1 rounded-full border border-base-300 font-medium">
                                {new Date(lastAnthro.date).toLocaleDateString()}
                            </span>
                        )}
                    </div>

                    {lastAnthro ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-base-200 rounded-xl border border-base-300">
                                <span className="block text-xs text-base-content/70 uppercase font-bold mb-1">Peso</span>
                                <span className="text-2xl font-black text-base-content">{lastAnthro.weight ? Number(lastAnthro.weight).toFixed(1) : '-'} <span className="text-xs font-medium text-base-content/50">kg</span></span>
                            </div>
                            <div className="text-center p-4 bg-base-200 rounded-xl border border-base-300">
                                <span className="block text-xs text-base-content/70 uppercase font-bold mb-1">Talla</span>
                                <span className="text-2xl font-black text-base-content">{lastAnthro.height ? Number(lastAnthro.height).toFixed(1) : '-'} <span className="text-xs font-medium text-base-content/50">cm</span></span>
                            </div>
                            <div className="text-center p-4 bg-base-200 rounded-xl border border-base-300">
                                <span className="block text-xs text-base-content/70 uppercase font-bold mb-1">IMC</span>
                                <span className={`text-2xl font-black ${getBmiTextColor(lastAnthro.bmi)}`}>{lastAnthro.bmi ? Number(lastAnthro.bmi).toFixed(2) : '-'}</span>
                            </div>
                            <div className="text-center p-4 bg-base-200 rounded-xl border border-base-300">
                                <span className="block text-xs text-base-content/70 uppercase font-bold mb-1">% Grasa</span>
                                <span className="text-2xl font-black text-base-content">{lastAnthro.fatPercentage ? Number(lastAnthro.fatPercentage).toFixed(1) : '-'} <span className="text-xs font-medium text-base-content/50">%</span></span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-base-content/50 bg-base-200/50 rounded-lg border border-dashed border-base-300 text-sm">
                            No hay mediciones antropométricas registradas aún.
                        </div>
                    )}
                </div>

                {/* 5. ANTECEDENTES Y ESTILO DE VIDA */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-4 sm:p-6 shadow-sm">
                    <h3 className="font-bold text-base-content flex items-center gap-2 mb-4">
                        <FileText className="text-purple-600" size={20} />
                        Antecedentes y Estilo de Vida
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div>
                            <h4 className="font-bold text-base-content mb-2">Actividad Física</h4>
                            <p className="text-base-content/80 bg-base-200 p-3 rounded-lg border border-base-300 min-h-[60px]">
                                {anamnesis.physicalActivity || "No registrada."}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-base-content mb-2">Hábitos</h4>
                            <ul className="space-y-2">
                                <li className="flex justify-between border-b border-base-300 pb-1">
                                    <span className="text-base-content/70">Fuma</span>
                                    <span className="font-medium text-base-content">{anamnesis.smoking ? 'Sí' : 'No'}</span>
                                </li>
                                <li className="flex justify-between border-b border-base-300 pb-1">
                                    <span className="text-base-content/70">Alcohol</span>
                                    <span className="font-medium text-base-content">{anamnesis.alcohol || 'No reportado'}</span>
                                </li>
                                <li className="flex justify-between border-b border-base-300 pb-1">
                                    <span className="text-base-content/70">Horas Sueño</span>
                                    <span className="font-medium text-base-content">{anamnesis.sleepHours || '-'} h</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA (1/3): ACCIONES Y PRÓXIMOS EVENTOS */}
            <div className="space-y-6">

                {/* 1. PRÓXIMA CITA */}
                <div className="bg-gradient-to-br from-[#5b21b6] to-[#10b981] rounded-xl p-4 sm:p-6 text-white shadow-lg shadow-primary/20">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <CalendarClock size={24} className="text-white" />
                        </div>
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded border border-white/10">
                            PRÓXIMA CITA
                        </span>
                    </div>

                    {nextConsultation ? (
                        <div>
                            <h3 className="text-2xl font-bold mb-1">
                                {new Date(nextConsultation.scheduledAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <p className="text-white/90 text-sm font-medium mb-4">
                                a las {new Date(nextConsultation.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="bg-white/10 p-3 rounded-lg text-sm text-white/90">
                                {nextConsultation.reason || "Control regular"}
                            </div>
                            <button
                                onClick={handleScheduleConsultation}
                                className="w-full mt-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-colors shadow-xs border border-white/20"
                            >
                                Agendar Nueva Cita
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-white/90 font-medium mb-3">No hay citas agendadas</p>
                            <button
                                onClick={handleScheduleConsultation}
                                className="w-full py-2 bg-white text-[#5b21b6] rounded-lg text-sm font-bold hover:bg-white/90 transition-colors shadow-sm cursor-pointer"
                            >
                                Agendar Ahora
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. PLAN ACTIVO */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-base-content flex items-center gap-2">
                                <Utensils className="text-green-600" size={20} />
                                Plan Nutricional
                            </h3>
                            {activePlan && (
                                <span className="bg-orange-500/10 text-orange-600 border border-orange-500/20 px-3 py-1 rounded-full text-xs font-black shadow-sm shrink-0">
                                    {activePlan.kcalTarget} Kcal
                                </span>
                            )}
                        </div>

                        {activePlan ? (
                            <div>
                                <h4 className="font-bold text-lg text-base-content mb-1">{activePlan.name}</h4>
                                <div className="flex gap-2 mb-4">
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-600 text-xs font-bold rounded">ACTIVO</span>
                                    <span className="text-xs text-base-content/70 flex items-center">
                                        Desde: {new Date(activePlan.startDate).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 flex flex-col justify-center items-center">
                                        <span className="block font-black text-red-600 text-sm">{activePlan.proteinTarget}g</span>
                                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Prot</span>
                                    </div>
                                    <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 flex flex-col justify-center items-center">
                                        <span className="block font-black text-amber-600 text-sm">{activePlan.fatsTarget}g</span>
                                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Lip</span>
                                    </div>
                                    <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex flex-col justify-center items-center">
                                        <span className="block font-black text-emerald-600 text-sm">{activePlan.carbsTarget}g</span>
                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Carbs</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-base-content/50 text-sm">
                                No tiene un plan activo asignado.
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. METAS */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-4 sm:p-6 shadow-sm">
                    <h3 className="font-bold text-base-content flex items-center gap-2 mb-4">
                        <CheckCircle2 className="text-orange-500" size={20} />
                        Progreso de Metas
                    </h3>
                    <div className="space-y-3">
                        {patient.goals?.slice(0, 3).map((goal: any) => {
                            const capitalizedTitle = goal.title
                                ? goal.title.charAt(0).toUpperCase() + goal.title.slice(1)
                                : '';
                            return (
                                <div key={goal.id} className="flex items-center gap-3 text-sm">
                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ${
                                        goal.isAchieved 
                                            ? 'bg-emerald-500 ring-emerald-100 border border-emerald-600' 
                                            : 'bg-orange-500 ring-orange-100 border border-orange-600'
                                    }`}></div>
                                    <span className={`flex-1 ${goal.isAchieved ? 'line-through text-base-content/40' : 'text-base-content font-medium'}`}>
                                        {capitalizedTitle}
                                    </span>
                                </div>
                            );
                        })}
                        {(!patient.goals || patient.goals.length === 0) && (
                            <p className="text-base-content/50 text-sm text-center italic">Sin metas definidas</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};