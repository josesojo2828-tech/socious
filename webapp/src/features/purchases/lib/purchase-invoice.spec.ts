import { describe, expect, it } from "vitest";
import {
  INVOICE_MAX_BYTES,
  INVOICE_UPLOAD_PREFIX,
  buildInvoiceUploadForm,
  invoiceDisplayName,
  invoiceFileError,
  isImageInvoiceKey,
} from "./purchase-invoice";

/**
 * Invoice attachment (S14 #5): optional photo/PDF of the supplier's invoice.
 * The client gates format and size BEFORE the multipart upload; the storage
 * prefix is always `purchase` (a private key — never on the public asset
 * allowlist).
 */
describe("purchase-invoice (S14 #5)", () => {
  describe("invoiceFileError", () => {
    it("accepts images and PDFs up to 5MB", () => {
      expect(invoiceFileError({ type: "application/pdf", size: 2048 })).toBeNull();
      expect(invoiceFileError({ type: "image/png", size: 2048 })).toBeNull();
      expect(
        invoiceFileError({ type: "image/jpeg", size: 4 * 1024 * 1024 }),
      ).toBeNull();
      expect(
        invoiceFileError({ type: "image/webp", size: INVOICE_MAX_BYTES }),
      ).toBeNull();
    });

    it("rejects any other format naming what is allowed", () => {
      expect(invoiceFileError({ type: "text/plain", size: 10 })).toMatch(
        /imagen o un PDF/,
      );
      expect(invoiceFileError({ type: "video/mp4", size: 10 })).toMatch(
        /imagen o un PDF/,
      );
    });

    it("rejects files over the 5MB limit", () => {
      expect(
        invoiceFileError({
          type: "application/pdf",
          size: INVOICE_MAX_BYTES + 1,
        }),
      ).toMatch(/5MB/);
    });
  });

  describe("buildInvoiceUploadForm", () => {
    it("keeps the file and the `purchase` prefix in one multipart body", () => {
      const file = new File(["%PDF-1.4"], "factura.pdf", {
        type: "application/pdf",
      });
      const form = buildInvoiceUploadForm(file);

      expect(form.get("file")).toBe(file);
      expect(form.get("prefix")).toBe(INVOICE_UPLOAD_PREFIX);
      expect(form.get("prefix")).toBe("purchase");
      expect([...form.keys()].sort()).toEqual(["file", "prefix"]);
    });
  });

  describe("isImageInvoiceKey", () => {
    it("detects image extensions case-insensitively (ficha renders <img>)", () => {
      expect(isImageInvoiceKey("purchase_1730_a1b2c3.png")).toBe(true);
      expect(isImageInvoiceKey("purchase_1730_a1b2c3.jpg")).toBe(true);
      expect(isImageInvoiceKey("purchase_1730_a1b2c3.jpeg")).toBe(true);
      expect(isImageInvoiceKey("purchase_1730_a1b2c3.WEBP")).toBe(true);
    });

    it("treats PDFs and unknown keys as links, not images", () => {
      expect(isImageInvoiceKey("purchase_1730_a1b2c3.pdf")).toBe(false);
      expect(isImageInvoiceKey("purchase_1730_a1b2c3")).toBe(false);
      expect(isImageInvoiceKey("")).toBe(false);
    });
  });

  describe("invoiceDisplayName", () => {
    it("prefers the original file name and falls back to the storage key", () => {
      expect(
        invoiceDisplayName("purchase_1730_a1b2c3.pdf", "Factura proveedor.pdf"),
      ).toBe("Factura proveedor.pdf");
      expect(invoiceDisplayName("purchase_1730_a1b2c3.pdf")).toBe(
        "purchase_1730_a1b2c3.pdf",
      );
      expect(invoiceDisplayName("purchase_1730_a1b2c3.pdf", null)).toBe(
        "purchase_1730_a1b2c3.pdf",
      );
    });
  });
});
