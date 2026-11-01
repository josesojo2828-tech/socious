import { apiClient } from "@/shared/api/api.client";
import { PurchaseEndpoints } from "./purchases.endpoints";
import {
  draftToPayload,
  serverDraftFromResponse,
  type PurchaseDraft,
  type ServerPurchaseDraft,
} from "../lib/purchase-draft";

/**
 * Account-synced purchase drafts (S13): thin async seam over
 * /api/purchases/drafts. Every function answers the SAME draft shape the
 * screen already uses, and every rejection PROPAGATES — callers fall back to
 * the localStorage copy (offline / 401 / personal workspace).
 */

/** MY account draft, or null when none exists. */
export async function fetchPurchaseDraft(): Promise<PurchaseDraft | null> {
  const { data } = await apiClient.get<ServerPurchaseDraft | null>(
    PurchaseEndpoints.drafts,
  );
  return serverDraftFromResponse(data);
}

/**
 * Upserts MY account draft and answers the stored row (its `updatedAt`
 * becomes the draft's `savedAt`, which the resume banner shows).
 */
export async function savePurchaseDraft(
  draft: PurchaseDraft | Omit<PurchaseDraft, "savedAt">,
): Promise<PurchaseDraft | null> {
  const { data } = await apiClient.put<ServerPurchaseDraft>(
    PurchaseEndpoints.drafts,
    { payload: draftToPayload(draft) },
  );
  return serverDraftFromResponse(data);
}

/** Discards MY account draft (idempotent on the backend). */
export async function deletePurchaseDraft(): Promise<void> {
  await apiClient.delete(PurchaseEndpoints.drafts);
}
