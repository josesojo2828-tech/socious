import React, { useEffect } from 'react';
import {
    Plus,
    CheckCircle2,
    Circle,
    Trash2,
    Target,
    Trophy,
    TrendingUp,
    Calendar,
    Award,
    Flame
} from 'lucide-react';
import { useClinicalGoals } from '../hooks/useClinicalGoals';
import { GoalType } from '@/types/nutringest/goal.interface';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { DynamicRenderForm } from '@/shared/components/organisms/DynamicForm/DynamicRenderForm';
import { GoalEndpoints } from '../services/goal.endpoint';

interface Props {
    patientId: string;
    onUpdate?: () => void;
}

// Subcomponente: Tarjeta de Resumen (KPI)
const StatCard = ({ label, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className={`absolute right-0 top-0 p-8 opacity-5 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform ${color.text}`}>
            <Icon size={100} />
        </div>
        <div>
            <p className="text-base-content/70 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-3xl font-black text-base-content">{value}</h3>
            {subtext && <p className="text-xs text-base-content/50 mt-1 font-medium">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color.bg} ${color.text} shadow-sm z-10`}>
            <Icon size={24} />
        </div>
    </div>
);

// Subcomponente: Tarjeta de Meta Individual
const GoalCard = ({ goal, onToggle, onDelete }: any) => {
    // Calcular porcentaje de progreso visual
    const progress = goal.targetValue && goal.startValue
        ? Math.min(Math.max(((goal.currentValue - goal.startValue) / (goal.targetValue - goal.startValue)) * 100, 0), 100)
        : 0;

    const isWeight = goal.type === GoalType.WEIGHT;
    const isHabit = goal.type === GoalType.HABIT;

    const getUnit = (type: string) => {
        switch (type) {
            case GoalType.WEIGHT:
                return ' kg';
            case GoalType.MEASUREMENT:
                return ' cm';
            default:
                return '';
        }
    };

    const getDefaultDescription = (type: string) => {
        switch (type) {
            case GoalType.WEIGHT:
                return 'Seguimiento del peso corporal del paciente.';
            case GoalType.MEASUREMENT:
                return 'Seguimiento de las medidas corporales y talla del paciente.';
            case GoalType.HABIT:
                return 'Seguimiento de hábitos diarios y alimentación.';
            default:
                return 'Seguimiento de objetivos generales.';
        }
    };

    return (
        <div className={`relative bg-base-100 rounded-2xl border transition-all duration-300 group overflow-hidden ${goal.isAchieved
            ? 'border-green-200 shadow-sm bg-green-50/30'
            : 'border-base-300 shadow-sm hover:shadow-md hover:border-blue-300'
            }`}>
            {/* Barra lateral de estado */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${goal.isAchieved ? 'bg-green-500' : 'bg-emerald-500'}`}></div>

            <div className="p-5 pl-7">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg mt-1 ${goal.isAchieved ? 'bg-green-100 text-green-700' : 'bg-emerald-50 text-emerald-600'}`}>
                            {goal.isAchieved ? <Trophy size={20} /> : <Target size={20} />}
                        </div>
                        <div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 inline-block ${isWeight ? 'bg-orange-100 text-orange-700' :
                                isHabit ? 'bg-purple-100 text-purple-700' : 'bg-base-200 text-base-content/70'
                                }`}>
                                {goal.type}
                            </span>
                            <h3 className={`text-lg font-bold ${goal.isAchieved ? 'text-green-900' : 'text-base-content'}`}>
                                {goal.title}
                            </h3>
                            {goal.deadline && (
                                <div className="flex items-center gap-1 text-xs text-base-content/50 mt-1">
                                    <Calendar size={12} />
                                    <span>Meta: {new Date(goal.deadline).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onToggle(goal.id, { isAchieved: !goal.isAchieved })}
                            className={`btn btn-circle btn-sm border-0 ${goal.isAchieved
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-base-200 hover:bg-emerald-500 hover:text-white text-base-content/50'
                                }`}
                            title={goal.isAchieved ? "Marcar como pendiente" : "Marcar como logrado"}
                        >
                            <CheckCircle2 size={18} />
                        </button>
                        <button
                            onClick={() => onDelete(goal.id)}
                            className="btn btn-circle btn-sm btn-ghost text-base-content/40 hover:text-red-500 hover:bg-red-500/10"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {goal.description ? (
                    <p className="text-sm text-base-content/70 mt-3 pl-1 leading-relaxed whitespace-pre-wrap">
                        {goal.description}
                    </p>
                ) : (
                    <p className="text-sm text-base-content/50 mt-3 pl-1 italic leading-relaxed">
                        {getDefaultDescription(goal.type)}
                    </p>
                )}

                {/* Sección de Progreso (Solo si tiene valores numéricos) */}
                {(goal.targetValue !== null && goal.startValue !== null) && (
                    <div className="mt-4 bg-base-200 rounded-xl p-4 border border-base-300">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <span className="text-xs text-base-content/70 font-medium">Progreso Actual</span>
                                <div className="text-2xl font-black text-base-content flex items-baseline gap-1">
                                    {goal.currentValue}
                                    <span className="text-sm font-medium text-base-content/50">{getUnit(goal.type)} / {goal.targetValue}{getUnit(goal.type)}</span>
                                </div>
                            </div>
                            <span className="text-xl font-bold text-emerald-600">{Math.round(progress)}%</span>
                        </div>
                        {/* Barra de progreso animada */}
                        <div className="w-full h-2.5 bg-base-300 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${goal.isAchieved ? 'bg-green-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                    }`}
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-base-content/50 font-medium uppercase tracking-wide">
                            <span>Inicio: {goal.startValue}{getUnit(goal.type)}</span>
                            <span>Objetivo: {goal.targetValue}{getUnit(goal.type)}</span>
                        </div>
                    </div>
                )}

                {/* Motivación para Hábitos (Sin valores numéricos y sin descripción) */}
                {(goal.targetValue === null || goal.startValue === null) && !goal.description && (
                    <div className="mt-2 text-sm text-base-content/70 italic pl-3 border-l-2 border-blue-100">
                        {goal.type === GoalType.WEIGHT
                            ? "El control del peso es clave para el éxito clínico."
                            : goal.type === GoalType.MEASUREMENT
                            ? "Las medidas corporales nos muestran cambios más allá de la balanza."
                            : "La constancia es la clave del éxito. ¡Sigue así!"}
                    </div>
                )}
            </div>
        </div>
    );
};

export const GoalsTab = ({ patientId, onUpdate }: Props) => {
    // Usamos el hook que ya trae 'metrics' desde el backend
    const { goals, metrics, isLoading, fetchGoals, updateGoal, deleteGoal } = useClinicalGoals(patientId);
    const { openModal, closeModal } = useModalStore();

    const handleToggle = async (id: string, updates: any) => {
        await updateGoal(id, updates);
        if (onUpdate) onUpdate();
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Eliminar este objetivo?")) {
            await deleteGoal(id);
            if (onUpdate) onUpdate();
        }
    };

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    // Usamos las métricas del backend o valores por defecto seguros
    const successRate = metrics?.successRate || 0;
    const activeGoals = metrics?.activeGoals || 0;
    const achievedGoals = metrics?.achievedGoals || 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header de Acción */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
                        Objetivos Terapéuticos
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-blue-200">
                            {activeGoals} Activos
                        </span>
                    </h2>
                    <p className="text-sm text-base-content/70 mt-1">Define y monitorea las metas para motivar a tu paciente.</p>
                </div>
                {/* Aquí iría la lógica para abrir tu modal de creación */}
                <button onClick={() => openModal(<DynamicRenderForm cb={() => { closeModal(); fetchGoals(); if (onUpdate) onUpdate(); }} path={GoalEndpoints.forms.create(patientId)} />)} className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-blue-600 text-white gap-2 shadow-lg shadow-blue-200 px-6 rounded-xl w-full sm:w-auto">
                    <Plus size={18} /> Nueva Meta
                </button>
            </div>

            {/* 1. SECCIÓN DE ESTADÍSTICAS (KPIs Gamificados) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Tasa de Éxito"
                    value={`${successRate}%`}
                    subtext="Metas completadas"
                    icon={Trophy}
                    color={{ bg: 'bg-yellow-100', text: 'text-yellow-600' }}
                />
                <StatCard
                    label="Metas Activas"
                    value={activeGoals}
                    subtext="En progreso"
                    icon={Flame}
                    color={{ bg: 'bg-orange-100', text: 'text-orange-600' }}
                />
                <StatCard
                    label="Logros Totales"
                    value={achievedGoals}
                    subtext="Hitos alcanzados"
                    icon={Award}
                    color={{ bg: 'bg-green-100', text: 'text-green-600' }}
                />
            </div>

            {/* 2. LISTA DE METAS (GRID) */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider mb-4 flex items-center gap-2 pl-1">
                    <TrendingUp size={16} /> Tu Plan de Acción
                </h3>

                {isLoading && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {[1, 2].map(i => <div key={i} className="h-48 bg-base-200 rounded-2xl animate-pulse"></div>)}
                    </div>
                )}

                {!isLoading && goals.length === 0 && (
                    <div className="text-center py-16 bg-base-100 rounded-2xl border border-dashed border-base-300">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Target size={32} />
                        </div>
                        <h4 className="text-base-content font-bold mb-1">Sin metas definidas</h4>
                        <p className="text-base-content/70 text-sm mb-4">Comienza estableciendo un objetivo pequeño.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ordenar: Primero las pendientes, luego las logradas */}
                    {[...goals].sort((a, b) => (a.isAchieved === b.isAchieved ? 0 : a.isAchieved ? 1 : -1))
                        .map((goal) => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                onToggle={handleToggle}
                                onDelete={handleDelete}
                            />
                        ))}
                </div>
            </div>
        </div>
    );
};