import type {
  PurchaseDraftPaymentMode,
  PurchaseLineForm,
} from "./purchase-form";

/** localStorage key for the station-local purchase draft (S4). */
export const PURCHASE_DRAFT_KEY = "socius.purchase-draft";

/** The shape persisted in localStorage; string amounts mirror the form. */
export interface PurchaseDraft {
  supplierId: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  /** Attached invoice key (S14 #5); absent when no invoice was uploaded. */
  invoiceKey?: string;
  items: PurchaseLineForm[];
  /** Settlement mode (S3); absent on drafts saved before the field. */
  paymentMode?: PurchaseDraftPaymentMode;
  /** Method code for PAID / PARTIAL. */
  paymentMethod?: string;
  /** Initial amount in the method's currency (PARTIAL). */
  initialAmount?: string;
  savedAt: string;
}

/** Draft form fields without the local stamp (what the server stores). */
export type PurchaseDraftPayload = Omit<PurchaseDraft, "savedAt">;

/** Row returned by GET/PUT /api/purchases/drafts (S13). */
export interface ServerPurchaseDraft {
  id: string;
  name: string | null;
  payload: PurchaseDraftPayload;
  createdAt: string;
  updatedAt: string;
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

// ------------------------------------------------------------------
// Account sync (S13): pure mapping helpers between the screen draft and
// the PurchaseDraft Json payload the backend stores per org + user.
// ------------------------------------------------------------------

/**
 * The Json body the server stores: the draft form fields exactly as the
 * screen holds them, minus `savedAt` (the server stamps its own updatedAt).
 */
export function draftToPayload(
  draft: PurchaseDraft | Omit<PurchaseDraft, "savedAt">,
): PurchaseDraftPayload {
  return {
    supplierId: draft.supplierId,
    issueDate: draft.issueDate,
    dueDate: draft.dueDate,
    notes: draft.notes,
    // Only an ATTACHED invoice travels (S14 #5): drafts saved before the
    // field existed send exactly the same body as before.
    ...(draft.invoiceKey ? { invoiceKey: draft.invoiceKey } : {}),
    // Settlement (S3): always written so a resume can restore the mode.
    paymentMode: draft.paymentMode ?? "PENDING",
    paymentMethod: draft.paymentMethod ?? "CASH_USD",
    initialAmount: draft.initialAmount ?? "",
    items: draft.items,
  };
}

const PAYMENT_MODES = new Set(["PENDING", "PAID", "PARTIAL", "CREDIT"]);

/**
 * Maps a server row onto the screen draft (server `updatedAt` becomes the
 * banner's `savedAt`). Unusable rows answer null instead of throwing: a
 * corrupted account draft must never break the screen.
 */
export function serverDraftFromResponse(
  row: ServerPurchaseDraft | null | undefined,
): PurchaseDraft | null {
  if (!row || typeof row !== "object") return null;

  const payload = row.payload as Partial<PurchaseDraftPayload> | null | undefined;
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) {
    return null;
  }
  if (typeof row.updatedAt !== "string" || !row.updatedAt) return null;

  const paymentMode =
    typeof payload.paymentMode === "string" &&
    PAYMENT_MODES.has(payload.paymentMode)
      ? payload.paymentMode
      : "PENDING";

  return {
    supplierId: typeof payload.supplierId === "string" ? payload.supplierId : "",
    issueDate: typeof payload.issueDate === "string" ? payload.issueDate : "",
    dueDate: typeof payload.dueDate === "string" ? payload.dueDate : "",
    notes: typeof payload.notes === "string" ? payload.notes : "",
    // Rows saved before S14 simply have no invoice attached.
    ...(typeof payload.invoiceKey === "string" && payload.invoiceKey
      ? { invoiceKey: payload.invoiceKey }
      : {}),
    paymentMode,
    paymentMethod:
      typeof payload.paymentMethod === "string" && payload.paymentMethod
        ? payload.paymentMethod
        : "CASH_USD",
    initialAmount:
      typeof payload.initialAmount === "string" ? payload.initialAmount : "",
    items: payload.items as PurchaseLineForm[],
    savedAt: row.updatedAt,
  };
}

/**
 * Resume precedence: the account draft wins (it is the newest source of
 * truth); the station-local copy fills in when the account has none or the
 * request never made it (offline, 401, personal workspace).
 */
export function pickResumeDraft(
  serverDraft: PurchaseDraft | null,
  localDraft: PurchaseDraft | null,
): PurchaseDraft | null {
  return serverDraft ?? localDraft;
}
