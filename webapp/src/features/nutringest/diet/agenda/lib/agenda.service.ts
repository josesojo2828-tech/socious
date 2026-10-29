import { apiClient } from '@/shared/api/api.client';
import {
    ConsultationActionResponse,
    ConsultationListResponse,
    ConsultationStatus,
    CreateConsultationPayload,
    UpdateConsultationPayload,
} from '../../types/consultation.type';
import { ConsultationEndpoints } from '../../services/consultation.endpoint';

/** Per-day aggregate returned by the yearly agenda-summary endpoint. */
export interface AgendaDaySummary {
    date: string; // 'YYYY-MM-DD'
    total: number;
    byStatus: {
        SCHEDULED: number;
        COMPLETED: number;
        CANCELED: number;
        NO_SHOW: number;
    };
}

/** Response of the yearly agenda-summary endpoint. */
export interface AgendaSummary {
    year: number;
    days: AgendaDaySummary[];
}

export interface AgendaRangeParams {
    from: Date;
    to: Date;
    status?: ConsultationStatus;
    q?: string;
    limit?: number;
}

/** Build a query string, skipping empty/undefined/null values. */
export function buildQueryString(
    params: Record<string, string | number | boolean | undefined | null>,
): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        search.append(key, String(value));
    }
    return search.toString();
}

/**
 * Fetch consultations for a date range. The backend maps `createdAt_gte/lte`
 * onto `scheduledAt`, so the range filters the appointment date.
 */
export async function fetchRange(
    params: AgendaRangeParams,
    signal?: AbortSignal,
): Promise<ConsultationListResponse> {
    const queryString = buildQueryString({
        createdAt_gte: params.from.toISOString(),
        createdAt_lte: params.to.toISOString(),
        limit: params.limit ?? 500,
        status: params.status,
        q: params.q,
    });

    const { data } = await apiClient.get<ConsultationListResponse>(
        ConsultationEndpoints.actions.list(queryString),
        { signal },
    );
    return data;
}

/** Fetch the yearly per-day/status aggregate (Year view). */
export async function fetchSummary(year: number, signal?: AbortSignal): Promise<AgendaSummary> {
    const { data } = await apiClient.get<AgendaSummary>(
        ConsultationEndpoints.actions.summary(year),
        { signal },
    );
    return data;
}

/** Create a consultation via the backend JSON action. */
export async function createConsultation(
    payload: CreateConsultationPayload,
): Promise<ConsultationActionResponse> {
    const { data } = await apiClient.post<ConsultationActionResponse>(
        ConsultationEndpoints.actions.create(),
        payload,
    );
    return data;
}

/** Update a consultation via the backend JSON action. */
export async function updateConsultation(
    id: string,
    payload: UpdateConsultationPayload,
): Promise<ConsultationActionResponse> {
    const { data } = await apiClient.post<ConsultationActionResponse>(
        ConsultationEndpoints.actions.update(id),
        payload,
    );
    return data;
}

/** Cancel/delete a consultation via the backend JSON action. */
export async function deleteConsultation(id: string): Promise<void> {
    await apiClient.post(ConsultationEndpoints.actions.delete(id));
}
