import { describe, expect, it } from "vitest";
import {
  buildOfferCreatePayload,
  buildOfferUpdatePayload,
  emptyOfferForm,
  formatOfferDate,
  localDateOnly,
  offerStatus,
  offerToForm,
  planGrantsOffers,
  validateOfferForm,
  type OfferForm,
} from "./offer-form";

/** 15 de octubre de 2026, mediodía — hora local, para no depender de la TZ. */
const NOW = new Date(2026, 9, 15, 12, 0, 0);

const validForm = (): OfferForm => ({
  name: "  Semana del cliente  ",
  slogan: " Hasta 30% en seleccionados ",
  bannerKey: "offer_123.png",
  expiresAt: "2026-10-20",
  productIds: ["p1", "p2"],
});

describe("localDateOnly / formatOfferDate", () => {
  it("formats a Date as yyyy-mm-dd using its LOCAL calendar parts", () => {
    expect(localDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(localDateOnly(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("renders the stored ISO date as dd/mm/yyyy from its UTC date part", () => {
    // The payload stores the chosen day at UTC midnight, so slicing the UTC
    // date is the calendar day the merchant picked — never the day before.
    expect(formatOfferDate("2026-10-31T00:00:00.000Z")).toBe("31/10/2026");
  });
});

describe("emptyOfferForm / offerToForm", () => {
  it("starts with no values and no products", () => {
    expect(emptyOfferForm()).toEqual({
      name: "",
      slogan: "",
      bannerKey: "",
      expiresAt: "",
      productIds: [],
    });
  });

  it("prefills the form from an offer, keeping the calendar day and product ids", () => {
    const form = offerToForm({
      id: "off-1",
      name: "Black Friday",
      slogan: null,
      bannerKey: null,
      expiresAt: "2026-11-28T00:00:00.000Z",
      active: true,
      createdAt: "2026-10-01T00:00:00.000Z",
      items: [
        {
          id: "it-1",
          productId: "prod-1",
          product: { id: "prod-1", name: "Café", sku: "CAF-1" },
        },
      ],
    });
    expect(form).toEqual({
      name: "Black Friday",
      slogan: "",
      bannerKey: "",
      expiresAt: "2026-11-28",
      productIds: ["prod-1"],
    });
  });
});

describe("validateOfferForm", () => {
  it("rejects a blank name", () => {
    const form = validForm();
    form.name = "   ";
    expect(validateOfferForm(form, NOW)).toBe("El nombre es obligatorio.");
  });

  it("rejects a name over 120 characters after trimming", () => {
    const form = validForm();
    form.name = ` ${"x".repeat(121)} `;
    expect(validateOfferForm(form, NOW)).toBe(
      "El nombre no puede superar 120 caracteres.",
    );
  });

  it("rejects a slogan over 200 characters but allows an empty slogan", () => {
    const form = validForm();
    form.slogan = "x".repeat(201);
    expect(validateOfferForm(form, NOW)).toBe(
      "El slogan no puede superar 200 caracteres.",
    );

    form.slogan = "";
    expect(validateOfferForm(form, NOW)).toBeNull();
  });

  it("rejects a missing expiry date", () => {
    const form = validForm();
    form.expiresAt = "";
    expect(validateOfferForm(form, NOW)).toBe(
      "La fecha de vencimiento es obligatoria.",
    );
  });

  it("rejects an unparseable expiry date", () => {
    const form = validForm();
    form.expiresAt = "mañana";
    expect(validateOfferForm(form, NOW)).toBe(
      "La fecha de vencimiento no es válida.",
    );
  });

  it("rejects a date before today and accepts today or later", () => {
    const form = validForm();
    form.expiresAt = "2026-10-14";
    expect(validateOfferForm(form, NOW)).toBe(
      "La fecha de vencimiento no puede ser anterior a hoy.",
    );

    form.expiresAt = "2026-10-15"; // hoy
    expect(validateOfferForm(form, NOW)).toBeNull();

    form.expiresAt = "2026-10-16"; // mañana
    expect(validateOfferForm(form, NOW)).toBeNull();
  });

  it("rejects a form without products", () => {
    const form = validForm();
    form.productIds = [];
    expect(validateOfferForm(form, NOW)).toBe(
      "La oferta necesita al menos un producto.",
    );
  });

  it("reports the name problem first when several fields are wrong", () => {
    const form = validForm();
    form.name = "";
    form.expiresAt = "";
    form.productIds = [];
    expect(validateOfferForm(form, NOW)).toBe("El nombre es obligatorio.");
  });

  it("accepts the fully valid form", () => {
    expect(validateOfferForm(validForm(), NOW)).toBeNull();
  });
});

describe("buildOfferCreatePayload", () => {
  it("trims the name and slogan and sends the ISO instant of the chosen day", () => {
    expect(buildOfferCreatePayload(validForm())).toEqual({
      name: "Semana del cliente",
      slogan: "Hasta 30% en seleccionados",
      bannerKey: "offer_123.png",
      expiresAt: "2026-10-20T00:00:00.000Z",
      items: ["p1", "p2"],
    });
  });

  it("omits blank optional fields instead of sending empty strings", () => {
    const form = validForm();
    form.slogan = "   ";
    form.bannerKey = "";
    const payload = buildOfferCreatePayload(form);
    expect(payload).not.toHaveProperty("slogan");
    expect(payload).not.toHaveProperty("bannerKey");
  });
});

describe("buildOfferUpdatePayload", () => {
  it("sends every field, using empty strings to clear slogan and banner", () => {
    expect(buildOfferUpdatePayload(validForm())).toEqual({
      name: "Semana del cliente",
      slogan: "Hasta 30% en seleccionados",
      bannerKey: "offer_123.png",
      expiresAt: "2026-10-20T00:00:00.000Z",
      items: ["p1", "p2"],
    });

    const cleared = validForm();
    cleared.slogan = " ";
    cleared.bannerKey = "";
    expect(buildOfferUpdatePayload(cleared)).toEqual({
      name: "Semana del cliente",
      slogan: "",
      bannerKey: "",
      expiresAt: "2026-10-20T00:00:00.000Z",
      items: ["p1", "p2"],
    });
  });
});

describe("planGrantsOffers", () => {
  it("allows the screens when OFFERS is one of the plan modules", () => {
    expect(planGrantsOffers(["CATALOG_ONLINE", "OFFERS"])).toBe(true);
  });

  it("locks the screens when the plan lacks OFFERS or the list is unknown", () => {
    expect(planGrantsOffers(["CATALOG_ONLINE"])).toBe(false);
    expect(planGrantsOffers([])).toBe(false);
    expect(planGrantsOffers(undefined)).toBe(false);
    expect(planGrantsOffers(null)).toBe(false);
  });
});

describe("offerStatus", () => {
  const future = { expiresAt: "2026-10-20T00:00:00.000Z" };

  it("marks an active offer whose day has not arrived as Activa", () => {
    expect(offerStatus({ ...future, active: true }, NOW)).toBe("Activa");
  });

  it("marks a not-yet-expired disabled offer as Inactiva", () => {
    expect(offerStatus({ ...future, active: false }, NOW)).toBe("Inactiva");
  });

  it("marks an offer from yesterday as Vencida", () => {
    expect(
      offerStatus({ expiresAt: "2026-10-14T00:00:00.000Z", active: true }, NOW),
    ).toBe("Vencida");
  });

  it("keeps an offer valid through its whole day and expires it the next day", () => {
    // NOW is 2026-10-15 local: the offer expiring on the 15th is still Activa.
    expect(
      offerStatus({ expiresAt: "2026-10-15T00:00:00.000Z", active: true }, NOW),
    ).toBe("Activa");
    expect(
      offerStatus({ expiresAt: "2026-10-14T00:00:00.000Z", active: true }, NOW),
    ).toBe("Vencida");
  });

  it("reports Vencida over Inactiva when the offer is also expired", () => {
    expect(
      offerStatus({ expiresAt: "2026-10-14T00:00:00.000Z", active: false }, NOW),
    ).toBe("Vencida");
  });
});
