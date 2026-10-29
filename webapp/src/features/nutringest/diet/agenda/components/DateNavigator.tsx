"use client";

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/context/i18n.context';
import { cn } from '@/shared/lib/utils';
import { AgendaViewMode } from '../lib/agenda.tokens';
import { endOfWeekDate, startOfWeekDate } from '../lib/agenda.utils';
import { useAgendaStore } from '../store/useAgendaStore';

interface DateNavigatorProps {
    className?: string;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function getRangeLabel(view: AgendaViewMode, cursor: Date): string {
    switch (view) {
        case 'week': {
            const start = startOfWeekDate(cursor);
            const end = endOfWeekDate(cursor);
            return `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM yyyy', { locale: es })}`;
        }
        case 'day':
            return capitalize(format(cursor, 'EEEE d MMM', { locale: es }));
        case 'year':
            return format(cursor, 'yyyy', { locale: es });
        case 'month':
        default:
            return capitalize(format(cursor, 'MMMM yyyy', { locale: es }));
    }
}

export const DateNavigator = ({ className }: DateNavigatorProps) => {
    const { t } = useTranslation();
    const view = useAgendaStore((state) => state.view);
    const cursor = useAgendaStore((state) => state.cursor);
    const goPrev = useAgendaStore((state) => state.goPrev);
    const goNext = useAgendaStore((state) => state.goNext);
    const goToday = useAgendaStore((state) => state.goToday);

    return (
        <div className={cn('flex items-center gap-1', className)}>
            <button
                type="button"
                onClick={goPrev}
                aria-label={t('dashboard.calendar.nav.prev')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-agenda-border bg-agenda-surface text-agenda-muted transition-colors hover:text-agenda-ink"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="min-w-[9rem] px-2 text-center text-sm font-semibold text-agenda-ink">
                {getRangeLabel(view, cursor)}
            </span>

            <button
                type="button"
                onClick={goNext}
                aria-label={t('dashboard.calendar.nav.next')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-agenda-border bg-agenda-surface text-agenda-muted transition-colors hover:text-agenda-ink"
            >
                <ChevronRight className="h-4 w-4" />
            </button>

            <button
                type="button"
                onClick={goToday}
                className="ml-1 rounded-lg border border-agenda-border bg-agenda-surface px-3 py-1.5 text-sm font-medium text-agenda-ink transition-colors hover:bg-agenda-panel"
            >
                {t('dashboard.calendar.today')}
            </button>
        </div>
    );
};
