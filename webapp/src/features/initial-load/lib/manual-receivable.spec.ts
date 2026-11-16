import { describe, expect, it } from "vitest";
import {
  buildManualPayload,
  canSubmitManual,
  emptyManualForm,
  manualLineTotal,
  validateManualForm,
  type ManualReceivableForm,
} from "./manual-receivable";

/** A complete, valid entry; each test overrides only what it exercises. */
function form(overrides: Partial<ManualReceivableForm> = {}): ManualReceivableForm {
  return {
    clientId: "",
    clientName: "Ana Pérez",
    clientPhone: "",
    clientEmail: "",
    createClient: true,
    productId: "",
    productName: "Arroz 1 kg",
    productSku: "",
    createProduct: true,
    quantity: "2",
    unitPriceUSD: "10.5",
    issueDate: "2026-01-15",
    dueDate: "",
    cadence: "none",
    everyNDays: "",
    paidAmount: "",
    notes: "",
    ...overrides,
  };
}

function localToday(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

describe("emptyManualForm", () => {
  it("starts today with no selection, no cadence and blank fields", () => {
    const empty = emptyManualForm();

    expect(empty.issueDate).toBe(localToday());
    expect(empty.cadence).toBe("none");
    expect(empty.clientId).toBe("");
    expect(empty.clientName).toBe("");
    expect(empty.productId).toBe("");
    expect(empty.productName).toBe("");
    expect(empty.quantity).toBe("");
    expect(empty.unitPriceUSD).toBe("");
    expect(empty.paidAmount).toBe("");
    expect(empty.notes).toBe("");
  });

  it("returns a fresh object on every call", () => {
    const first = emptyManualForm();
    first.notes = "mutated";

    expect(emptyManualForm().notes).toBe("");
  });
});

describe("manualLineTotal", () => {
  it("multiplies quantity by price and rounds to two decimals", () => {
    expect(manualLineTotal(form({ quantity: "2", unitPriceUSD: "10.5" }))).toBe(
      21,
    );
    expect(manualLineTotal(form({ quantity: "1.15", unitPriceUSD: "3" }))).toBe(
      3.45,
    );
    expect(manualLineTotal(form({ quantity: "3", unitPriceUSD: "0.1" }))).toBe(
      0.3,
    );
  });

  it("returns 0 when a factor is missing or not numeric", () => {
    expect(manualLineTotal(form({ quantity: "", unitPriceUSD: "10" }))).toBe(0);
    expect(manualLineTotal(form({ quantity: "2", unitPriceUSD: "abc" }))).toBe(
      0,
    );
  });
});

describe("validateManualForm — client and product", () => {
  it("requires a client identifier", () => {
    const errors = validateManualForm(form({ clientName: "" }));

    expect(errors.client).toBe("Indica un cliente o un nombre de cliente.");
  });

  it("accepts a selected client id", () => {
    const errors = validateManualForm(
      form({ clientId: "cli-1", clientName: "" }),
    );

    expect(errors.client).toBeUndefined();
  });

  it("requires a product identifier", () => {
    const errors = validateManualForm(form({ productName: "" }));

    expect(errors.product).toBe("Indica un producto o un nombre de producto.");
  });

  it("accepts a selected product id", () => {
    const errors = validateManualForm(
      form({ productId: "prod-1", productName: "" }),
    );

    expect(errors.product).toBeUndefined();
  });

  it("rejects a malformed email only when creating a client", () => {
    expect(
      validateManualForm(form({ clientEmail: "no-es-correo" })).clientEmail,
    ).toBe("El correo no tiene un formato válido.");
    expect(
      validateManualForm(
        form({ clientId: "cli-1", clientName: "", clientEmail: "no-es-correo" }),
      ).clientEmail,
    ).toBeUndefined();
    expect(
      validateManualForm(form({ clientEmail: "ana@ejemplo.com" })).clientEmail,
    ).toBeUndefined();
  });
});

describe("validateManualForm — amounts", () => {
  it("rejects quantity zero, negative or non numeric", () => {
    for (const quantity of ["", "0", "-1", "abc"]) {
      expect(validateManualForm(form({ quantity })).quantity).toBe(
        "La cantidad debe ser mayor que cero.",
      );
    }
  });

  it("rejects unit price zero, negative or non numeric", () => {
    for (const unitPriceUSD of ["", "0", "-2", "abc"]) {
      expect(validateManualForm(form({ unitPriceUSD })).unitPriceUSD).toBe(
        "El precio unitario debe ser mayor que cero.",
      );
    }
  });

  it("rejects a negative paid amount", () => {
    expect(validateManualForm(form({ paidAmount: "-1" })).paidAmount).toBe(
      "El monto pagado no puede ser negativo.",
    );
  });

  it("rejects a paid amount above the line total", () => {
    expect(validateManualForm(form({ paidAmount: "21.01" })).paidAmount).toBe(
      "El monto pagado no puede superar el total.",
    );
  });

  it("accepts a paid amount equal to the line total", () => {
    expect(validateManualForm(form({ paidAmount: "21" })).paidAmount).toBeUndefined();
  });

  it("accepts an empty paid amount", () => {
    expect(validateManualForm(form({ paidAmount: "" })).paidAmount).toBeUndefined();
  });

  it("rejects a non numeric paid amount", () => {
    expect(validateManualForm(form({ paidAmount: "abc" })).paidAmount).toBe(
      "El monto pagado debe ser numérico.",
    );
  });
});

describe("validateManualForm — dates and cadence", () => {
  it("rejects a future issue date", () => {
    expect(validateManualForm(form({ issueDate: "2999-12-31" })).issueDate).toBe(
      "La fecha no puede ser futura.",
    );
  });

  it("accepts a past or empty issue date", () => {
    expect(validateManualForm(form({ issueDate: "2000-01-01" })).issueDate).toBeUndefined();
    expect(validateManualForm(form({ issueDate: "" })).issueDate).toBeUndefined();
  });

  it("rejects a malformed issue date", () => {
    expect(validateManualForm(form({ issueDate: "31/12/2026" })).issueDate).toBe(
      "La fecha no es válida.",
    );
  });

  it("rejects a malformed due date", () => {
    expect(validateManualForm(form({ dueDate: "2026-02-31" })).dueDate).toBe(
      "El vencimiento no es válido.",
    );
  });

  it("requires every N days to be an integer between 1 and 365", () => {
    for (const everyNDays of ["", "0", "366", "1.5", "abc"]) {
      expect(
        validateManualForm(form({ cadence: "CADA_N_DIAS", everyNDays }))
          .everyNDays,
      ).toBe("Los días deben ser un entero entre 1 y 365.");
    }
    for (const everyNDays of ["1", "365"]) {
      expect(
        validateManualForm(form({ cadence: "CADA_N_DIAS", everyNDays }))
          .everyNDays,
      ).toBeUndefined();
    }
  });

  it("ignores every N days for quincenal or monthly", () => {
    for (const cadence of ["QUINCENAL", "MENSUAL"] as const) {
      expect(
        validateManualForm(form({ cadence, everyNDays: "abc" })).everyNDays,
      ).toBeUndefined();
    }
  });
});

describe("validateManualForm — complete form", () => {
  it("returns no errors for a complete form", () => {
    expect(validateManualForm(form())).toEqual({});
  });
});

describe("canSubmitManual", () => {
  it("mirrors validateManualForm", () => {
    expect(canSubmitManual(form())).toBe(true);
    expect(canSubmitManual(form({ quantity: "0" }))).toBe(false);
    expect(canSubmitManual(form({ clientName: "" }))).toBe(false);
  });
});

describe("buildManualPayload — identifiers", () => {
  it("sends only the clientId when a client is selected", () => {
    const payload = buildManualPayload(
      form({
        clientId: "cli-1",
        clientName: "Ana Pérez",
        clientPhone: "555-0100",
        clientEmail: "ana@ejemplo.com",
      }),
    );

    expect(payload.clientId).toBe("cli-1");
    expect(payload.clientName).toBeUndefined();
    expect(payload.clientPhone).toBeUndefined();
    expect(payload.clientEmail).toBeUndefined();
  });

  it("sends the creation fields for a new client, trimming blanks", () => {
    const payload = buildManualPayload(
      form({
        clientName: "  Ana Pérez  ",
        clientPhone: " 555-0100 ",
        clientEmail: " ana@ejemplo.com ",
      }),
    );

    expect(payload.clientId).toBeUndefined();
    expect(payload.clientName).toBe("Ana Pérez");
    expect(payload.clientPhone).toBe("555-0100");
    expect(payload.clientEmail).toBe("ana@ejemplo.com");
  });

  it("sends only the productId when a product is selected", () => {
    const payload = buildManualPayload(
      form({
        productId: "prod-1",
        productName: "Arroz 1 kg",
        productSku: "ARR-1",
      }),
    );

    expect(payload.productId).toBe("prod-1");
    expect(payload.productName).toBeUndefined();
    expect(payload.productSku).toBeUndefined();
  });

  it("sends the creation fields for a new product, omitting a blank sku", () => {
    const payload = buildManualPayload(
      form({ productName: "  Arroz 1 kg ", productSku: "   " }),
    );

    expect(payload.productId).toBeUndefined();
    expect(payload.productName).toBe("Arroz 1 kg");
    expect(payload.productSku).toBeUndefined();
  });
});

describe("buildManualPayload — values", () => {
  it("converts the numeric fields", () => {
    const payload = buildManualPayload(
      form({
        quantity: "3",
        unitPriceUSD: "2.5",
        paidAmount: "1.25",
        cadence: "CADA_N_DIAS",
        everyNDays: "30",
      }),
    );

    expect(payload.quantity).toBe(3);
    expect(payload.unitPriceUSD).toBe(2.5);
    expect(payload.paidAmount).toBe(1.25);
    expect(payload.cadence).toBe("CADA_N_DIAS");
    expect(payload.everyNDays).toBe(30);
  });

  it("omits empty optional values", () => {
    const payload = buildManualPayload(
      form({
        issueDate: "",
        dueDate: "",
        cadence: "none",
        paidAmount: "",
        notes: "   ",
      }),
    );

    expect(payload.issueDate).toBeUndefined();
    expect(payload.dueDate).toBeUndefined();
    expect(payload.cadence).toBeUndefined();
    expect(payload.everyNDays).toBeUndefined();
    expect(payload.paidAmount).toBeUndefined();
    expect(payload.notes).toBeUndefined();
  });

  it("keeps an explicit issue date and trims the notes", () => {
    const payload = buildManualPayload(
      form({ issueDate: "2026-01-15", notes: "  Saldo inicial  " }),
    );

    expect(payload.issueDate).toBe("2026-01-15");
    expect(payload.notes).toBe("Saldo inicial");
  });

  it("sends the cadence without every N days for quincenal", () => {
    const payload = buildManualPayload(
      form({ cadence: "QUINCENAL", everyNDays: "30" }),
    );

    expect(payload.cadence).toBe("QUINCENAL");
    expect(payload.everyNDays).toBeUndefined();
    expect(payload.dueDate).toBeUndefined();
  });

  it("lets an explicit due date win over the cadence", () => {
    const payload = buildManualPayload(
      form({
        dueDate: "2026-02-15",
        cadence: "CADA_N_DIAS",
        everyNDays: "30",
      }),
    );

    expect(payload.dueDate).toBe("2026-02-15");
    expect(payload.cadence).toBeUndefined();
    expect(payload.everyNDays).toBeUndefined();
  });
});
