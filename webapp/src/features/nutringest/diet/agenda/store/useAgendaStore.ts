import { create } from 'zustand';
import { addDays, addMonths, addWeeks, addYears } from 'date-fns';
import { AgendaViewMode } from '../lib/agenda.tokens';
import { ConsultationStatus } from '../../types/consultation.type';

interface AgendaState {
    view: AgendaViewMode;
    cursor: Date;
    statusFilter?: ConsultationStatus;
    q: string;

    setView: (view: AgendaViewMode) => void;
    setCursor: (cursor: Date) => void;
    goPrev: () => void;
    goNext: () => void;
    goToday: () => void;
    setStatusFilter: (status?: ConsultationStatus) => void;
    setQ: (q: string) => void;
}

function shiftCursor(cursor: Date, view: AgendaViewMode, direction: 1 | -1): Date {
    switch (view) {
        case 'month':
            return addMonths(cursor, direction);
        case 'week':
            return addWeeks(cursor, direction);
        case 'day':
            return addDays(cursor, direction);
        case 'year':
            return addYears(cursor, direction);
        default:
            return cursor;
    }
}

export const useAgendaStore = create<AgendaState>((set, get) => ({
    view: 'month',
    cursor: new Date(),
    statusFilter: undefined,
    q: '',

    setView: (view) => set({ view }),
    setCursor: (cursor) => set({ cursor }),
    goPrev: () => set({ cursor: shiftCursor(get().cursor, get().view, -1) }),
    goNext: () => set({ cursor: shiftCursor(get().cursor, get().view, 1) }),
    goToday: () => set({ cursor: new Date(), view: 'day' }),
    setStatusFilter: (statusFilter) => set({ statusFilter }),
    setQ: (q) => set({ q }),
}));
