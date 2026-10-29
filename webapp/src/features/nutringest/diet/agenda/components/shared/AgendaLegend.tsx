"use client";

import { useTranslation } from '@/context/i18n.context';
import { cn } from '@/shared/lib/utils';
import { ConsultationStatus } from '../../../types/consultation.type';
import { STATUS_LABEL_KEY, STATUS_TOKENS } from '../../lib/agenda.tokens';

const LEGEND_ORDER: ConsultationStatus[] = [
    ConsultationStatus.SCHEDULED,
    ConsultationStatus.COMPLETED,
    ConsultationStatus.CANCELED,
    ConsultationStatus.NO_SHOW,
];

interface AgendaLegendProps {
    className?: string;
}

export const AgendaLegend = ({ className }: AgendaLegendProps) => {
    const { t } = useTranslation();

    return (
        <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2 text-sm', className)}>
            {LEGEND_ORDER.map((status) => {
                const tokens = STATUS_TOKENS[status];
                return (
                    <div key={status} className="flex items-center gap-2">
                        <span className={cn('w-3 h-3 rounded-full', tokens.dot)} />
                        <span className="font-medium text-agenda-muted">{t(STATUS_LABEL_KEY[status])}</span>
                    </div>
                );
            })}
        </div>
    );
};
