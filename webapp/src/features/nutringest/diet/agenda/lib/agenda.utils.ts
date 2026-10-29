import { addDays, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { Consultation, ConsultationStatus } from '../../types/consultation.type';

/** Week starts on Monday (matches the mockup header Mo–Su). */
export const WEEK_STARTS_ON: 0 | 1 = 1;

/** Number of cells in the month grid (6 rows × 7 columns). */
export const MONTH_MATRIX_SIZE = 42;

/** Local `YYYY-MM-DD` key for a date (no UTC shifting). */
export function formatDayKey(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

/** Parse a local `YYYY-MM-DD` key back into a local Date at midnight. */
export function parseDayKey(key: string): Date {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** Bucket consultations by their local calendar day. */
export function groupByDay(consultations: Consultation[]): Map<string, Consultation[]> {
    const map = new Map<string, Consultation[]>();
    for (const consultation of consultations) {
        const key = formatDayKey(new Date(consultation.scheduledAt));
        const bucket = map.get(key);
        if (bucket) bucket.push(consultation);
        else map.set(key, [consultation]);
    }
    return map;
}

/** Count consultations per status, always returning every status key. */
export function countByStatus(consultations: Consultation[]): Record<ConsultationStatus, number> {
    const counts: Record<ConsultationStatus, number> = {
        [ConsultationStatus.SCHEDULED]: 0,
        [ConsultationStatus.COMPLETED]: 0,
        [ConsultationStatus.CANCELED]: 0,
        [ConsultationStatus.NO_SHOW]: 0,
        [ConsultationStatus.PENDING_APPROVAL]: 0,
    };

    for (const consultation of consultations) {
        if (consultation.status in counts) {
            counts[consultation.status] += 1;
        }
    }

    return counts;
}

/** Start of the week containing `date`. */
export function startOfWeekDate(date: Date, weekStartsOn: 0 | 1 = WEEK_STARTS_ON): Date {
    return startOfWeek(date, { weekStartsOn });
}

/** End of the week containing `date`. */
export function endOfWeekDate(date: Date, weekStartsOn: 0 | 1 = WEEK_STARTS_ON): Date {
    return endOfWeek(date, { weekStartsOn });
}

/**
 * 42-day grid covering the month of `cursor`, including leading/trailing days
 * from the adjacent months. Default week start is Monday.
 */
export function buildMonthMatrix(cursor: Date, weekStartsOn: 0 | 1 = WEEK_STARTS_ON): Date[] {
    const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn });
    const days: Date[] = [];
    for (let i = 0; i < MONTH_MATRIX_SIZE; i++) {
        days.push(addDays(gridStart, i));
    }
    return days;
}
