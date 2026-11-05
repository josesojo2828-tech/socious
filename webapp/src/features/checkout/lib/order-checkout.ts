import type { CartLine } from "../../sales/lib/pos-form";
import type { CheckoutConfig, CheckoutForm } from "../types/checkout.type";

/**
 * Public checkout logic (S12): what the visitor must fill and the exact body
 * POST /api/orders/public accepts. The backend re-validates everything — this
 * is the fast feedback the storefront shows first.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCheckout(
  form: CheckoutForm,
  config: CheckoutConfig | null,
): string | null {
  if (!form.customerName?.trim()) return "Tu nombre es obligatorio.";
  if (!form.customerPhone?.trim()) {
    return "Dejanos tu WhatsApp para contactarte.";
  }
  // Email is optional now; validate it only when the customer typed one.
  if (form.customerEmail?.trim() && !EMAIL_PATTERN.test(form.customerEmail.trim())) {
    return "El correo no tiene un formato válido.";
  }

  if (!config) return null; // config still loading: the backend has the say

  // No type configured = "coordinate with the seller": the order still goes
  // through and the backend records it as a pickup.
  if (
    config.fulfillmentTypes.length > 0 &&
    !config.fulfillmentTypes.includes(form.fulfillmentType)
  ) {
    return "Ese tipo de entrega no está habilitado en esta tienda.";
  }

  if (form.fulfillmentType === "DELIVERY" && !config.delivery.enabled) {
    return "Esta tienda no ofrece delivery ahora mismo.";
  }

  const needsAddress =
    form.fulfillmentType === "DELIVERY" || form.fulfillmentType === "SHIPPING";
  if (needsAddress && !form.customerAddress?.trim()) {
    return "Necesitamos una dirección para esa entrega.";
  }

  if (form.fulfillmentType === "SHIPPING" && !form.agencyId) {
    return "Elegí la agencia de envío.";
  }

  return null;
}

/** The cart only carries what the API needs: product + quantity (S9). */
export function buildPublicOrderPayload(
  organizationSlug: string,
  form: CheckoutForm,
  cart: CartLine[],
): Record<string, unknown> {
  return {
    organizationSlug,
    customerName: form.customerName.trim(),
    ...(form.customerEmail?.trim()
      ? { customerEmail: form.customerEmail.trim() }
      : {}),
    ...(form.customerPhone?.trim()
      ? { customerPhone: form.customerPhone.trim() }
      : {}),
    ...(form.customerAddress?.trim()
      ? { customerAddress: form.customerAddress.trim() }
      : {}),
    ...(form.notes?.trim() ? { notes: form.notes.trim() } : {}),
    fulfillmentType: form.fulfillmentType,
    ...(form.agencyId ? { agencyId: form.agencyId } : {}),
    // `coordination` is omitted: the backend applies the shop default.
    items: cart.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    })),
  };
}
