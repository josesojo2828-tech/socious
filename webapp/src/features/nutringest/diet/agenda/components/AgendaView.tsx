"use client";

import { useTranslation } from '@/context/i18n.context';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import { useAgenda } from '../hooks/useAgenda';
import { useAgendaStore } from '../store/useAgendaStore';
import { AgendaToolbar } from './AgendaToolbar';
import { AgendarModal } from './AgendarModal';
import { DayTimeline } from './DayTimeline';
import { FichaConsultation } from './FichaConsultation';
import { MonthGrid } from './MonthGrid';
import { WeekTimeline } from './WeekTimeline';
import { YearGrid } from './YearGrid';

export const AgendaView = () => {
    const { t } = useTranslation();
    const view = useAgendaStore((state) => state.view);
    const cursor = useAgendaStore((state) => state.cursor);
    const setView = useAgendaStore((state) => state.setView);
    const setCursor = useAgendaStore((state) => state.setCursor);
    const { consultations, summary, isLoading, isError, refetch, remove } = useAgenda();
    const { openModal, closeModal } = useModalStore();

    const handleCreateAt = (date: Date) => {
        openModal(
            <AgendarModal
                start={date}
                onCreated={() => {
                    closeModal();
                    refetch();
                }}
            />,
        );
    };

    const handleSelectConsultation = (id: string) => {
        const consultation = consultations.find((item) => item.id === id);

        openModal(
            <FichaConsultation
                id={id}
                onEdit={(editId) =>
                    openModal(
                        <AgendarModal
                            consultationId={editId || id}
                            onUpdated={() => {
                                closeModal();
                                refetch();
                            }}
                        />,
                    )
                }
                onDelete={async (deleteId) => {
                    await remove(deleteId);
                    closeModal();
                    await refetch();
                }}
                onClose={closeModal}
            />,
        );
    };

    const handleSelectMonth = (date: Date) => {
        setView('month');
        setCursor(date);
    };

    return (
        <div className="flex flex-col gap-4">
            <AgendaToolbar />

            {isError ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-agenda-border bg-agenda-surface py-16 text-center">
                    <p className="text-base font-semibold text-agenda-ink">
                        {t('dashboard.calendar.error.title')}
                    </p>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-content transition-colors hover:bg-primary/90"
                    >
                        {t('dashboard.calendar.error.retry')}
                    </button>
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center rounded-2xl border border-agenda-border bg-agenda-surface py-16">
                    <span className="loading loading-spinner loading-lg text-primary" />
                </div>
            ) : view === 'year' ? (
                <YearGrid
                    year={cursor.getFullYear()}
                    summary={summary}
                    onSelectMonth={handleSelectMonth}
                />
            ) : view === 'week' ? (
                <WeekTimeline
                    cursor={cursor}
                    consultations={consultations}
                    onSelectConsultation={handleSelectConsultation}
                    onCreateAt={handleCreateAt}
                />
            ) : view === 'day' ? (
                <DayTimeline
                    cursor={cursor}
                    consultations={consultations}
                    onSelectConsultation={handleSelectConsultation}
                    onCreateAt={handleCreateAt}
                />
            ) : (
                <MonthGrid
                    cursor={cursor}
                    consultations={consultations}
                    onSelectConsultation={handleSelectConsultation}
                    onCreateAt={handleCreateAt}
                />
            )}
        </div>
    );
};
