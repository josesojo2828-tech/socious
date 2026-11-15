import { describe, expect, it } from "vitest";
import {
  STATUS_LABELS,
  canConfirm,
  countByStatus,
  expectedColumns,
  formatRowErrors,
  groupClientsToCreate,
  groupProductsToCreate,
  statusTone,
} from "./initial-load";
import type {
  InitialLoadPreviewRow,
  InitialLoadRowStatus,
  InitialLoadValidateResult,
} from "../services/initial-load.service";

function row(
  overrides: Partial<InitialLoadPreviewRow> = {},
): InitialLoadPreviewRow {
  return {
    line: 2,
    saleNumber: "V-1",
    clientName: "Cliente",
    productName: "Producto",
    quantity: 1,
    unitPriceUSD: 10,
    totalUSD: 10,
    dueDate: null,
    cadence: null,
    status: "ok",
    willCreateClient: false,
    willCreateProduct: false,
    errors: [],
    warnings: [],
    ...overrides,
  };
}

function result(
  rows: InitialLoadPreviewRow[],
  overrides: Partial<InitialLoadValidateResult> = {},
): InitialLoadValidateResult {
  return {
    ok: true,
    totalRows: rows.length,
    errors: [],
    rows,
    ...overrides,
  };
}

describe("initial-load STATUS_LABELS", () => {
  it("maps every status to its neutral Spanish label", () => {
    expect(STATUS_LABELS).toEqual({
      ok: "Lista",
      error: "Con errores",
      "already-imported": "Ya importada",
      "duplicate-in-file": "Duplicada en el archivo",
    });
  });
});

describe("initial-load statusTone", () => {
  it("gives each status its own tone", () => {
    const tones = (
      [
        "ok",
        "error",
        "already-imported",
        "duplicate-in-file",
      ] as InitialLoadRowStatus[]
    ).map(statusTone);

    expect(new Set(tones).size).toBe(4);
    for (const tone of tones) expect(tone.length).toBeGreaterThan(0);
  });

  it("uses the red tone for error rows", () => {
    expect(statusTone("error")).toContain("red");
  });
});

describe("initial-load countByStatus", () => {
  it("counts rows per status and zero-fills the absent ones", () => {
    const counts = countByStatus([
      row({ line: 1, status: "ok" }),
      row({ line: 2, status: "ok" }),
      row({ line: 3, status: "error" }),
      row({ line: 4, status: "duplicate-in-file" }),
    ]);

    expect(counts).toEqual({
      ok: 2,
      error: 1,
      "already-imported": 0,
      "duplicate-in-file": 1,
    });
  });

  it("returns all zeros for an empty preview", () => {
    expect(countByStatus([])).toEqual({
      ok: 0,
      error: 0,
      "already-imported": 0,
      "duplicate-in-file": 0,
    });
  });
});

describe("initial-load canConfirm", () => {
  it("is false when there is no result", () => {
    expect(canConfirm(null)).toBe(false);
  });

  it("is false when the dry-run is not ok", () => {
    expect(canConfirm(result([row()], { ok: false }))).toBe(false);
  });

  it("is false when there are no rows", () => {
    expect(canConfirm(result([]))).toBe(false);
  });

  it("is false when any row is an error", () => {
    expect(
      canConfirm(result([row({ line: 1 }), row({ line: 2, status: "error" })])),
    ).toBe(false);
  });

  it("is true when every row is ok, already imported or duplicated", () => {
    expect(
      canConfirm(
        result([
          row({ line: 1, status: "ok" }),
          row({ line: 2, status: "already-imported" }),
          row({ line: 3, status: "duplicate-in-file" }),
        ]),
      ),
    ).toBe(true);
  });
});

describe("initial-load formatRowErrors", () => {
  it("joins every message into a single line", () => {
    expect(
      formatRowErrors(
        row({ errors: ["la cantidad es obligatoria", "el precio es inválido"] }),
      ),
    ).toBe("la cantidad es obligatoria · el precio es inválido");
  });

  it("returns an empty string when there are no errors", () => {
    expect(formatRowErrors(row())).toBe("");
  });
});

describe("initial-load groupProductsToCreate", () => {
  it("keeps distinct product names that will be created, in order", () => {
    expect(
      groupProductsToCreate([
        row({ line: 1, productName: "Harina", willCreateProduct: true }),
        row({ line: 2, productName: "Azúcar", willCreateProduct: true }),
        row({ line: 3, productName: "Harina", willCreateProduct: true }),
        row({ line: 4, productName: "Sal", willCreateProduct: false }),
      ]),
    ).toEqual(["Harina", "Azúcar"]);
  });

  it("ignores blank product names", () => {
    expect(
      groupProductsToCreate([
        row({ productName: "   ", willCreateProduct: true }),
      ]),
    ).toEqual([]);
  });
});

describe("initial-load groupClientsToCreate", () => {
  it("keeps distinct client names that will be created, in order", () => {
    expect(
      groupClientsToCreate([
        row({ line: 1, clientName: "Ana", willCreateClient: true }),
        row({ line: 2, clientName: "Luis", willCreateClient: true }),
        row({ line: 3, clientName: "Ana", willCreateClient: true }),
        row({ line: 4, clientName: "Marta", willCreateClient: false }),
      ]),
    ).toEqual(["Ana", "Luis"]);
  });
});

describe("initial-load expectedColumns", () => {
  it("marks exactly the five required columns", () => {
    const columns = expectedColumns();
    expect(columns.map((entry) => entry.column)).toEqual([
      "venta",
      "fecha",
      "cliente_nombre",
      "cliente_telefono",
      "cliente_email",
      "producto",
      "sku",
      "cantidad",
      "precio_unitario",
      "vencimiento",
      "cadencia",
      "dias",
      "monto_pagado",
      "notas",
    ]);
    expect(columns.filter((entry) => entry.required).map((e) => e.column)).toEqual(
      ["fecha", "cliente_nombre", "producto", "cantidad", "precio_unitario"],
    );
  });
});
