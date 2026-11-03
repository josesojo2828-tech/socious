import { BadRequestException } from "@nestjs/common";
import { applyBomStock, type BomScope } from "./bom-stock";

const SCOPE: BomScope = { organizationId: "org-1", createdById: "u-1" };

const makeTx = (rows: any[] = []) => ({
  productComponent: {
    findMany: jest.fn().mockResolvedValue(rows),
  },
  stockMovement: {
    create: jest.fn((args: any) => Promise.resolve({ id: "m-1", ...args.data })),
  },
  product: {
    update: jest.fn((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
  },
});

const bomRow = (overrides: Record<string, unknown> = {}) => ({
  componentId: "comp-1",
  quantity: "1.00",
  component: {
    id: "comp-1",
    name: "Hoja A4",
    stock: "10.00",
    isService: false,
    status: "ACTIVE",
  },
  ...overrides,
});

describe("applyBomStock — BOM (S3)", () => {
  it("does nothing when the product has no components", async () => {
    const tx = makeTx([]);
    await applyBomStock(tx as any, SCOPE, "p-1", 2, "VTA-1", "SALE", "Impresión");
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
    expect(tx.product.update).not.toHaveBeenCalled();
  });

  it("consumes quantity × unit on SALE and books the kardex row", async () => {
    const tx = makeTx([bomRow({ quantity: "2.00", component: { ...bomRow().component, stock: "10.00" } })]);
    await applyBomStock(tx as any, SCOPE, "p-1", 3, "VTA-1", "SALE", "Impresión");

    // 3 sold × 2 per unit = 6
    expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
      productId: "comp-1",
      type: "SALE",
      quantity: 6,
      previousStock: 10,
      newStock: 4,
      reference: "VTA-1",
    });
    expect(tx.product.update.mock.calls[0][0].data.stock).toBe(4);
  });

  it("blocks the SALE when the component stock is insufficient", async () => {
    const tx = makeTx([
      bomRow({ component: { ...bomRow().component, stock: "1.00" } }),
    ]);

    await expect(
      applyBomStock(tx as any, SCOPE, "p-1", 2, "VTA-1", "SALE", "Impresión"),
    ).rejects.toThrow(BadRequestException);
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("returns components on RETURN and books a RETURN row", async () => {
    const tx = makeTx([bomRow({ component: { ...bomRow().component, stock: "4.00" } })]);
    await applyBomStock(tx as any, SCOPE, "p-1", 2, "VTA-1", "RETURN", "anulación VTA-1");

    expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
      productId: "comp-1",
      type: "RETURN",
      quantity: 2,
      previousStock: 4,
      newStock: 6,
    });
  });

  it("never touches components marked as services", async () => {
    const tx = makeTx([
      bomRow({ component: { ...bomRow().component, isService: true } }),
    ]);
    await applyBomStock(tx as any, SCOPE, "p-1", 1, "VTA-1", "SALE", "X");
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("marks the component OUT_OF_STOCK when it runs out", async () => {
    const tx = makeTx([
      bomRow({ component: { ...bomRow().component, stock: "2.00" } }),
    ]);
    await applyBomStock(tx as any, SCOPE, "p-1", 2, "VTA-1", "SALE", "Impresión");
    expect(tx.product.update.mock.calls[0][0].data).toMatchObject({
      stock: 0,
      status: "OUT_OF_STOCK",
    });
  });
});
