import type { LeadStatus } from "../types/lead.type";

const STORAGE_KEY = "socius.leads.sjm.v1";

/**
 * Lead statuses live in localStorage, but React reads them through
 * `useSyncExternalStore` so the first client render after hydration is the
 * only one that differs from the server snapshot.
 */
const EMPTY: Record<string, LeadStatus> = {};

let cache: Record<string, LeadStatus> | null = null;
const listeners = new Set<() => void>();

function read(): Record<string, LeadStatus> {
  if (typeof window === "undefined") return EMPTY;
  if (cache) return cache;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, LeadStatus>) : EMPTY;
  } catch {
    cache = EMPTY;
  }

  return cache;
}

export function getStatusesSnapshot(): Record<string, LeadStatus> {
  return read();
}

export function getStatusesServerSnapshot(): Record<string, LeadStatus> {
  return EMPTY;
}

export function subscribeStatuses(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function setLeadStatus(name: string, value: LeadStatus): void {
  const next = { ...read(), [name]: value };
  cache = next;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode: keep the value for this session only.
  }

  listeners.forEach((listener) => listener());
}
