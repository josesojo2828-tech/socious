"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    Users,
    UserPlus,
    LogOut,
    ArrowUpCircle,
    ArrowDownCircle,
    UserX,
    RefreshCw,
    Loader2,
    Mail,
    Calendar,
    ShieldCheck,
    Crown,
} from "lucide-react";
import { PatientReferralService } from "@/features/nutringest/patient-referral/services/patient-referral.service";
import {
    PatientNutritionistRole,
    PatientTeamMember,
} from "@/types/nutringest/patient-referral.interface";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";

interface Props {
    patientId: string;
    // Contador externo: al incrementar, re-ejecuta fetchTeam (coordinación con el tab Equipo).
    refreshToken?: number;
    // Notifica al padre los miembros activos (para excluirlos en el modal de agregar colaborador).
    onMembersChange?: (members: PatientTeamMember[]) => void;
    // Se dispara tras crear un referido exitoso (para refrescar el historial).
    onReferralCreated?: () => void;
    // Vista de solo lectura: oculta todas las acciones de gestión (referir, roles, remover, salir).
    readOnly?: boolean;
}

const ROLE_BADGE: Record<PatientNutritionistRole, string> = {
    PRIMARY: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    SUPPORT: "bg-purple-50 text-purple-700 border border-purple-200",
};

const getMemberName = (member: PatientTeamMember): string => {
    const user = member.nutritionist?.user;
    if (user) {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        if (fullName) return fullName;
        return user.username || user.email;
    }
    return member.nutritionist?.licenseCode || member.nutritionistId;
};

const getMemberEmail = (member: PatientTeamMember): string | undefined =>
    member.nutritionist?.user?.email || undefined;

export const PatientCareTeamSection = ({ patientId, refreshToken, onMembersChange, onReferralCreated, readOnly }: Props) => {
    const currentUser = useAuthStore((state) => state.user);
    const { addToast } = useToastStore();
    const { openModal, closeModal } = useModalStore();

    const [members, setMembers] = useState<PatientTeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState<{ id: string; op: string } | null>(null);

    const isReadOnly = readOnly === true;

    const myNutritionistId = currentUser?.nutritionistProfile?.id ?? null;
    const myMembership = members.find((m) => m.nutritionistId === myNutritionistId) ?? null;
    const isPrimaryViewer = myMembership?.role === "PRIMARY";
    const primaryCount = members.filter((m) => m.role === "PRIMARY").length;

    const fetchTeam = useCallback(async () => {
        if (!patientId) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await PatientReferralService.getTeam(patientId);
            const data = response.data ?? [];
            setMembers(data);
            onMembersChange?.(data);
        } catch (err: any) {
            console.error("Error cargando equipo de cuidado:", err);
            setError(err.response?.data?.message || "No se pudo cargar el equipo de cuidado.");
        } finally {
            setIsLoading(false);
        }
    }, [patientId, onMembersChange]);

    useEffect(() => {
        fetchTeam();
    }, [fetchTeam, refreshToken]);

    const runAction = useCallback(
        async (
            op: string,
            id: string,
            fn: () => Promise<any>,
            fallbackMessage: string,
        ) => {
            setPending({ id, op });
            try {
                const response = await fn();
                addToast({
                    type: "success",
                    title: "Equipo de cuidado",
                    message: response?.data?.message || fallbackMessage,
                });
                await fetchTeam();
            } catch (err: any) {
                console.error("Error en acción del equipo de cuidado:", err);
                addToast({
                    type: "error",
                    title: "Error",
                    message: err.response?.data?.message || fallbackMessage,
                });
            } finally {
                setPending(null);
            }
        },
        [addToast, fetchTeam],
    );

    const handleChangeRole = (member: PatientTeamMember, role: PatientNutritionistRole) => {
        runAction(
            "role",
            member.nutritionistId,
            () =>
                PatientReferralService.changeRole(patientId, member.nutritionistId, { role }),
            role === "PRIMARY"
                ? "Miembro promovido a PRIMARY."
                : "Miembro degradado a SUPPORT.",
        );
    };

    const handleRemoveMember = (member: PatientTeamMember) => {
        if (!confirm(`¿Estás seguro de que querés remover a ${getMemberName(member)} del equipo de cuidado?`)) {
            return;
        }
        runAction(
            "remove",
            member.nutritionistId,
            () => PatientReferralService.removeMember(patientId, member.nutritionistId),
            "Miembro removido del equipo.",
        );
    };

    const handleLeaveTeam = () => {
        if (!myNutritionistId) return;
        if (!confirm("¿Estás seguro de que querés salir del equipo de cuidado de este paciente?")) {
            return;
        }
        runAction(
            "leave",
            myNutritionistId,
            () => PatientReferralService.leaveTeam(patientId),
            "Saliste del equipo de cuidado.",
        );
    };

    const isBusy = (id: string, op?: string) =>
        !!pending && pending.id === id && (!op || pending.op === op);

    return (
        <div className="bg-base-100 border border-base-300 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                    <h3 className="font-bold text-base-content flex items-center gap-2">
                        <Users className="text-emerald-600" size={20} />
                        Equipo de cuidado
                    </h3>
                    <p className="text-xs text-base-content/60 mt-0.5">
                        Nutricionistas con acceso al expediente de este paciente.
                    </p>
                </div>
            </div>

            {isLoading && members.length === 0 && (
                <div className="py-10 text-center flex flex-col items-center gap-2 text-base-content/50">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm">Cargando equipo de cuidado...</span>
                </div>
            )}

            {!isLoading && error && (
                <div className="py-8 text-center flex flex-col items-center gap-3">
                    <span className="text-red-500 text-sm">{error}</span>
                    <button
                        onClick={fetchTeam}
                        className="btn btn-sm btn-outline border-base-300 text-base-content/70 hover:bg-base-200 gap-2"
                    >
                        <RefreshCw size={14} /> Reintentar
                    </button>
                </div>
            )}

            {!isLoading && !error && members.length === 0 && (
                <div className="py-10 text-center bg-base-200/50 rounded-lg border border-dashed border-base-300">
                    <Users className="mx-auto text-base-content/40 mb-2" size={32} />
                    <p className="text-base-content/60 text-sm">Aún no hay miembros en el equipo de cuidado.</p>
                </div>
            )}

            {!isLoading && !error && members.length > 0 && (
                <ul className="space-y-3">
                    {members.map((member) => {
                        const isSelf = member.nutritionistId === myNutritionistId;
                        const isLastPrimary = member.role === "PRIMARY" && primaryCount <= 1;
                        const canLeave = isSelf && (member.role === "SUPPORT" || primaryCount > 1);
                        const rowBusy =
                            isBusy(member.nutritionistId, "role") ||
                            isBusy(member.nutritionistId, "remove");

                        return (
                            <li
                                key={member.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-xl ${
                                    isSelf
                                        ? "border-emerald-200 bg-emerald-50/30"
                                        : "border-base-300 bg-base-100"
                                }`}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 ${
                                            member.role === "PRIMARY" ? "bg-emerald-600" : "bg-purple-600"
                                        }`}
                                    >
                                        {member.role === "PRIMARY" ? (
                                            <Crown size={18} />
                                        ) : (
                                            <ShieldCheck size={18} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-bold text-base-content text-sm truncate">
                                                {getMemberName(member)}
                                            </h4>
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${ROLE_BADGE[member.role]}`}
                                            >
                                                {member.role}
                                            </span>
                                            {isSelf && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-base-200 text-base-content/70 border border-base-300">
                                                    TÚ
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/60 mt-1">
                                            {getMemberEmail(member) && (
                                                <span className="flex items-center gap-1 min-w-0">
                                                    <Mail size={12} className="text-base-content/50 shrink-0" />
                                                    <span className="truncate">{getMemberEmail(member)}</span>
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} className="text-base-content/50" />
                                                Desde: {new Date(member.assignedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {isPrimaryViewer && !isSelf && member.role === "SUPPORT" && !isReadOnly && (
                                        <button
                                            onClick={() => handleChangeRole(member, "PRIMARY")}
                                            disabled={rowBusy}
                                            title="Promover a PRIMARY"
                                            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            {isBusy(member.nutritionistId, "role") ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <ArrowUpCircle size={16} />
                                            )}
                                        </button>
                                    )}

                                    {isPrimaryViewer && !isSelf && member.role === "PRIMARY" && !isLastPrimary && !isReadOnly && (
                                        <button
                                            onClick={() => handleChangeRole(member, "SUPPORT")}
                                            disabled={rowBusy}
                                            title="Degradar a SUPPORT"
                                            className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            {isBusy(member.nutritionistId, "role") ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <ArrowDownCircle size={16} />
                                            )}
                                        </button>
                                    )}

                                    {isPrimaryViewer && !isSelf && !isLastPrimary && !isReadOnly && (
                                        <button
                                            onClick={() => handleRemoveMember(member)}
                                            disabled={rowBusy}
                                            title="Remover del equipo"
                                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            {isBusy(member.nutritionistId, "remove") ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <UserX size={16} />
                                            )}
                                        </button>
                                    )}

                                    {canLeave && !isReadOnly && (
                                        <button
                                            onClick={handleLeaveTeam}
                                            disabled={isBusy(myNutritionistId!, "leave")}
                                            title="Salir del equipo"
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-base-content/70 hover:bg-base-200 border border-base-300 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            {isBusy(myNutritionistId!, "leave") ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <LogOut size={14} />
                                            )}
                                            Salir
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};