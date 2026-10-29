"use client";

import { format, isSameMonth, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from '@/context/i18n.context';
import { cn } from '@/shared/lib/utils';
import { ConsultationStatus } from '../../types/consultation.type';
import { AgendaSummary } from '../lib/agenda.service';
import { STATUS_TOKENS } from '../lib/agenda.tokens';
import { buildMonthMatrix, formatDayKey } from '../lib/agenda.utils';
import { AgendaLegend } from './shared/AgendaLegend';

interface YearGridProps {
    year: number;
    summary: AgendaSummary | null;
    onSelectMonth: (date: Date) => void;
}

function dominantSoftClass(byStatus: Record<string, number>): string | undefined {
    let topStatus: string | undefined;
    let topCount = 0;

    for (const [status, count] of Object.entries(byStatus)) {
        if (count > topCount) {
            topCount = count;
            topStatus = status;
        }
    }

    if (!topStatus || topCount === 0) return undefined;
    return STATUS_TOKENS[topStatus as ConsultationStatus]?.soft;
}

export const YearGrid = ({ year, summary, onSelectMonth }: YearGridProps) => {
    const { t } = useTranslation();
    const summaryByDay = new Map((summary?.days ?? []).map((day) => [day.date, day]));
    const months = Array.from({ length: 12 }, (_, index) => new Date(year, index, 1));

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {months.map((monthDate) => {
                    const matrix = buildMonthMatrix(monthDate);
                    return (
                        <div
                            key={monthDate.toISOString()}
                            className="rounded-2xl border border-agenda-border bg-agenda-surface p-3"
                        >
                            <button
                                type="button"
                                onClick={() => onSelectMonth(monthDate)}
                                className="mb-2 w-full text-center text-sm font-semibold capitalize text-agenda-ink transition-colors hover:text-agenda-today"
                            >
                                {format(monthDate, 'MMMM', { locale: es })}
                            </button>

                            <div className="grid grid-cols-7 gap-0.5">
                                {matrix.slice(0, 7).map((day) => (
                                    <span
                                        key={day.toISOString()}
                                        className="text-center text-[10px] font-semibold uppercase text-agenda-muted"
                                    >
                                        {format(day, 'EEEEE', { locale: es })}
                                    </span>
                                ))}

                                {matrix.map((day) => {
                                    const outside = !isSameMonth(day, monthDate);
                                    const daySummary = summaryByDay.get(formatDayKey(day));
                                    const tint = daySummary
                                        ? dominantSoftClass(daySummary.byStatus)
                                        : undefined;
                                    const today = isToday(day);

                                    return (
                                        <button
                                            key={day.toISOString()}
                                            type="button"
                                            onClick={() => onSelectMonth(day)}
                                            className={cn(
                                                'flex h-6 items-center justify-center rounded text-[11px] font-medium text-agenda-ink transition-colors hover:ring-1 hover:ring-agenda-today',
                                                outside && 'text-agenda-muted/40',
                                                tint,
                                                today && 'ring-2 ring-agenda-today',
                                            )}
                                        >
                                            {format(day, 'd')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-agenda-muted">
                    {t('dashboard.calendar.year.legend')}
                </span>
                <AgendaLegend />
            </div>
        </div>
    );
};
