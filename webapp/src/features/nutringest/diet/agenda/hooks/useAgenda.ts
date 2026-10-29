import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    CreateConsultationPayload,
    UpdateConsultationPayload,
} from '../../types/consultation.type';
import {
    AgendaSummary,
    createConsultation,
    deleteConsultation,
    fetchRange,
    fetchSummary,
    updateConsultation,
} from '../lib/agenda.service';
import { useAgendaStore } from '../store/useAgendaStore';
import { useAgendaRange } from './useAgendaRange';

/** Range query for month/week/day views (disabled on the Year view). */
export function useAgendaRangeQuery() {
    const view = useAgendaStore((state) => state.view);
    const cursor = useAgendaStore((state) => state.cursor);
    const status = useAgendaStore((state) => state.statusFilter);
    const q = useAgendaStore((state) => state.q);

    const { from, to } = useAgendaRange({ view, cursor });
    const fromISO = from.toISOString();
    const toISO = to.toISOString();

    return useQuery({
        queryKey: ['agenda', 'range', fromISO, toISO, status, q],
        queryFn: ({ signal }) => fetchRange({ from, to, status, q }, signal),
        enabled: view !== 'year',
    });
}

/** Yearly aggregate query — only runs on the Year view. */
export function useAgendaSummaryQuery() {
    const view = useAgendaStore((state) => state.view);
    const cursor = useAgendaStore((state) => state.cursor);
    const year = cursor.getFullYear();

    return useQuery({
        queryKey: ['agenda', 'summary', year],
        queryFn: ({ signal }) => fetchSummary(year, signal),
        enabled: view === 'year',
    });
}

/** Create/update/delete mutations — all invalidate the whole `['agenda']` cache. */
export function useAgendaMutations() {
    const queryClient = useQueryClient();
    const invalidateAgenda = () =>
        queryClient.invalidateQueries({ queryKey: ['agenda'] });

    const createMutation = useMutation({
        mutationFn: (payload: CreateConsultationPayload) => createConsultation(payload),
        onSuccess: invalidateAgenda,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateConsultationPayload }) =>
            updateConsultation(id, payload),
        onSuccess: invalidateAgenda,
    });

    const removeMutation = useMutation({
        mutationFn: (id: string) => deleteConsultation(id),
        onSuccess: invalidateAgenda,
    });

    return {
        create: createMutation.mutateAsync,
        update: updateMutation.mutateAsync,
        remove: removeMutation.mutateAsync,
    };
}

export interface UseAgendaResult {
    consultations: Awaited<ReturnType<typeof fetchRange>>['list'];
    summary: AgendaSummary | null;
    isLoading: boolean;
    isError: boolean;
    refetch: () => Promise<void>;
    create: ReturnType<typeof useAgendaMutations>['create'];
    update: ReturnType<typeof useAgendaMutations>['update'];
    remove: ReturnType<typeof useAgendaMutations>['remove'];
}

/** Single entry point composing the range query, summary query and mutations. */
export function useAgenda(): UseAgendaResult {
    const view = useAgendaStore((state) => state.view);
    const rangeQuery = useAgendaRangeQuery();
    const summaryQuery = useAgendaSummaryQuery();
    const { create, update, remove } = useAgendaMutations();

    const refetch = async () => {
        await rangeQuery.refetch();
        if (view === 'year') await summaryQuery.refetch();
    };

    return {
        consultations: rangeQuery.data?.list ?? [],
        summary: summaryQuery.data ?? null,
        isLoading: rangeQuery.isLoading || summaryQuery.isLoading,
        isError: rangeQuery.isError || summaryQuery.isError,
        refetch,
        create,
        update,
        remove,
    };
}
