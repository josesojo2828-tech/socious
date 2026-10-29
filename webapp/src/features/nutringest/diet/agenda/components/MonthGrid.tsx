"use client";

import { format, isSameMonth, isToday, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from '@/context/i18n.context';
import { cn } from '@/shared/lib/utils';
import { Consultation } from '../../types/consultation.type';
import { buildMonthMatrix, formatDayKey, groupByDay } from '../lib/agenda.utils';
import { ConsultationChip } from './shared/ConsultationChip';

const MAX_VISIBLE = 3;

interface MonthGridProps {
    cursor: Date;
    consultations: Consultation[];
    onSelectConsultation: (id: string) => void;
    onCreateAt: (date: Date) => void;
}

export const MonthGrid = ({
    cursor,
    consultations,
    onSelectConsultation,
    onCreateAt,
}: MonthGridProps) => {
    const { t } = useTranslation();
    const days = buildMonthMatrix(cursor);
    const grouped = groupByDay(consultations);

    return (
        <div className="overflow-hidden rounded-2xl border border-agenda-border bg-agenda-surface">
            <div className="grid grid-cols-7 border-b border-agenda-border bg-agenda-panel">
                {days.slice(0, 7).map((day) => (
                    <div
                        key={day.toISOString()}
                        className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-agenda-muted"
                    >
                        {format(day, 'EEEEEE', { locale: es })}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {days.map((day) => {
                    const key = formatDayKey(day);
                    const dayConsultations = grouped.get(key) ?? [];
                    const outside = !isSameMonth(day, cursor);
                    const today = isToday(day);
                    const weekend = isWeekend(day);

                    return (
                        <div
                            key={key}
                            onClick={() => onCreateAt(day)}
                            className={cn(
                                'min-h-[7rem] cursor-pointer border-b border-r border-agenda-border p-1.5 transition-colors hover:bg-agenda-panel/60',
                                '[&:nth-child(7n)]:border-r-0 [&:nth-child(n+36)]:border-b-0',
                                weekend && 'bg-agenda-weekend',
                                outside && 'opacity-50',
                                today && 'border-agenda-today bg-agenda-today-soft',
                            )}
                        >
                            <div className="mb-1 flex justify-end">
                                <span
                                    className={cn(
                                        'text-xs font-semibold',
                                        today ? 'text-agenda-today' : 'text-agenda-ink',
                                    )}
                                >
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                {dayConsultations.slice(0, MAX_VISIBLE).map((consultation) => (
                                    <div
                                        key={consultation.id}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <ConsultationChip
                                            consultation={consultation}
                                            compact
                                            onClick={() => onSelectConsultation(consultation.id)}
                                        />
                                    </div>
                                ))}

                                {dayConsultations.length > MAX_VISIBLE && (
                                    <span
                                        onClick={(event) => event.stopPropagation()}
                                        className="px-1 text-[11px] font-medium text-agenda-muted"
                                    >
                                        {t('dashboard.calendar.month.more', {
                                            count: dayConsultations.length - MAX_VISIBLE,
                                        })}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
