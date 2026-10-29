import { ConsultationStatus } from '../../types/consultation.type';

export interface StatusTokenSet {
    /** Solid dot / accent background */
    dot: string;
    /** Soft pill background */
    badgeBg: string;
    /** Colored pill text */
    badgeText: string;
    /** Colored pill border */
    badgeBorder: string;
    /** Solid fill (bars) with readable text */
    solid: string;
    /** Soft fill + colored text (combined) */
    soft: string;
}

export const STATUS_TOKENS: Record<ConsultationStatus, StatusTokenSet> = {
    [ConsultationStatus.PENDING_APPROVAL]: {
        dot: 'bg-amber-500',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-800',
        badgeBorder: 'border-amber-200',
        solid: 'bg-amber-500 text-white',
        soft: 'bg-amber-50 text-amber-800',
    },
    [ConsultationStatus.SCHEDULED]: {
        dot: 'bg-status-scheduled',
        badgeBg: 'bg-status-scheduled-soft',
        badgeText: 'text-status-scheduled',
        badgeBorder: 'border-status-scheduled-border',
        solid: 'bg-status-scheduled text-white',
        soft: 'bg-status-scheduled-soft text-status-scheduled',
    },
    [ConsultationStatus.COMPLETED]: {
        dot: 'bg-status-completed',
        badgeBg: 'bg-status-completed-soft',
        badgeText: 'text-status-completed',
        badgeBorder: 'border-status-completed-border',
        solid: 'bg-status-completed text-white',
        soft: 'bg-status-completed-soft text-status-completed',
    },
    [ConsultationStatus.CANCELED]: {
        dot: 'bg-status-canceled',
        badgeBg: 'bg-status-canceled-soft',
        badgeText: 'text-status-canceled',
        badgeBorder: 'border-status-canceled-border',
        solid: 'bg-status-canceled text-white',
        soft: 'bg-status-canceled-soft text-status-canceled',
    },
    [ConsultationStatus.NO_SHOW]: {
        dot: 'bg-status-noshow',
        badgeBg: 'bg-status-noshow-soft',
        badgeText: 'text-status-noshow',
        badgeBorder: 'border-status-noshow-border',
        solid: 'bg-status-noshow text-white',
        soft: 'bg-status-noshow-soft text-status-noshow',
    },
};

export const STATUS_LABEL_KEY: Record<ConsultationStatus, string> = {
    [ConsultationStatus.PENDING_APPROVAL]: 'Pendiente de Aprobación',
    [ConsultationStatus.SCHEDULED]: 'dashboard.modals.create_consultation.status.scheduled',
    [ConsultationStatus.COMPLETED]: 'dashboard.modals.create_consultation.status.completed',
    [ConsultationStatus.CANCELED]: 'dashboard.modals.create_consultation.status.canceled',
    [ConsultationStatus.NO_SHOW]: 'dashboard.modals.create_consultation.status.no_show',
};

export const VIEW_MODES = ['month', 'week', 'day', 'year'] as const;

export type AgendaViewMode = (typeof VIEW_MODES)[number];
