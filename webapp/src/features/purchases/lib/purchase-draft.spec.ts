import { describe, expect, it } from "vitest";
import {
  PURCHASE_DRAFT_KEY,
  clearDraft,
  loadDraft,
  saveDraft,
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
