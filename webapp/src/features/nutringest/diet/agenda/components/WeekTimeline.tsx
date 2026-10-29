"use client";

import { addDays, format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from '@/context/i18n.context';
import { cn } from '@/shared/lib/utils';
import { Consultation } from '../../types/consultation.type';
import { STATUS_TOKENS } from '../lib/agenda.tokens';
import { formatDayKey, groupByDay, startOfWeekDate } from '../lib/agenda.utils';

interface WeekTimelineProps {
    cursor: Date;
    consultations: Consultation[];
    onSelectConsultation: (id: string) => void;
    onCreateAt: (date: Date) => void;
}

const getPatientName = (consultation: Consultation) =>
    consultation.patient
        ? `${consultation.patient.firstName} ${consultation.patient.lastName}`.trim()
        : consultation.reason || '—';

export const WeekTimeline = ({
    cursor,
    consultations,
    onSelectConsultation,
    onCreateAt,
}: WeekTimelineProps) => {
    const { t } = useTranslation();
    const weekStart = startOfWeekDate(cursor);
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    const grouped = groupByDay(consultations);

    const perDay = days.map((day) =>
        [...(grouped.get(formatDayKey(day)) ?? [])].sort(
            (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        ),
    );
    const total = perDay.reduce((sum, list) => sum + list.length, 0);
    const average = total / days.length;

    return (
        <div className="overflow-hidden rounded-2xl border border-agenda-border bg-agenda-surface">
            <div className="grid grid-cols-7 border-b border-agenda-border bg-agenda-panel">
                {days.map((day) => {
                    const today = isToday(day);
                    return (
                        <div
                            key={day.toISOString()}
                            className={cn('px-2 py-2 text-center', today && 'bg-agenda-today-soft')}
                        >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-agenda-muted">
                                {format(day, 'EEE', { locale: es })}
                            </p>
                            <p
                                className={cn(
                                    'text-sm font-bold',
                                    today ? 'text-agenda-today' : 'text-agenda-ink',
                                )}
                            >
                                {format(day, 'd')}
                            </p>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-7">
                {days.map((day, index) => (
                    <div
                        key={formatDayKey(day)}
                        onClick={() => onCreateAt(day)}
                        className={cn(
                            'min-h-[12rem] cursor-pointer border-r border-agenda-border p-1.5 last:border-r-0',
                            isToday(day) && 'bg-agenda-today-soft',
                        )}
                    >
                        <div className="flex flex-col gap-1">
                            {perDay[index].map((consultation) => {
                                const tokens = STATUS_TOKENS[consultation.status];
                                return (
                                    <button
                                        key={consultation.id}
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onSelectConsultation(consultation.id);
                                        }}
                                        className="flex w-full flex-col gap-0.5 rounded-lg border border-agenda-border bg-agenda-panel px-2 py-1.5 text-left transition-colors hover:bg-agenda-surface"
                                    >
                                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-agenda-muted">
                                            <span
                                                className={cn('h-1.5 w-1.5 rounded-full', tokens.dot)}
                                            />
                                            {format(new Date(consultation.scheduledAt), 'HH:mm')}
                                        </span>
                                        <span className="truncate text-xs font-medium text-agenda-ink">
                                            {getPatientName(consultation)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-agenda-border bg-agenda-panel px-3 py-2">
                <div className="flex flex-wrap items-center gap-3">
                    {days.map((day, index) => (
                        <span key={formatDayKey(day)} className="text-xs text-agenda-muted">
                            {format(day, 'EEE', { locale: es })}:{' '}
                            <strong className="text-agenda-ink">{perDay[index].length}</strong>
                        </span>
                    ))}
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <span className="text-agenda-muted">
                        {t('dashboard.calendar.week.total')}:{' '}
                        <strong className="text-agenda-ink">{total}</strong>
                    </span>
                    <span className="text-agenda-muted">
                        {t('dashboard.calendar.week.average')}:{' '}
                        <strong className="text-agenda-ink">{average.toFixed(1)}</strong>
                    </span>
                </div>
            </div>
        </div>
    );
};
