"use client";

import { useTranslation } from '@/context/i18n.context';
import { cn } from '@/shared/lib/utils';
import { ConsultationStatus } from '../../../types/consultation.type';
import { STATUS_LABEL_KEY, STATUS_TOKENS } from '../../lib/agenda.tokens';

interface StatusBadgeProps {
    status: ConsultationStatus;
    size?: 'sm' | 'md';
}

export const StatusBadge = ({ status, size = 'md' }: StatusBadgeProps) => {
    const { t } = useTranslation();
    const tokens = STATUS_TOKENS[status];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap',
                tokens.badgeBg,
                tokens.badgeText,
                tokens.badgeBorder,
                size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
            )}
        >
            <span className={cn('rounded-full', tokens.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
            {t(STATUS_LABEL_KEY[status])}
        </span>
    );
};
