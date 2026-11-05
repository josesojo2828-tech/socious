import { describe, expect, it } from "vitest";
import { buildPublicOrderPayload, validateCheckout } from "./order-checkout";
import type { CheckoutConfig, CheckoutForm } from "../types/checkout.type";
import type { CartLine } from "../../sales/lib/pos-form";

const config: CheckoutConfig = {
  store: {
    name: "Socius Demo",
    slug: "socius-demo",
    logoUrl: null,
    whatsapp: null,
  },
  fulfillmentTypes: ["PICKUP", "DELIVERY", "SHIPPING"],
  coordination: "WHATSAPP",
  delivery: { enabled: true, feeUSD: 3.5 },
  agencies: [{ id: "a1", key: "ZOOM", name: "Zoom" }],
};

const form = (overrides: Partial<CheckoutForm> = {}): CheckoutForm => ({
  customerName: "  Ana Pérez ",
  customerEmail: "  ana@cliente.test ",
  fulfillmentType: "PICKUP",
  ...overrides,
});

const cart: CartLine[] = [
  {
    productId: "p-1",
    productName: "Arroz 1kg",
    unitPriceUSD: 2,
    taxRate: 0,
    quantity: 3,
  },
];

describe("order-checkout (S12)", () => {
  describe("validateCheckout — shop without delivery types", () => {
  it("accepts the order so it can be coordinated with the seller", () => {
    expect(
      validateCheckout(form(), { ...config, fulfillmentTypes: [] }),
    ).toBeNull();
  });
});

describe("validateCheckout", () => {
    it("accepts a complete pickup", () => {
      expect(validateCheckout(form(), config)).toBeNull();
    });

    it("requires name and a well-formed email", () => {
      expect(validateCheckout(form({ customerName: " " }), config)).toMatch(
        /nombre/i,
      );
      expect(validateCheckout(form({ customerEmail: "" }), config)).toMatch(
        /correo/i,
      );
      expect(
        validateCheckout(form({ customerEmail: "no-correo" }), config),
      ).toMatch(/formato/i);
    });

    it("rejects a type the shop did not enable", () => {
      const limited: CheckoutConfig = { ...config, fulfillmentTypes: ["PICKUP"] };
      expect(validateCheckout(form({ fulfillmentType: "SHIPPING" }), limited)).toMatch(
        /no está habilitado/i,
      );
    });

    it("rejects delivery while the switch is off", () => {
      const noDelivery: CheckoutConfig = {
        ...config,
        delivery: { enabled: false, feeUSD: 0 },
      };
      expect(
        validateCheckout(
          form({ fulfillmentType: "DELIVERY", customerAddress: "Calle 5" }),
          noDelivery,
        ),
      ).toMatch(/no ofrece delivery/i);
    });

    it("requires an address for delivery and shipping", () => {
      expect(
        validateCheckout(form({ fulfillmentType: "DELIVERY" }), config),
      ).toMatch(/dirección/i);
      expect(
        validateCheckout(
          form({ fulfillmentType: "SHIPPING" }),
          config,
        ),
      ).toMatch(/dirección/i);
    });

    it("requires an agency for shipping", () => {
      expect(
        validateCheckout(
          form({
            fulfillmentType: "SHIPPING",
            customerAddress: "Calle 5",
          }),
          config,
        ),
      ).toMatch(/agencia/i);
      expect(
        validateCheckout(
          form({
            fulfillmentType: "SHIPPING",
            customerAddress: "Calle 5",
            agencyId: "a1",
          }),
          config,
        ),
      ).toBeNull();
    });

    it("lets the backend decide while the config is still loading", () => {
      expect(validateCheckout(form(), null)).toBeNull();
    });
  });

  describe("buildPublicOrderPayload", () => {
    it("maps the cart to product + quantity and trims the contact", () => {
      const payload = buildPublicOrderPayload(
        "socius-demo",
        form({
          customerPhone: " +58 424-0001112 ",
          customerAddress: "  Calle 5  ",
          fulfillmentType: "DELIVERY",
          notes: "  timbre roto  ",
        }),
        cart,
      );

      expect(payload).toEqual({
        organizationSlug: "socius-demo",
        customerName: "Ana Pérez",
        customerEmail: "ana@cliente.test",
        customerPhone: "+58 424-0001112",
        customerAddress: "Calle 5",
        notes: "timbre roto",
        fulfillmentType: "DELIVERY",
        items: [{ productId: "p-1", quantity: 3 }],
      });
    });

    it("never sends coordination or an empty agency", () => {
      const payload = buildPublicOrderPayload("tienda", form(), cart);

      expect(payload).not.toHaveProperty("coordination");
      expect(payload).not.toHaveProperty("agencyId");
      expect(payload).not.toHaveProperty("customerPhone");
    });

    it("keeps the agency when shipping", () => {
      const payload = buildPublicOrderPayload(
        "tienda",
        form({
          fulfillmentType: "SHIPPING",
          customerAddress: "Calle 5",
          agencyId: "a1",
        }),
        cart,
      );

      expect(payload.agencyId).toBe("a1");
    });
  });
});
