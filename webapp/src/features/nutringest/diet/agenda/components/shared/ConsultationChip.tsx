"use client";

import { cn } from '@/shared/lib/utils';
import { Consultation } from '../../../types/consultation.type';
import { STATUS_TOKENS } from '../../lib/agenda.tokens';

interface ConsultationChipProps {
    consultation: Consultation;
    onClick?: () => void;
    compact?: boolean;
}

const getInitials = (consultation: Consultation) => {
    const first = consultation.patient?.firstName?.charAt(0) ?? '';
    const last = consultation.patient?.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || '?';
};

const getPatientName = (consultation: Consultation) => {
    if (!consultation.patient) {
        return consultation.reason || '—';
    }
    return `${consultation.patient.firstName} ${consultation.patient.lastName}`.trim();
};

export const ConsultationChip = ({ consultation, onClick, compact = false }: ConsultationChipProps) => {
    const tokens = STATUS_TOKENS[consultation.status];
    const name = getPatientName(consultation);
    const avatarUrl = consultation.patient?.avatarUrl ?? null;
    const initials = getInitials(consultation);

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-2 rounded-lg border border-agenda-border bg-agenda-surface text-left transition-colors hover:bg-agenda-panel',
                compact ? 'px-1.5 py-1' : 'px-2.5 py-1.5',
            )}
        >
            <span
                className={cn(
                    'relative shrink-0 rounded-full overflow-hidden bg-agenda-panel flex items-center justify-center font-bold text-agenda-muted',
                    compact ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[11px]',
                )}
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    initials
                )}
            </span>

            <span
                className={cn(
                    'flex-1 min-w-0 truncate font-medium text-agenda-ink',
                    compact ? 'text-[11px]' : 'text-sm',
                )}
            >
                {name}
            </span>

            <span className={cn('shrink-0 rounded-full', tokens.dot, compact ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
        </button>
    );
};
