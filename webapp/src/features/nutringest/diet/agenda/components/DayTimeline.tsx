"use client";

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarPlus } from 'lucide-react';
import { useTranslation } from '@/context/i18n.context';
import { Consultation } from '../../types/consultation.type';
import { formatDayKey, groupByDay } from '../lib/agenda.utils';
import { StatusBadge } from './shared/StatusBadge';

interface DayTimelineProps {
    cursor: Date;
    consultations: Consultation[];
    onSelectConsultation: (id: string) => void;
    onCreateAt: (date: Date) => void;
}

export const DayTimeline = ({
    cursor,
    consultations,
    onSelectConsultation,
    onCreateAt,
}: DayTimelineProps) => {
    const { t } = useTranslation();
    const dayConsultations = [...(groupByDay(consultations).get(formatDayKey(cursor)) ?? [])].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

    return (
        <div className="rounded-2xl border border-agenda-border bg-agenda-surface p-4">
            <h2 className="mb-4 text-base font-semibold capitalize text-agenda-ink">
                {format(cursor, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </h2>

            {dayConsultations.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <p className="text-base font-semibold text-agenda-ink">
                        {t('dashboard.calendar.empty.title')}
                    </p>
                    <p className="max-w-xs text-sm text-agenda-muted">
                        {t('dashboard.calendar.empty.body')}
                    </p>
                    <button
                        type="button"
                        onClick={() => onCreateAt(cursor)}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-content transition-colors hover:bg-primary/90"
                    >
                        <CalendarPlus className="h-4 w-4" />
                        {t('dashboard.calendar.agendar.cta')}
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {dayConsultations.map((consultation) => {
                        const patientName = consultation.patient
                            ? `${consultation.patient.firstName} ${consultation.patient.lastName}`.trim()
                            : consultation.reason || '—';
                        return (
                            <button
                                key={consultation.id}
                                type="button"
                                onClick={() => onSelectConsultation(consultation.id)}
                                className="flex items-center gap-4 rounded-xl border border-agenda-border bg-agenda-panel px-3 py-2.5 text-left transition-colors hover:bg-agenda-surface"
                            >
                                <span className="w-14 shrink-0 text-sm font-semibold text-agenda-ink">
                                    {format(new Date(consultation.scheduledAt), 'HH:mm')}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-agenda-ink">
                                        {patientName}
                                    </span>
                                    {consultation.reason && (
                                        <span className="block truncate text-xs text-agenda-muted">
                                            {consultation.reason}
                                        </span>
                                    )}
                                </span>
                                <StatusBadge status={consultation.status} size="sm" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
