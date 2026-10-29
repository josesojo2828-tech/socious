import { ConflictException, NotFoundException } from "@nestjs/common";
import { CashService } from "./cash.service";

const ORG_A = "org-a";
const SHIFT = {
  id: "sh-1",
  cashRegisterId: "cr-1",
  status: "OPEN",
  initialAmountUSD: "100.00",
  organizationId: ORG_A,
};

const sum = (value: number) => ({ _sum: { amount: value } });
const sumUSD = (value: number) => ({ _sum: { amountUSD: value } });

const makeTx = () => ({
  cashRegister: {
    findFirst: jest.fn().mockResolvedValue({ id: "cr-1", name: "Caja" }),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn((args: any) => Promise.resolve({ id: "cr-1", ...args.data })),
    update: jest.fn(),
    delete: jest.fn(),
  },
  cashShift: {
    findFirst: jest.fn().mockResolvedValue(SHIFT),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((args: any) => Promise.resolve({ id: "sh-1", ...args.data })),
    update: jest.fn((args: any) =>
      Promise.resolve({ id: args.where.id, ...args.data }),
    ),
  },
  cashMovement: {
    aggregate: jest.fn().mockResolvedValue(sum(0)),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn((args: any) => Promise.resolve({ id: "mv-1", ...args.data })),
  },
  salePayment: {
    aggregate: jest.fn().mockResolvedValue(sumUSD(0)),
    findMany: jest.fn().mockResolvedValue([]),
  },
  purchasePayment: {
    aggregate: jest.fn().mockResolvedValue(sumUSD(0)),
    findMany: jest.fn().mockResolvedValue([]),
  },
});

const makeService = () => {
  const tx = makeTx();
  const prisma = { ...tx, $transaction: jest.fn(async (fn: any) => fn(tx)) };
  return { service: new CashService(prisma as any), prisma, tx };
};

/**
 * Every `computeExpected` call runs the same four aggregates, so the mocks
 * return stable values for all of them (the shift detail and the mutation
 * both recompute the drawer).
 */
const queueMovementAggregates = (
  tx: ReturnType<typeof makeTx>,
  income: number,
  expense: number,
) => {
  tx.cashMovement.aggregate.mockImplementation(async (args: any) =>
    sum(args.where.type === "EXPENSE" ? expense : income),
  );
};

describe("CashService", () => {
  it("refuses to open a second shift on the same register", async () => {
    const { service, tx } = makeService();
    tx.cashRegister.findFirst.mockResolvedValue({ id: "cr-1" });
    tx.cashShift.findFirst.mockResolvedValue({ id: "sh-open", status: "OPEN" });

    await expect(
      service.openShift({ organizationId: ORG_A, userId: "u-1" }, "cr-1", {
        initialAmountUSD: 50,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("rejects movements on a closed shift", async () => {
    const { service, tx } = makeService();
    tx.cashShift.findFirst.mockResolvedValue({ ...SHIFT, status: "CLOSED" });

    await expect(
      service.addMovement({ organizationId: ORG_A, userId: "u-1" }, "sh-1", {
        type: "EXPENSE",
        amount: 10,
        reason: "Papelería",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("recomputes the expected drawer after a movement", async () => {
    const { service, tx } = makeService();
    tx.cashShift.findFirst.mockResolvedValue(SHIFT);
    queueMovementAggregates(tx, 40, 15);
    tx.salePayment.aggregate.mockResolvedValue(sumUSD(20));
    tx.purchasePayment.aggregate.mockResolvedValue(sumUSD(5));

    await service.addMovement({ organizationId: ORG_A, userId: "u-1" }, "sh-1", {
      type: "INCOME",
      amount: 40,
      reason: "Retiro parcial",
    });

    // 100 + 40 - 15 + 20 - 5 = 140
    expect(tx.cashShift.update.mock.calls[0][0].data.expectedAmountUSD).toBe(140);
  });

  it("closes the shift with the expected amount and the difference", async () => {
    const { service, tx } = makeService();
    tx.cashShift.findFirst.mockResolvedValue(SHIFT);
    queueMovementAggregates(tx, 30, 10);
    tx.salePayment.aggregate.mockResolvedValue(sumUSD(150));
    tx.purchasePayment.aggregate.mockResolvedValue(sumUSD(20));

    const closed = await service.closeShift(
      { organizationId: ORG_A, userId: "u-9" },
      "sh-1",
      { actualAmountUSD: 245 },
    );

    // 100 + 30 - 10 + 150 - 20 = 250; counted 245 → difference -5
    expect(closed.expectedAmountUSD).toBe(250);
    expect(closed.actualAmountUSD).toBe(245);
    expect(closed.differenceUSD).toBe(-5);
    expect(closed.status).toBe("CLOSED");
    expect(closed.closedById).toBe("u-9");
  });

  it("raises NotFound when the shift belongs to another tenant", async () => {
    const { service, tx } = makeService();
    tx.cashShift.findFirst.mockResolvedValue(null);

    await expect(
      service.getShift({ organizationId: ORG_A }, "sh-x"),
    ).rejects.toThrow(NotFoundException);
  });

  it("scopes a register list to the organization", async () => {
    const { service, tx } = makeService();

    await service.listRegisters({ organizationId: ORG_A });

    expect(tx.cashRegister.findMany.mock.calls[0][0].where).toEqual({
      organizationId: ORG_A,
    });
  });
});
