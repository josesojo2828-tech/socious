import { ConsultationStatus } from '@/types/backend/schema.types';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useTranslation } from '@/context/i18n.context';

interface Props {
    status: ConsultationStatus;
}

export const ConsultationStatusBadge = ({ status }: Props) => {
    const { t } = useTranslation();

    const config = {
        [ConsultationStatus.PENDING_APPROVAL]: {
            label: 'Pendiente de Aprobación',
            className: 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse',
            icon: Clock
        },
        [ConsultationStatus.SCHEDULED]: {
            label: t('dashboard.modals.create_consultation.status.scheduled'),
            className: 'bg-emerald-50 text-emerald-700 border-blue-200',
            icon: Calendar
        },
        [ConsultationStatus.COMPLETED]: {
            label: t('dashboard.modals.create_consultation.status.completed'),
            className: 'bg-green-50 text-green-700 border-green-200',
            icon: CheckCircle2
        },
        [ConsultationStatus.CANCELED]: {
            label: t('dashboard.modals.create_consultation.status.canceled'),
            className: 'bg-gray-100 text-gray-500 border-gray-200',
            icon: XCircle
        },
        [ConsultationStatus.NO_SHOW]: {
            label: t('dashboard.modals.create_consultation.status.no_show'),
            className: 'bg-red-50 text-red-700 border-red-200',
            icon: AlertCircle
        },
    };

    const { label, className, icon: Icon } = config[status] || config[ConsultationStatus.SCHEDULED];

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${className}`}>
            <Icon size={12} />
            {label}
        </span>
    );
};