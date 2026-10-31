import type { PurchaseLineForm } from "./purchase-form";

/** localStorage key for the station-local purchase draft (S4). */
export const PURCHASE_DRAFT_KEY = "socius.purchase-draft";

/** The shape persisted in localStorage; string amounts mirror the form. */
export interface PurchaseDraft {
  supplierId: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: PurchaseLineForm[];
  savedAt: string;
}

/** Minimal Storage contract so tests can inject a double. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): DraftStorage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

/** Stamps `savedAt` and persists the draft; a no-op without storage. */
export function saveDraft(
  draft: Omit<PurchaseDraft, "savedAt">,
  storage: DraftStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  const payload: PurchaseDraft = { ...draft, savedAt: new Date().toISOString() };
  storage.setItem(PURCHASE_DRAFT_KEY, JSON.stringify(payload));
}

/** Returns the stored draft, or null when absent or corrupted (never throws). */
export function loadDraft(
  storage: DraftStorage | null = defaultStorage(),
): PurchaseDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PURCHASE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PurchaseDraft | null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Removes the stored draft; a no-op without storage. */
export function clearDraft(
  storage: DraftStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  storage.removeItem(PURCHASE_DRAFT_KEY);
}
