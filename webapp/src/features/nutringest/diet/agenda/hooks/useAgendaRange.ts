import { useMemo } from 'react';
import { endOfDay, endOfYear, startOfDay, startOfYear } from 'date-fns';
import { AgendaViewMode } from '../lib/agenda.tokens';
import { buildMonthMatrix, endOfWeekDate, startOfWeekDate } from '../lib/agenda.utils';

export interface AgendaRange {
    from: Date;
    to: Date;
}

export interface UseAgendaRangeParams {
    view: AgendaViewMode;
    cursor: Date;
}

/**
 * Resolve the queryable date range for the active view:
 * - month → the full 42-day grid (leading/trailing days included)
 * - week  → start/end of the week containing `cursor`
 * - day   → start/end of that day
 * - year  → Jan 1 → Dec 31 of `cursor`'s year
 */
export function useAgendaRange({ view, cursor }: UseAgendaRangeParams): AgendaRange {
    return useMemo(() => {
        switch (view) {
            case 'month': {
                const matrix = buildMonthMatrix(cursor);
                return { from: matrix[0], to: endOfDay(matrix[matrix.length - 1]) };
            }
            case 'week':
                return { from: startOfWeekDate(cursor), to: endOfWeekDate(cursor) };
            case 'year':
                return { from: startOfYear(cursor), to: endOfYear(cursor) };
            case 'day':
            default:
                return { from: startOfDay(cursor), to: endOfDay(cursor) };
        }
    }, [view, cursor]);
}
