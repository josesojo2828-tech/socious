import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { apiClient } from "@/shared/api/api.client";
import { CheckCircle, AlertTriangle, Info, X, Check, Loader2 } from "lucide-react";
import { Text } from "@/shared/components/atoms/Text";

import { useNotifications } from '@/features/user/hooks/useNotifications';

interface NotificationItemModalProps {
    notification: any;
    markAsRead: (id: string) => void;
}

export function NotificationItemModal({ notification, markAsRead }: NotificationItemModalProps) {
    const { closeModal } = useModalStore();
    const { addToast } = useToastStore();
    const { fetchNotifications } = useNotifications();
    const { fetchWorkspaces } = useWorkspaceStore();
    const { user } = useAuthStore();
    const router = useRouter();
    const [isResponding, setIsResponding] = useState(false);

    useEffect(() => {
        if (notification && !notification.read) {
            markAsRead(notification.id);
        }
    }, [notification, markAsRead]);

    const normType = notification?.entityType?.toLowerCase().replace(/[-_]/g, '');
    const isInstitutionalCalculation = normType === 'institutionalcalculation';
    const isOrgInvitation = normType === 'organizationinvitation';

    const handleInstitutionalAction = async (accept: boolean) => {
        if (!notification?.entityId || isResponding) return;
        setIsResponding(true);
        try {
            await apiClient.patch(`/api/institutional-calculations/${notification.entityId}/collaborators/respond`, {
                accept,
            });
            markAsRead(notification.id);
            fetchNotifications();
            addToast({
                type: 'success',
                title: accept ? 'Invitación Aceptada' : 'Invitación Rechazada',
                message: accept ? 'Ahora tienes acceso al cálculo institucional.' : 'Has rechazado la invitación.',
            });
            closeModal();
            if (accept) {
                router.push(`/dashboard/institutional/${notification.entityId}`);
            }
        } catch (err: any) {
            console.error(err);
            addToast({
                type: 'error',
                title: 'Error',
                message: err?.response?.data?.message || 'No se pudo procesar la respuesta.',
            });
        } finally {
            setIsResponding(false);
        }
    };

    const handleOrgInvitationAction = async (accept: boolean) => {
        if (!notification?.entityId || isResponding) return;
        setIsResponding(true);
        try {
            const endpoint = accept
                ? `/api/organizations/${notification.entityId}/accept-invite-by-org`
                : `/api/organizations/${notification.entityId}/reject-invite-by-org`;
            await apiClient.post(endpoint);
            markAsRead(notification.id);
            fetchNotifications();
            if (accept) {
                fetchWorkspaces(user);
            }
            addToast({
                type: 'success',
                title: accept ? 'Invitación Aceptada' : 'Invitación Rechazada',
                message: accept
                    ? 'Ahora eres miembro de esta clínica. Redirigiendo...'
                    : 'Has rechazado la invitación a la clínica.',
            });
            closeModal();
            if (accept) {
                router.push('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            addToast({
                type: 'error',
                title: 'Error',
                message: err?.response?.data?.message || 'No se pudo procesar la respuesta.',
            });
        } finally {
            setIsResponding(false);
        }
    };

    const getIconDetails = (type: string) => {
        const norm = type?.toLowerCase();
        switch (norm) {
            case 'success':
                return {
                    icon: <CheckCircle className="w-12 h-12 text-emerald-500" />,
                    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40',
                    label: 'Éxito',
                    textColor: 'text-emerald-800 dark:text-emerald-300'
                };
            case 'warning':
                return {
                    icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
                    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40',
                    label: 'Advertencia',
                    textColor: 'text-amber-800 dark:text-amber-300'
                };
            case 'error':
                return {
                    icon: <AlertTriangle className="w-12 h-12 text-rose-500" />,
                    bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/40',
                    label: 'Error',
                    textColor: 'text-rose-800 dark:text-rose-300'
                };
            default:
                return {
                    icon: <Info className="w-12 h-12 text-emerald-500" />,
                    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-blue-100 dark:border-emerald-900/40',
                    label: 'Información',
                    textColor: 'text-emerald-800 dark:text-emerald-300'
                };
        }
    };

    const details = getIconDetails(notification.type);

    return (
        <div className="flex flex-col gap-6 p-1 font-sans">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-base-300">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${details.bg}`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${details.textColor}`}>
                        {details.label}
                    </span>
                </div>
                <button
                    onClick={closeModal}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-base-200 transition-colors text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Content Body */}
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center py-2">
                <div className={`p-4 rounded-2xl shrink-0 ${details.bg} border`}>
                    {details.icon}
                </div>
                <div className="flex-1 space-y-2">
                    <Text as="h3" className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-snug">
                        {notification.title}
                    </Text>
                    {notification.createdAt && (
                        <p className="text-xs text-slate-400 font-medium">
                            {new Date(notification.createdAt).toLocaleDateString('es-ES', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    )}
                </div>
            </div>

            {/* Message Box */}
            <div className="bg-slate-50/50 dark:bg-base-200/50 rounded-2xl p-5 border border-slate-100/80 dark:border-base-300">
                <Text as="p" className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {notification.message}
                </Text>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-slate-100 dark:border-base-300">
                {isOrgInvitation && notification?.entityId ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => handleOrgInvitationAction(true)}
                            disabled={isResponding}
                            className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 px-3.5 py-2 transition-all shadow-xs"
                        >
                            {isResponding ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Aceptar
                        </button>
                        <button
                            onClick={() => handleOrgInvitationAction(false)}
                            disabled={isResponding}
                            className="btn btn-sm bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-bold rounded-xl text-xs flex items-center gap-1.5 px-3.5 py-2 transition-all"
                        >
                            <X size={14} /> Rechazar
                        </button>
                    </div>
                ) : isInstitutionalCalculation && notification?.entityId ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => handleInstitutionalAction(true)}
                            disabled={isResponding}
                            className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 px-3.5 py-2 transition-all shadow-xs"
                        >
                            {isResponding ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Aceptar Invitación
                        </button>
                        <button
                            onClick={() => handleInstitutionalAction(false)}
                            disabled={isResponding}
                            className="btn btn-sm bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-bold rounded-xl text-xs flex items-center gap-1.5 px-3.5 py-2 transition-all"
                        >
                            <X size={14} /> Rechazar
                        </button>
                    </div>
                ) : (
                    <div />
                )}
                <button
                    onClick={closeModal}
                    className="btn btn-primary px-8 rounded-full font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] w-full sm:w-auto"
                >
                    Entendido
                </button>
            </div>
        </div>
    );
}
