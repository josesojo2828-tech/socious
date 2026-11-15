/**
 * Pure helpers for the manual opening balance (S2/S4). No React, no fetch:
 * the same rules run in the form and under vitest/node. They mirror
 * `serverapp/src/modules/initial-load/initial-load.dto.ts` and
 * `InitialLoadService.createManual`; the server messages are copied verbatim
 * so a rejection from either side reads the same.
 */

/** Credit cadences accepted by `POST /api/initial-load/manual`. */
export type ManualCadence = "QUINCENAL" | "MENSUAL" | "CADA_N_DIAS";

/** `none` means no cadence: the account stays open and never turns overdue. */
export type ManualCadenceChoice = "none" | ManualCadence;

/** Select options for the cadence field, in display order. */
export const MANUAL_CADENCE_OPTIONS: ReadonlyArray<{
  value: ManualCadenceChoice;
  label: string;
}> = [
  { value: "none", label: "Sin vencimiento" },
  { value: "QUINCENAL", label: "Quincenal" },
  { value: "MENSUAL", label: "Mensual" },
  { value: "CADA_N_DIAS", label: "Cada N días" },
];

/**
 * Editable state of the form. Numeric fields are strings because they come
 * from inputs; `buildManualPayload` is the only place that converts them.
 */
export interface ManualReceivableForm {
  /** Selected client; when empty the client is created from the fields below. */
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  /** UI mode: shows the creation fields instead of the search box. */
  createClient: boolean;
  /** Selected product; when empty the product is created from the fields below. */
  productId: string;
  productName: string;
  productSku: string;
  /** UI mode: shows the creation fields instead of the search box. */
  createProduct: boolean;
  quantity: string;
  unitPriceUSD: string;
  /** `YYYY-MM-DD`; today by default. Empty means "today" to the backend. */
  issueDate: string;
  dueDate: string;
  cadence: ManualCadenceChoice;
  everyNDays: string;
  paidAmount: string;
  notes: string;
}

/** `POST /api/initial-load/manual` body after conversion. */
export interface ManualReceivablePayload {
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  productId?: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  unitPriceUSD: number;
  issueDate?: string;
  dueDate?: string;
  cadence?: ManualCadence;
  everyNDays?: number;
  paidAmount?: number;
  notes?: string;
}

/** `POST /api/initial-load/manual` response. */
export interface ManualReceivableResult {
  saleId: string;
  saleNumber: string;
  client: { id: string; name: string; created: boolean };
  product: { id: string; name: string; sku: string; created: boolean };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local calendar date as `YYYY-MM-DD` (never UTC: the day must not shift). */
export function todayDateOnly(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
    now.getDate(),
  )}`;
}

/** Strict `YYYY-MM-DD` check: rejects impossible days such as `2026-02-31`. */
function isDateOnly(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function isFutureDate(value: string, now: Date = new Date()): boolean {
  return value > todayDateOnly(now);
}

/** Rounds like the backend (`round2`), so the preview matches the sale. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** A blank form dated today, with no client, product or cadence. */
export function emptyManualForm(): ManualReceivableForm {
  return {
    clientId: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    createClient: false,
    productId: "",
    productName: "",
    productSku: "",
    createProduct: false,
    quantity: "",
    unitPriceUSD: "",
    issueDate: todayDateOnly(),
    dueDate: "",
    cadence: "none",
    everyNDays: "",
    paidAmount: "",
    notes: "",
  };
}

/** Quantity × unit price, rounded to 2 decimals; 0 when either side is unusable. */
export function manualLineTotal(form: ManualReceivableForm): number {
  const quantity = Number(form.quantity);
  const unitPrice = Number(form.unitPriceUSD);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
  return round2(quantity * unitPrice);
}

/**
 * Field → message, empty when the form can be submitted. Mirrors the server
 * rules; the messages are the ones the backend returns verbatim.
 */
export function validateManualForm(
  form: ManualReceivableForm,
): Record<string, string> {
  const errors: Record<string, string> = {};

  const clientId = form.clientId.trim();
  const clientName = form.clientName.trim();
  if (!clientId && !clientName) {
    errors.client = "Indica un cliente o un nombre de cliente.";
  }

  const clientEmail = form.clientEmail.trim();
  if (!clientId && clientEmail !== "" && !EMAIL_PATTERN.test(clientEmail)) {
    errors.clientEmail = "El correo no tiene un formato válido.";
  }

  const productId = form.productId.trim();
  const productName = form.productName.trim();
  if (!productId && !productName) {
    errors.product = "Indica un producto o un nombre de producto.";
  }

  const quantity = Number(form.quantity);
  if (form.quantity.trim() === "" || !Number.isFinite(quantity) || quantity <= 0) {
    errors.quantity = "La cantidad debe ser mayor que cero.";
  }

  const unitPrice = Number(form.unitPriceUSD);
  if (
    form.unitPriceUSD.trim() === "" ||
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0
  ) {
    errors.unitPriceUSD = "El precio unitario debe ser mayor que cero.";
  }

  const paidRaw = form.paidAmount.trim();
  if (paidRaw !== "") {
    const paid = Number(paidRaw);
    if (!Number.isFinite(paid)) {
      errors.paidAmount = "El monto pagado debe ser numérico.";
    } else if (paid < 0) {
      errors.paidAmount = "El monto pagado no puede ser negativo.";
    } else if (
      errors.quantity === undefined &&
      errors.unitPriceUSD === undefined &&
      paid > manualLineTotal(form) + 1e-6
    ) {
      errors.paidAmount = "El monto pagado no puede superar el total.";
    }
  }

  const issueDate = form.issueDate.trim();
  if (issueDate !== "") {
    if (!isDateOnly(issueDate)) {
      errors.issueDate = "La fecha no es válida.";
    } else if (isFutureDate(issueDate)) {
      errors.issueDate = "La fecha no puede ser futura.";
    }
  }

  const dueDate = form.dueDate.trim();
  if (dueDate !== "" && !isDateOnly(dueDate)) {
    errors.dueDate = "El vencimiento no es válido.";
  }

  // An explicit due date wins on the server, so the cadence fields are only
  // meaningful (and only validated) when no date is set.
  if (dueDate === "" && form.cadence === "CADA_N_DIAS") {
    const raw = form.everyNDays.trim();
    const days = Number(raw);
    if (raw === "" || !Number.isInteger(days) || days < 1 || days > 365) {
      errors.everyNDays = "Los días deben ser un entero entre 1 y 365.";
    }
  }

  return errors;
}

/** True only when every field rule passes. */
export function canSubmitManual(form: ManualReceivableForm): boolean {
  return Object.keys(validateManualForm(form)).length === 0;
}

/**
 * Trims and converts the form into the API body. Optional blanks stay absent;
 * a selected identifier wins over the creation fields, matching the server's
 * `id > match > create` order. An explicit due date makes the cadence moot.
 */
export function buildManualPayload(
  form: ManualReceivableForm,
): ManualReceivablePayload {
  const payload: ManualReceivablePayload = {
    quantity: Number(form.quantity),
    unitPriceUSD: Number(form.unitPriceUSD),
  };

  const clientId = form.clientId.trim();
  if (clientId) {
    payload.clientId = clientId;
  } else {
    const name = form.clientName.trim();
    if (name) payload.clientName = name;
    const phone = form.clientPhone.trim();
    if (phone) payload.clientPhone = phone;
    const email = form.clientEmail.trim();
    if (email) payload.clientEmail = email;
  }

  const productId = form.productId.trim();
  if (productId) {
    payload.productId = productId;
  } else {
    const name = form.productName.trim();
    if (name) payload.productName = name;
    const sku = form.productSku.trim();
    if (sku) payload.productSku = sku;
  }

  const issueDate = form.issueDate.trim();
  if (issueDate) payload.issueDate = issueDate;

  const dueDate = form.dueDate.trim();
  if (dueDate) {
    payload.dueDate = dueDate;
  } else if (form.cadence !== "none") {
    payload.cadence = form.cadence;
    if (form.cadence === "CADA_N_DIAS") {
      payload.everyNDays = Number(form.everyNDays);
    }
  }

  const paidAmount = form.paidAmount.trim();
  if (paidAmount !== "") payload.paidAmount = Number(paidAmount);

  const notes = form.notes.trim();
  if (notes) payload.notes = notes;

  return payload;
}
