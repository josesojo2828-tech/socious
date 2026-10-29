"use client";

import { useTranslation } from '@/context/i18n.context';
import { cn } from '@/shared/lib/utils';
import { AgendaViewMode, VIEW_MODES } from '../lib/agenda.tokens';
import { useAgendaStore } from '../store/useAgendaStore';

interface ViewSwitcherProps {
    className?: string;
}

export const ViewSwitcher = ({ className }: ViewSwitcherProps) => {
    const { t } = useTranslation();
    const view = useAgendaStore((state) => state.view);
    const setView = useAgendaStore((state) => state.setView);

    return (
        <div
            role="tablist"
            aria-label={t('dashboard.calendar.title')}
            className={cn(
                'inline-flex items-center gap-1 rounded-xl border border-agenda-border bg-agenda-panel p-1',
                className,
            )}
        >
            {VIEW_MODES.map((mode: AgendaViewMode) => {
                const isActive = view === mode;
                return (
                    <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setView(mode)}
                        className={cn(
                            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-agenda-surface text-agenda-ink shadow-sm'
                                : 'text-agenda-muted hover:text-agenda-ink',
                        )}
                    >
                        {t(`dashboard.calendar.views.${mode}`)}
                    </button>
                );
            })}
        </div>
    );
};
