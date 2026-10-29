import { Clock, CheckCircle2, XCircle, Ban } from 'lucide-react';
import type { PatientReferralStatus } from '@/types/nutringest/patient-referral.interface';

interface Props {
    status: PatientReferralStatus;
}

const config: Record<PatientReferralStatus, { label: string; className: string; icon: typeof Clock }> = {
    PENDING: {
        label: 'Pendiente',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
    },
    ACCEPTED: {
        label: 'Aceptado',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
    },
    REJECTED: {
        label: 'Rechazado',
        className: 'bg-red-50 text-red-700 border-red-200',
        icon: XCircle,
    },
    CANCELED: {
        label: 'Cancelado',
        className: 'bg-gray-100 text-gray-500 border-gray-200',
        icon: Ban,
    },
};

export const ReferralStatusBadge = ({ status }: Props) => {
    const { label, className, icon: Icon } = config[status];

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${className}`}>
            <Icon size={12} />
            {label}
        </span>
    );
};