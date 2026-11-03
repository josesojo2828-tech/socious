import { describe, expect, it } from "vitest";
import {
  PURCHASE_DRAFT_KEY,
  clearDraft,
  draftToPayload,
  loadDraft,
  pickResumeDraft,
  saveDraft,
  serverDraftFromResponse,
  type PurchaseDraft,
} from "./purchase-draft";

/** Minimal Storage double so node tests never touch a real localStorage. */
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    get size() {
      return map.size;
    },
  };
}

const sampleDraft = (): Omit<PurchaseDraft, "savedAt"> => ({
  supplierId: "sup-1",
  issueDate: "2026-10-31",
  dueDate: "2026-11-15",
  notes: "Factura A-123",
  paymentMode: "CREDIT",
  paymentMethod: "CASH_USD",
  initialAmount: "",
  items: [
    {
      productId: "prod-1",
      productName: "Harina",
      quantity: "2",
      unitCostUSD: "10.5",
    },
    { productName: "Azúcar", quantity: "1", unitCostUSD: "3" },
  ],
});

describe("purchase-draft", () => {
  it("saves and loads a roundtrip, stamping savedAt", () => {
    const storage = memoryStorage();
    saveDraft(sampleDraft(), storage);
    const loaded = loadDraft(storage);
    expect(loaded).not.toBeNull();
    expect(loaded?.supplierId).toBe("sup-1");
    expect(loaded?.items).toEqual(sampleDraft().items);
    expect(typeof loaded?.savedAt).toBe("string");
    expect(Number.isNaN(Date.parse(loaded?.savedAt ?? ""))).toBe(false);
  });

  it("returns null when no draft was stored", () => {
    expect(loadDraft(memoryStorage())).toBeNull();
  });

  it("clears the stored draft", () => {
    const storage = memoryStorage();
    saveDraft(sampleDraft(), storage);
    clearDraft(storage);
    expect(loadDraft(storage)).toBeNull();
    expect(storage.size).toBe(0);
  });

  it("returns null on corrupted JSON without throwing", () => {
    const storage = memoryStorage();
    storage.setItem(PURCHASE_DRAFT_KEY, "{not-json");
    expect(() => loadDraft(storage)).not.toThrow();
    expect(loadDraft(storage)).toBeNull();
  });

  it("returns null when storage is absent (node without localStorage)", () => {
    expect(() => saveDraft(sampleDraft(), null)).not.toThrow();
    expect(loadDraft(null)).toBeNull();
    expect(() => clearDraft(null)).not.toThrow();
  });
});

describe("purchase-draft — account sync payload (S13)", () => {
  it("draftToPayload drops the local stamp and keeps the form fields", () => {
    const payload = draftToPayload({
      ...sampleDraft(),
      savedAt: "2026-11-01T10:00:00.000Z",
    });

    expect(payload).toEqual(sampleDraft());
    expect(payload).not.toHaveProperty("savedAt");
  });

  it("draftToPayload accepts a draft without savedAt (pre-save form)", () => {
    expect(draftToPayload(sampleDraft())).toEqual(sampleDraft());
  });

  it("serverDraftFromResponse maps updatedAt onto savedAt", () => {
    const draft = serverDraftFromResponse({
      id: "draft-1",
      name: null,
      payload: draftToPayload(sampleDraft()),
      createdAt: "2026-11-01T09:00:00.000Z",
      updatedAt: "2026-11-01T10:30:00.000Z",
    });

    expect(draft).toEqual({
      ...sampleDraft(),
      savedAt: "2026-11-01T10:30:00.000Z",
    });
  });

  it("serverDraftFromResponse answers null for an unusable row, never throws", () => {
    const updatedAt = "2026-11-01T10:30:00.000Z";

    expect(serverDraftFromResponse(null)).toBeNull();
    expect(serverDraftFromResponse(undefined)).toBeNull();
    expect(serverDraftFromResponse({} as never)).toBeNull();
    expect(
      serverDraftFromResponse({
        id: "draft-1",
        name: null,
        payload: null,
        createdAt: "2026-11-01T09:00:00.000Z",
        updatedAt,
      } as never),
    ).toBeNull();
    expect(
      serverDraftFromResponse({
        id: "draft-1",
        name: null,
        payload: { supplierId: "sup-1", items: "nope" },
        createdAt: "2026-11-01T09:00:00.000Z",
        updatedAt,
      } as never),
    ).toBeNull();
    expect(() => serverDraftFromResponse({} as never)).not.toThrow();
  });

  it("pickResumeDraft prefers the account draft and falls back to the station copy", () => {
    const local: PurchaseDraft = {
      ...sampleDraft(),
      notes: "Del equipo",
      savedAt: "2026-10-30T08:00:00.000Z",
    };
    const server: PurchaseDraft = {
      ...sampleDraft(),
      notes: "De la cuenta",
      savedAt: "2026-11-01T10:00:00.000Z",
    };

    expect(pickResumeDraft(server, local)).toEqual(server);
    expect(pickResumeDraft(null, local)).toEqual(local);
    expect(pickResumeDraft(server, null)).toEqual(server);
    expect(pickResumeDraft(null, null)).toBeNull();
  });
});

describe("purchase-draft — attached invoice (S14 #5)", () => {
  it("draftToPayload forwards the invoiceKey only when one is attached", () => {
    expect(draftToPayload(sampleDraft())).not.toHaveProperty("invoiceKey");
    expect(
      draftToPayload({ ...sampleDraft(), invoiceKey: "purchase_1_a.pdf" }),
    ).toEqual({ ...sampleDraft(), invoiceKey: "purchase_1_a.pdf" });
  });

  it("serverDraftFromResponse restores the invoiceKey from the account row", () => {
    const draft = serverDraftFromResponse({
      id: "draft-1",
      name: null,
      payload: {
        ...draftToPayload(sampleDraft()),
        invoiceKey: "purchase_1_a.pdf",
      },
      createdAt: "2026-11-01T09:00:00.000Z",
      updatedAt: "2026-11-01T10:30:00.000Z",
    });

    expect(draft?.invoiceKey).toBe("purchase_1_a.pdf");
    expect(draft?.items).toEqual(sampleDraft().items);
  });

  it("keeps loading drafts saved before the invoice field existed", () => {
    const draft = serverDraftFromResponse({
      id: "draft-1",
      name: null,
      payload: draftToPayload(sampleDraft()),
      createdAt: "2026-11-01T09:00:00.000Z",
      updatedAt: "2026-11-01T10:30:00.000Z",
    });

    expect(draft).not.toBeNull();
    expect(draft?.invoiceKey).toBeUndefined();
  });
});

describe("purchase-draft — settlement mode (S3)", () => {
  it("forwards paymentMode, paymentMethod and initialAmount", () => {
    const payload = draftToPayload({
      ...sampleDraft(),
      paymentMode: "PARTIAL",
      paymentMethod: "ZELLE",
      initialAmount: "10",
    });
    expect(payload.paymentMode).toBe("PARTIAL");
    expect(payload.paymentMethod).toBe("ZELLE");
    expect(payload.initialAmount).toBe("10");
  });

  it("defaults missing payment fields when restoring a pre-S3 draft", () => {
    const { paymentMode: _m, paymentMethod: _p, initialAmount: _i, ...legacy } =
      sampleDraft();
    const draft = serverDraftFromResponse({
      id: "draft-1",
      name: null,
      payload: legacy,
      createdAt: "2026-11-01T09:00:00.000Z",
      updatedAt: "2026-11-01T10:30:00.000Z",
    });

    expect(draft).not.toBeNull();
    expect(draft?.paymentMode).toBe("PENDING");
    expect(draft?.paymentMethod).toBe("CASH_USD");
    expect(draft?.initialAmount).toBe("");
  });

  it("rejects an unknown paymentMode and falls back to PENDING", () => {
    const draft = serverDraftFromResponse({
      id: "draft-1",
      name: null,
      payload: { ...sampleDraft(), paymentMode: "NOPE" as never },
      createdAt: "2026-11-01T09:00:00.000Z",
      updatedAt: "2026-11-01T10:30:00.000Z",
    });
    expect(draft?.paymentMode).toBe("PENDING");
  });
});
