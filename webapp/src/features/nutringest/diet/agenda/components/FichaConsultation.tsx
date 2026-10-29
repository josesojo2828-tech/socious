"use client";

import { useTranslation } from '@/context/i18n.context';
import { Button } from '@/shared/components/atoms/Button';
import { useUniqueObject } from '@/shared/hooks/crud/useUniqueObject';
import { Calendar, Clock, ExternalLink, FileText, Pencil, Trash2, X, Check } from 'lucide-react';
import { Consultation, ConsultationType, ConsultationStatus } from '../../types/consultation.type';
import { ConsultationEndpoints } from '../../services/consultation.endpoint';
import { StatusBadge } from './shared/StatusBadge';
import { useConsultation } from '../../hooks/useConsultation';

const TYPE_LABEL_KEY: Record<ConsultationType, string> = {
    [ConsultationType.FIRST_TIME]: 'dashboard.modals.create_consultation.types.first_time',
    [ConsultationType.FOLLOW_UP]: 'dashboard.modals.create_consultation.types.follow_up',
    [ConsultationType.EMERGENCY]: 'dashboard.modals.create_consultation.types.emergency',
};

interface FichaConsultationProps {
    id: string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export function FichaConsultation({ id, onEdit, onDelete, onClose }: FichaConsultationProps) {
    const { t } = useTranslation();
    const { acceptConsultation, rejectConsultation } = useConsultation();
    const { entity, loading } = useUniqueObject<Consultation>({
        path: ConsultationEndpoints.actions.detail(id),
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-agenda-primary border-t-transparent" />
                <p className="text-sm font-medium text-agenda-muted">{t('common.status.loading')}</p>
            </div>
        );
    }

    if (!entity) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                <p className="text-sm font-semibold text-status-canceled">
                    {t('common.status.not_found')}
                </p>
                <Button variant="ghost" size="sm" onClick={onClose} className="border border-agenda-border">
                    {t('dashboard.calendar.ficha.close')}
                </Button>
            </div>
        );
    }

    const patientName = entity.patient
        ? `${entity.patient.firstName} ${entity.patient.lastName}`.trim()
        : '—';
    const initials = entity.patient
        ? `${entity.patient.firstName?.charAt(0) ?? ''}${entity.patient.lastName?.charAt(0) ?? ''}`.toUpperCase()
        : '?';
    const avatarUrl = entity.patient?.avatarUrl ?? null;
    const typeLabel = t(TYPE_LABEL_KEY[entity.type] ?? entity.type);

    const dateFormatted = new Date(entity.scheduledAt).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const timeFormatted = new Date(entity.scheduledAt).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    });

    const handleViewRecord = () => {
        if (!entity.patientId) return;
        onClose();
        window.location.href = '/dashboard/patients/' + entity.patientId;
    };

    return (
        <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-agenda-surface text-agenda-ink">
            <div className="flex items-start justify-between gap-4 border-b border-agenda-border bg-agenda-panel px-6 py-5">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-agenda-surface text-sm font-bold text-agenda-muted">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={patientName} className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                            initials
                        )}
                    </span>
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-agenda-muted">
                            {t('dashboard.calendar.ficha.title')}
                        </span>
                        <span className="sr-only">{t('dashboard.calendar.ficha.patient')}</span>
                        <h3 className="truncate text-xl font-bold leading-tight text-agenda-ink">{patientName}</h3>
                        <span className="mt-1 inline-flex items-center rounded-full bg-agenda-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-agenda-primary">
                            {typeLabel}
                        </span>
                    </div>
                </div>
                <StatusBadge status={entity.status} />
            </div>

            <div className="flex-1 space-y-6 px-6 py-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl border border-agenda-border bg-agenda-panel p-3.5">
                        <span className="rounded-lg bg-agenda-surface p-2 text-agenda-primary">
                            <Calendar className="h-5 w-5" />
                        </span>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-agenda-muted">
                                {t('dashboard.modals.create_consultation.date_label')}
                            </span>
                            <p className="text-sm font-bold capitalize text-agenda-ink">{dateFormatted}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-agenda-border bg-agenda-panel p-3.5">
                        <span className="rounded-lg bg-agenda-surface p-2 text-agenda-primary">
                            <Clock className="h-5 w-5" />
                        </span>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-agenda-muted">
                                {t('dashboard.modals.create_consultation.time_label')}
                            </span>
                            <p className="text-sm font-bold text-agenda-ink">{timeFormatted}</p>
                        </div>
                    </div>
                </div>

                {entity.reason && (
                    <div className="space-y-1.5 rounded-xl border border-agenda-border bg-agenda-panel p-4">
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-agenda-muted">
                            <FileText className="h-3.5 w-3.5" /> {t('dashboard.calendar.ficha.reason')}
                        </span>
                        <p className="text-sm font-medium leading-relaxed text-agenda-ink">{entity.reason}</p>
                    </div>
                )}

                {entity.notes && (
                    <div className="space-y-1.5 rounded-xl border border-agenda-border bg-agenda-panel p-4">
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-agenda-muted">
                            <FileText className="h-3.5 w-3.5" /> {t('dashboard.calendar.ficha.notes')}
                        </span>
                        <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-agenda-ink">
                            {entity.notes}
                        </p>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-agenda-border bg-agenda-panel px-6 py-4">
                {entity.status === ConsultationStatus.PENDING_APPROVAL && (
                    <>
                        <button
                            onClick={async () => {
                                const ok = await acceptConsultation(id);
                                if (ok) onClose();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                        >
                            <Check className="h-4 w-4" />
                            Aceptar Cita
                        </button>
                        <button
                            onClick={async () => {
                                const ok = await rejectConsultation(id);
                                if (ok) onClose();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                            Rechazar Cita
                        </button>
                    </>
                )}
                {entity.patientId && (
                    <Button variant="primary" size="sm" onClick={handleViewRecord}>
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        {t('dashboard.calendar.ficha.view_record')}
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(id)}
                    className="border border-agenda-border"
                >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    {t('dashboard.calendar.ficha.edit')}
                </Button>
                <Button variant="error" size="sm" onClick={() => onDelete(id)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('dashboard.calendar.ficha.delete')}
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose} className="border border-agenda-border">
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    {t('dashboard.calendar.ficha.close')}
                </Button>
            </div>
        </div>
    );
}

export default FichaConsultation;
