import { describe, expect, it } from "vitest";
import {
  buildImageUploadForm,
  canUploadImage,
  publicFileUrl,
} from "./product-images";

describe("product-images (S8)", () => {
  describe("publicFileUrl", () => {
    it("renders the key through the public route, never the minio host", () => {
      expect(publicFileUrl("product_1712_a1b2c3.jpg")).toBe(
        "/api/file/public/product_1712_a1b2c3.jpg",
      );
    });

    it("trims stray whitespace around the key", () => {
      expect(publicFileUrl("  product_x.png  ")).toBe(
        "/api/file/public/product_x.png",
      );
    });
  });

  describe("buildImageUploadForm", () => {
    it("sends the file under `file` and the product storage prefix", () => {
      const file = new File(["bytes"], "foto.png", { type: "image/png" });
      const form = buildImageUploadForm(file);

      expect(form.get("file")).toBe(file);
      expect(form.get("prefix")).toBe("product");
    });

    it("keeps both parts on the same body (multipart, one request)", () => {
      const file = new File(["bytes"], "foto.webp", { type: "image/webp" });
      const form = buildImageUploadForm(file);

      expect([...form.keys()].sort()).toEqual(["file", "prefix"]);
    });
  });

  describe("canUploadImage", () => {
    it("allows uploads below the plan limit only", () => {
      expect(canUploadImage(0, 1)).toBe(true);
      expect(canUploadImage(1, 1)).toBe(false);
      expect(canUploadImage(3, 5)).toBe(true);
      expect(canUploadImage(5, 5)).toBe(false);
    });

    it("never allows uploads when the limit is unknown (0)", () => {
      expect(canUploadImage(0, 0)).toBe(false);
    });
  });
});
