import { describe, expect, it } from "vitest";
import type { Client, ClientBalance } from "../types/client.type";
import { clientSections } from "./client-detail";

const client: Client = {
  id: "c-1",
  name: "Almacén El Sol",
  taxId: "J-31012345-6",
  email: "ventas@elsol.test",
  phone: "+58 412-1112233",
  address: "Calle 5 #10-20",
  city: "Barquisimeto",
  state: "Lara",
  creditLimitUSD: "500.00",
  currentBalanceUSD: "120.00",
  notes: "Cliente fiel",
  isActive: true,
};

const balance: ClientBalance = {
  clientId: "c-1",
  totalUSD: 900,
  paidUSD: 780,
  currentBalanceUSD: 120,
  creditLimitUSD: 500,
  availableCreditUSD: 380,
};

describe("client-detail (ficha sections)", () => {
  it("groups identity, contact, credit and notes", () => {
    const sections = clientSections(client, balance);

    expect(sections.map((section) => section.key)).toEqual([
      "identity",
      "contact",
      "credit",
      "notes",
    ]);
  });

  it("puts the document and status on identity", () => {
    const identity = clientSections(client, null).find(
      (section) => section.key === "identity",
    );
    const values = Object.fromEntries(
      identity!.rows.map((row) => [row.label, row.value]),
    );

    expect(values.Documento).toBe("J-31012345-6");
    expect(values.Estado).toBe("Activo");
  });

  it("marks an inactive client", () => {
    const identity = clientSections({ ...client, isActive: false }, null).find(
      (section) => section.key === "identity",
    );
    const status = identity!.rows.find((row) => row.label === "Estado");

    expect(status?.value).toBe("Inactivo");
  });

  it("fills the credit section from the balance when present", () => {
    const credit = clientSections(client, balance).find(
      (section) => section.key === "credit",
    );
    const values = Object.fromEntries(
      credit!.rows.map((row) => [row.label, row.value]),
    );

    expect(values["Límite de crédito"]).toBe("$500.00");
    expect(values.Facturado).toBe("$900.00");
    expect(values.Cobrado).toBe("$780.00");
    expect(values.Disponible).toBe("$380.00");
  });

  it("falls back to the client row fields without a balance", () => {
    const credit = clientSections(client, null).find(
      (section) => section.key === "credit",
    );
    const values = Object.fromEntries(
      credit!.rows.map((row) => [row.label, row.value]),
    );

    expect(values["Límite de crédito"]).toBe("$500.00");
    expect(values.Facturado).toBe("—");
  });

  it("renders empty optional fields as an em dash", () => {
    const sparse: Client = {
      id: "c-2",
      name: "Sin datos",
      creditLimitUSD: 0,
      currentBalanceUSD: 0,
      isActive: true,
    };
    const contact = clientSections(sparse, null).find(
      (section) => section.key === "contact",
    );
    const values = contact!.rows.map((row) => row.value);

    expect(values.every((value) => value === "—")).toBe(true);
  });
});
