"use client";

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from '@/context/i18n.context';
import { cn } from '@/shared/lib/utils';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { ConsultationStatus } from '../../types/consultation.type';
import { STATUS_LABEL_KEY } from '../lib/agenda.tokens';
import { useAgenda } from '../hooks/useAgenda';
import { useAgendaStore } from '../store/useAgendaStore';
import { AgendarModal } from './AgendarModal';
import { DateNavigator } from './DateNavigator';
import { ViewSwitcher } from './ViewSwitcher';

const STATUS_OPTIONS: ConsultationStatus[] = [
    ConsultationStatus.SCHEDULED,
    ConsultationStatus.COMPLETED,
    ConsultationStatus.CANCELED,
    ConsultationStatus.NO_SHOW,
];

interface AgendaToolbarProps {
    className?: string;
}

export const AgendaToolbar = ({ className }: AgendaToolbarProps) => {
    const { t } = useTranslation();
    const { openModal, closeModal } = useModalStore();
    const { refetch } = useAgenda();

    const statusFilter = useAgendaStore((state) => state.statusFilter);
    const setStatusFilter = useAgendaStore((state) => state.setStatusFilter);
    const setQ = useAgendaStore((state) => state.setQ);

    const [search, setSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setQ(search), 300);
        return () => clearTimeout(timer);
    }, [search, setQ]);

    const handleNewAppointment = () => {
        openModal(
            <AgendarModal
                onCreated={() => {
                    closeModal();
                    refetch();
                }}
            />,
        );
    };

    return (
        <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
            <div className="flex flex-wrap items-center gap-3">
                <ViewSwitcher />
                <DateNavigator />
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agenda-muted" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t('dashboard.calendar.search_placeholder')}
                        className="h-9 w-48 rounded-lg border border-agenda-border bg-agenda-surface pl-9 pr-3 text-sm text-agenda-ink placeholder:text-agenda-muted focus:outline-none focus:ring-2 focus:ring-agenda-today/30"
                    />
                </div>

                <select
                    value={statusFilter ?? ''}
                    onChange={(event) =>
                        setStatusFilter(
                            event.target.value
                                ? (event.target.value as ConsultationStatus)
                                : undefined,
                        )
                    }
                    className="h-9 rounded-lg border border-agenda-border bg-agenda-surface px-3 text-sm text-agenda-ink focus:outline-none focus:ring-2 focus:ring-agenda-today/30"
                >
                    <option value="" className="bg-base-100 text-base-content">{t('dashboard.calendar.filter.status_all')}</option>
                    {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status} className="bg-base-100 text-base-content">
                            {t(STATUS_LABEL_KEY[status])}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={handleNewAppointment}
                    className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-content transition-colors hover:bg-primary/90"
                >
                    {t('dashboard.calendar.agendar.cta')}
                </button>
            </div>
        </div>
    );
};
