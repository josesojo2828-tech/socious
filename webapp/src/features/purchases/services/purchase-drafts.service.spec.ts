import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Account-synced purchase drafts (S13): the service is the thin seam between
 * the screen and /api/purchases/drafts. `apiClient` is mocked and its calls
 * (URL + body) are asserted — including that rejections PROPAGATE, because
 * the nuevo screen falls back to localStorage when the request fails (401,
 * offline, personal workspace).
 */
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/shared/api/api.client", () => ({
  apiClient: {
    get: mocks.get,
    put: mocks.put,
    delete: mocks.delete,
  },
}));

import {
  deletePurchaseDraft,
  fetchPurchaseDraft,
  savePurchaseDraft,
} from "./purchase-drafts.service";

const DRAFT = {
  supplierId: "sup-1",
  issueDate: "2026-11-01",
  dueDate: "2026-11-15",
  notes: "Factura A-123",
  paymentMode: "PENDING" as const,
  paymentMethod: "CASH_USD",
  initialAmount: "",
  items: [
    {
      productId: "prod-1",
      productName: "Harina",
      quantity: "2",
      unitCostUSD: "10.5",
    },
  ],
};

const ROW = {
  id: "draft-1",
  name: null,
  organizationId: "org-1",
  createdById: "u-1",
  payload: {
    supplierId: "sup-1",
    issueDate: "2026-11-01",
    dueDate: "2026-11-15",
    notes: "Factura A-123",
    paymentMode: "PENDING",
    paymentMethod: "CASH_USD",
    initialAmount: "",
    items: DRAFT.items,
  },
  createdAt: "2026-11-01T09:00:00.000Z",
  updatedAt: "2026-11-01T10:30:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchPurchaseDraft — GET /api/purchases/drafts", () => {
  it("maps the account row onto the screen draft shape", async () => {
    mocks.get.mockResolvedValueOnce({ data: ROW });

    await expect(fetchPurchaseDraft()).resolves.toEqual({
      ...DRAFT,
      savedAt: "2026-11-01T10:30:00.000Z",
    });
    expect(mocks.get).toHaveBeenCalledWith("/api/purchases/drafts");
  });

  it("answers null when the account has no draft", async () => {
    mocks.get.mockResolvedValueOnce({ data: null });

    await expect(fetchPurchaseDraft()).resolves.toBeNull();
  });

  it("propagates rejections so the screen can fall back to localStorage", async () => {
    mocks.get.mockRejectedValueOnce(new Error("401 Unauthorized"));

    await expect(fetchPurchaseDraft()).rejects.toThrow("401 Unauthorized");
  });
});

describe("savePurchaseDraft — PUT /api/purchases/drafts", () => {
  it("sends only the payload (never the local savedAt stamp)", async () => {
    mocks.put.mockResolvedValueOnce({ data: ROW });

    const stored = await savePurchaseDraft({ ...DRAFT, savedAt: "irrelevant" });

    expect(mocks.put).toHaveBeenCalledWith("/api/purchases/drafts", {
      payload: {
        supplierId: "sup-1",
        issueDate: "2026-11-01",
        dueDate: "2026-11-15",
        notes: "Factura A-123",
        paymentMode: "PENDING",
        paymentMethod: "CASH_USD",
        initialAmount: "",
        items: DRAFT.items,
      },
    });
    expect(stored).toEqual({ ...DRAFT, savedAt: "2026-11-01T10:30:00.000Z" });
  });

  it("accepts a pre-save draft (no savedAt yet)", async () => {
    mocks.put.mockResolvedValueOnce({ data: ROW });

    await savePurchaseDraft(DRAFT);

    expect(mocks.put).toHaveBeenCalledWith(
      "/api/purchases/drafts",
      expect.objectContaining({ payload: expect.objectContaining({ notes: "Factura A-123" }) }),
    );
  });

  it("propagates rejections so the screen can keep the station copy", async () => {
    mocks.put.mockRejectedValueOnce(new Error("401 Unauthorized"));

    await expect(savePurchaseDraft(DRAFT)).rejects.toThrow("401 Unauthorized");
  });
});

describe("deletePurchaseDraft — DELETE /api/purchases/drafts", () => {
  it("clears MY account draft", async () => {
    mocks.delete.mockResolvedValueOnce({ data: { deleted: true } });

    await expect(deletePurchaseDraft()).resolves.toBeUndefined();
    expect(mocks.delete).toHaveBeenCalledWith("/api/purchases/drafts");
  });

  it("propagates rejections (the screen warns the user)", async () => {
    mocks.delete.mockRejectedValueOnce(new Error("401 Unauthorized"));

    await expect(deletePurchaseDraft()).rejects.toThrow("401 Unauthorized");
  });
});
