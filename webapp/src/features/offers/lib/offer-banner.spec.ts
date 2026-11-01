import { describe, expect, it } from "vitest";
import {
  OFFER_UPLOAD_PREFIX,
  buildOfferBannerForm,
  offerBannerSrc,
} from "./offer-banner";

describe("buildOfferBannerForm", () => {
  it("sends the file under the offer prefix (the backend allowlist key)", () => {
    const file = new File(["banner-bytes"], "banner.png", {
      type: "image/png",
    });
    const form = buildOfferBannerForm(file);
    expect(form.get("prefix")).toBe("offer");
    expect(form.get("prefix")).toBe(OFFER_UPLOAD_PREFIX);
    expect(form.get("file")).toBe(file);
  });
});

describe("offerBannerSrc", () => {
  it("renders the key through the public file route", () => {
    expect(offerBannerSrc("offer_1717_a1b2c.png")).toBe(
      "/api/file/public/offer_1717_a1b2c.png",
    );
  });

  it("trims stray whitespace around the key", () => {
    expect(offerBannerSrc("  offer_x.png ")).toBe(
      "/api/file/public/offer_x.png",
    );
  });
});
