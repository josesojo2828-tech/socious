import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SaleImportService } from "./sale-import.service";

const DIR = join(__dirname, "../../../../../odd/fixtures/import");
const ORG = "org-1";

const PRODUCTS = [
  { id: "p-cam", sku: "CAM-ROJA-M", name: "Camisa roja talla M", salePriceUSD: "16.00", taxRate: "0.00" },
  { id: "p-med", sku: "MED-100", name: "Medias deportivas (par)", salePriceUSD: "3.00", taxRate: "0.00" },
  { id: "p-arroz", sku: "ARROZ-1KG", name: "Arroz blanco 1 kg", salePriceUSD: "1.80", taxRate: "0.00" },
  { id: "p-cafe", sku: "CAFE-500", name: "Café molido 500 g", salePriceUSD: "5.20", taxRate: "0.00" },
  { id: "p-pant", sku: "PANT-NEG-32", name: "Pantalón negro 32", salePriceUSD: "24.00", taxRate: "0.00" },
  { id: "p-sham", sku: "SHAMPOO-400", name: "Shampoo 400 ml", salePriceUSD: "4.20", taxRate: "0.00" },
  { id: "p-calc", sku: "CALCETIN", name: "Calcetín deportivo", salePriceUSD: "2.20", taxRate: "0.00" },
  { id: "p-camaz", sku: "CAM-AZUL-L", name: "Camisa azul talla L", salePriceUSD: "16.00", taxRate: "0.00" },
  { id: "p-harina", sku: "HARINA-PAN", name: "Harina de maíz 1 kg", salePriceUSD: "1.60", taxRate: "0.00" },
  { id: "p-aceite", sku: "ACEITE-1L", name: "Aceite vegetal 1 L", salePriceUSD: "3.40", taxRate: "0.00" },
  { id: "p-silla", sku: "SILLA-P", name: "Silla plástica", salePriceUSD: "11.00", taxRate: "0.00" },
  { id: "p-consult", sku: "CONSULT-01", name: "Consulta de asesoría", salePriceUSD: "15.00", taxRate: "0.00" },
  { id: "p-mesa", sku: "MESA-P", name: "Mesa plástica 1.2 m", salePriceUSD: "26.00", taxRate: "0.00" },
  { id: "p-azucar", sku: "AZUCAR-1KG", name: "Azúcar refinada 1 kg", salePriceUSD: "1.40", taxRate: "0.00" },
];

function makeService() {
  const prisma = {
    product: {
      findMany: jest.fn(async ({ where }: any) =>
        PRODUCTS.filter((product) => where.sku.in.includes(product.sku)),
      ),
    },
    client: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(async (args: any) => ({ id: "client-new", ...args.data })),
    },
  };
  const saleService = { create: jest.fn().mockResolvedValue({ id: "s-1" }) };
  const exchange = {
    resolveRatesAt: jest.fn().mockResolvedValue({ rateBcv: 800, rateUsdt: 1000 }),
  };
  const service = new SaleImportService(
    prisma as any,
    saleService as any,
    exchange as any,
  );
  return { service, prisma, saleService, exchange };
}

const fixture = (name: string) =>
  readFileSync(join(DIR, name), "utf8").replace(/^\uFEFF/, "");

describe("SaleImportService", () => {
  it("groups the fixture lines into sales, whatever the column order", async () => {
    for (const file of [
      "ventas-formato-a.csv",
      "ventas-formato-b.csv",
      "ventas-formato-c.csv",
    ]) {
      const { service } = makeService();
      const result = await service.validate({ organizationId: ORG }, {
        content: fixture(file),
      });

      expect(result.summary.sales).toBe(10);
      expect(result.summary.lines).toBe(15);
      expect(result.summary.invalid).toBe(0);
      expect(result.sales.find((sale) => sale.venta === "V-001")).toMatchObject({
        lines: 2,
        totalUSD: 41,
        paidUSD: 41,
      });
    }
  });

  it("creates every sale financially, never touching stock", async () => {
    const { service, saleService } = makeService();

    const result = await service.commit({ organizationId: ORG }, {
      content: fixture("ventas-formato-a.csv"),
    });

    expect(result).toMatchObject({ created: 10, skipped: 0 });
    expect(saleService.create).toHaveBeenCalledTimes(10);
    for (const call of saleService.create.mock.calls) {
      expect(call[2]).toEqual({ skipStock: true });
    }

    const firstSale = saleService.create.mock.calls[0][1];
    expect(firstSale.issueDate).toBe("2026-11-03T12:00:00.000Z");
    expect(firstSale.items).toHaveLength(2);
    expect(firstSale.payments).toEqual([
      {
        amountOriginal: 41,
        currency: "VES",
        paymentMethod: "PAGO_MOVIL",
        paidAt: "2026-11-03T12:00:00.000Z",
      },
    ]);
  });

  it("rejects a sale that pays more than its total", async () => {
    const { service } = makeService();
    const content = [
      "venta,fecha,cliente_nombre,cliente_telefono,cliente_email,sku,cantidad,metodo_pago,moneda,monto_pagado,notas",
      "V-900,2026-11-03,Ana,584241000001,,CAM-ROJA-M,1,CASH_USD,USD,25.00,",
    ].join("\n");

    const result = await service.validate({ organizationId: ORG }, { content });

    expect(result.summary.invalid).toBe(1);
    expect(result.errors.some((error) => /supera el total/i.test(error.message))).toBe(
      true,
    );
  });

  it("flags unknown SKUs and unknown payment methods", async () => {
    const { service } = makeService();
    const content = [
      "venta,fecha,cliente_nombre,sku,cantidad,metodo_pago",
      "V-901,2026-11-03,Ana,NO-EXISTE,1,CASH_USD",
      "V-902,2026-11-03,Ana,CAM-ROJA-M,1,BITCOIN",
    ].join("\n");

    const result = await service.validate({ organizationId: ORG }, { content });

    expect(result.summary.invalid).toBe(2);
    expect(result.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(["sku", "metodo_pago"]),
    );
  });
});
