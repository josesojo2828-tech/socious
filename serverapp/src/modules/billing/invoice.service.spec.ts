import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  InvoiceLineType,
  InvoiceStatus,
  Prisma,
  SubscriptionStatus,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

import {
  BILLING_TIME_ZONE_DEFAULT,
  INCLUDED_SEATS,
  InvoiceService,
  SEAT_PRICE_USD,
  computeInvoiceTotals,
  formatPeriodKey,
  monthEndUtc,
  monthStartInTimeZone,
  monthStartUtc,
  round2,
} from "./invoice.service";

describe("computeInvoiceTotals", () => {
  it("charges only the base plan when seats are within the included allowance", () => {
    const totals = computeInvoiceTotals({
      planName: "Premium",
      planPrice: 49.99,
      maxSeats: INCLUDED_SEATS,
      addOns: [],
    });

    expect(totals.lines).toHaveLength(1);
    expect(totals.lines[0]).toMatchObject({
      type: InvoiceLineType.BASE_PLAN,
      amount: 49.99,
      quantity: 1,
    });
    expect(totals.subtotal).toBe(49.99);
    expect(totals.total).toBe(49.99);
  });

  it("spec scenario: base 99.99 + 2 extra seats + 1 add-on", () => {
    const totals = computeInvoiceTotals({
      planName: "Clínica",
      planPrice: 99.99,
      maxSeats: INCLUDED_SEATS + 2,
      addOns: [
        {
          entitlementId: "ent-1",
          addOnId: "addon-1",
          addOnName: "Control de Asistencia",
          quantity: 1,
          unitPrice: 20,
        },
      ],
    });

    const expectedSeats = round2(2 * SEAT_PRICE_USD);
    expect(totals.lines.map((line) => line.type)).toEqual([
      InvoiceLineType.BASE_PLAN,
      InvoiceLineType.SEAT,
      InvoiceLineType.ADDON,
    ]);
    expect(totals.lines[1].amount).toBe(expectedSeats);
    expect(totals.total).toBe(round2(99.99 + expectedSeats + 20));
  });

  it("multiplies add-on quantity by the locked unit price", () => {
    const totals = computeInvoiceTotals({
      planName: "Pro",
      planPrice: 10,
      maxSeats: 5,
      addOns: [
        {
          entitlementId: "ent-2",
          addOnId: "addon-2",
          addOnName: "WhatsApp AI",
          quantity: 3,
          unitPrice: 4.5,
        },
      ],
    });

    expect(totals.lines).toHaveLength(2);
    expect(totals.lines[1].amount).toBe(13.5);
    expect(totals.total).toBe(23.5);
  });

  it("never emits negative seat lines when maxSeats is below the allowance", () => {
    const totals = computeInvoiceTotals({
      planName: "Pro",
      planPrice: 10,
      maxSeats: 1,
      addOns: [],
    });

    expect(totals.lines).toHaveLength(1);
    expect(
      totals.lines.some((line) => line.type === InvoiceLineType.SEAT),
    ).toBe(false);
  });

  it("ignores add-ons with zero quantity", () => {
    const totals = computeInvoiceTotals({
      planName: "Pro",
      planPrice: 10,
      maxSeats: 5,
      addOns: [
        {
          entitlementId: "ent-3",
          addOnId: "addon-3",
          addOnName: "Free",
          quantity: 0,
          unitPrice: 5,
        },
      ],
    });

    expect(totals.lines).toHaveLength(1);
    expect(totals.total).toBe(10);
  });

  it("respects custom included seats and seat price overrides", () => {
    const totals = computeInvoiceTotals({
      planName: "Custom",
      planPrice: 0,
      maxSeats: 4,
      includedSeats: 2,
      seatPrice: 10,
      addOns: [],
    });

    expect(totals.lines[1].amount).toBe(20);
    expect(totals.total).toBe(20);
  });

  it("omits the base plan line when no plan is provided (personal add-ons only)", () => {
    const totals = computeInvoiceTotals({
      addOns: [
        {
          entitlementId: "ent-p",
          addOnId: "addon-p",
          addOnName: "Control de Asistencia",
          quantity: 2,
          unitPrice: 15,
        },
      ],
    });

    expect(totals.lines).toHaveLength(1);
    expect(totals.lines[0].type).toBe(InvoiceLineType.ADDON);
    expect(totals.total).toBe(30);
  });
});

describe("period helpers", () => {
  it("normalizes any date to the first instant of its UTC month", () => {
    const start = monthStartUtc(new Date("2026-09-15T18:30:00.000Z"));
    expect(start.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("computes the exclusive end of the period", () => {
    const end = monthEndUtc(new Date("2026-09-01T00:00:00.000Z"));
    expect(end.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});

interface MockPrisma {
  organization: { findFirst: jest.Mock };
  user: { findFirst: jest.Mock };
  invoice: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  entitlement: { findMany: jest.Mock };
  subscription: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  userWallet: { findFirst: jest.Mock; update: jest.Mock };
  userPaymentMethod: { findFirst: jest.Mock };
  transaction: { create: jest.Mock };
  financialAuditLog: { create: jest.Mock };
  $transaction: jest.Mock;
}

function buildPrismaMock(): MockPrisma {
  const tx: MockPrisma = {
    organization: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    invoice: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    entitlement: { findMany: jest.fn() },
    subscription: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    userWallet: { findFirst: jest.fn(), update: jest.fn() },
    userPaymentMethod: { findFirst: jest.fn() },
    transaction: { create: jest.fn() },
    financialAuditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  tx.$transaction.mockImplementation(
    async (callback: (client: MockPrisma) => Promise<unknown>) => callback(tx),
  );
  return tx;
}

describe("InvoiceService.generateMonthlyInvoice", () => {
  const periodStart = new Date("2026-09-01T00:00:00.000Z");

  function orgWithSubscription() {
    return {
      id: "org-1",
      maxSeats: 7,
      subscriptions: [
        {
          userId: "payer-1",
          status: SubscriptionStatus.ACTIVE,
          plan: {
            name: "Clínica",
            price: new Prisma.Decimal(99.99),
            currency: "USD",
          },
        },
      ],
    };
  }

  it("creates an invoice with base + seat + add-on lines", async () => {
    const prisma = buildPrismaMock();
    prisma.organization.findFirst.mockResolvedValue(orgWithSubscription());
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.entitlement.findMany.mockResolvedValue([
      {
        id: "ent-1",
        addOnId: "addon-1",
        quantity: 1,
        priceAtPurchase: new Prisma.Decimal(20),
        addOn: { name: "Control de Asistencia" },
      },
    ]);
    const created = { id: "inv-1", status: InvoiceStatus.ISSUED };
    prisma.invoice.create.mockResolvedValue(created);

    const service = new InvoiceService(prisma as unknown as never);
    const result = await service.generateMonthlyInvoice("org-1", periodStart);

    expect(result).toBe(created);
    expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
    const payload = prisma.invoice.create.mock.calls[0][0];
    expect(payload.data.organizationId).toBe("org-1");
    expect(payload.data.payerUserId).toBe("payer-1");
    expect(payload.data.periodStart).toEqual(periodStart);
    expect(payload.data.periodEnd).toEqual(
      new Date("2026-10-01T00:00:00.000Z"),
    );
    expect(payload.data.total).toBe(99.99 + 2 * SEAT_PRICE_USD + 20);
    expect(payload.data.lines.create).toHaveLength(3);
  });

  it("is idempotent: returns the existing invoice without creating a duplicate", async () => {
    const prisma = buildPrismaMock();
    prisma.organization.findFirst.mockResolvedValue(orgWithSubscription());
    const existing = { id: "inv-existing", status: InvoiceStatus.ISSUED };
    prisma.invoice.findFirst.mockResolvedValue(existing);

    const service = new InvoiceService(prisma as unknown as never);
    const result = await service.generateMonthlyInvoice("org-1", periodStart);

    expect(result).toBe(existing);
    expect(prisma.invoice.create).not.toHaveBeenCalled();
    expect(prisma.entitlement.findMany).not.toHaveBeenCalled();
  });

  it("returns null when the organization has no active subscription", async () => {
    const prisma = buildPrismaMock();
    prisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      maxSeats: 5,
      subscriptions: [],
    });

    const service = new InvoiceService(prisma as unknown as never);
    const result = await service.generateMonthlyInvoice("org-1", periodStart);

    expect(result).toBeNull();
    expect(prisma.invoice.create).not.toHaveBeenCalled();
  });

  it("throws when the organization does not exist", async () => {
    const prisma = buildPrismaMock();
    prisma.organization.findFirst.mockResolvedValue(null);

    const service = new InvoiceService(prisma as unknown as never);
    await expect(
      service.generateMonthlyInvoice("missing", periodStart),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("recovers from a concurrent unique-constraint race by returning the winner", async () => {
    const prisma = buildPrismaMock();
    prisma.organization.findFirst.mockResolvedValue(orgWithSubscription());
    prisma.entitlement.findMany.mockResolvedValue([]);
    prisma.invoice.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "inv-winner" });
    prisma.invoice.create.mockRejectedValue({ code: "P2002" });

    const service = new InvoiceService(prisma as unknown as never);
    const result = await service.generateMonthlyInvoice("org-1", periodStart);

    expect(result).toEqual({ id: "inv-winner" });
  });
});

describe("InvoiceService.generatePersonalInvoice", () => {
  const periodStart = new Date("2026-09-01T00:00:00.000Z");

  function personalUser(withSubscription = true) {
    return {
      id: "user-1",
      subscriptions: withSubscription
        ? [
            {
              userId: "user-1",
              status: SubscriptionStatus.ACTIVE,
              plan: {
                name: "Premium",
                price: new Prisma.Decimal(49.99),
                currency: "USD",
              },
            },
          ]
        : [],
    };
  }

  const personalEntitlement = {
    id: "ent-p1",
    addOnId: "addon-1",
    quantity: 1,
    priceAtPurchase: new Prisma.Decimal(20),
    addOn: { name: "Control de Asistencia" },
  };

  it("creates a personal invoice billed to the user's own wallet (A1)", async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue(personalUser(true));
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.entitlement.findMany.mockResolvedValue([personalEntitlement]);
    const created = { id: "inv-p1", status: InvoiceStatus.ISSUED };
    prisma.invoice.create.mockResolvedValue(created);

    const service = new InvoiceService(prisma as unknown as never);
    const result = await service.generatePersonalInvoice("user-1", periodStart);

    expect(result).toBe(created);
    const payload = prisma.invoice.create.mock.calls[0][0];
    expect(payload.data.organizationId).toBeNull();
    expect(payload.data.userId).toBe("user-1");
    expect(payload.data.payerUserId).toBe("user-1");
    expect(payload.data.periodStart).toEqual(periodStart);
    expect(payload.data.lines.create).toHaveLength(2);
    expect(payload.data.lines.create.map((l: any) => l.type)).toEqual([
      InvoiceLineType.BASE_PLAN,
      InvoiceLineType.ADDON,
    ]);
    expect(payload.data.total).toBe(round2(49.99 + 20));
  });

  it("invoices add-ons only when the user has no personal base plan", async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue(personalUser(false));
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.entitlement.findMany.mockResolvedValue([personalEntitlement]);
    prisma.invoice.create.mockResolvedValue({ id: "inv-p2" });

    const service = new InvoiceService(prisma as unknown as never);
    await service.generatePersonalInvoice("user-1", periodStart);

    const payload = prisma.invoice.create.mock.calls[0][0];
    expect(payload.data.lines.create).toHaveLength(1);
    expect(payload.data.lines.create[0].type).toBe(InvoiceLineType.ADDON);
    expect(payload.data.total).toBe(20);
  });

  it("is idempotent: returns the existing personal invoice without creating a duplicate", async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue(personalUser(true));
    const existing = { id: "inv-p-existing", status: InvoiceStatus.ISSUED };
    prisma.invoice.findFirst.mockResolvedValue(existing);

    const service = new InvoiceService(prisma as unknown as never);
    const result = await service.generatePersonalInvoice("user-1", periodStart);

    expect(result).toBe(existing);
    expect(prisma.invoice.create).not.toHaveBeenCalled();
    expect(prisma.entitlement.findMany).not.toHaveBeenCalled();
  });

  it("returns null when the user has no personal plan or entitlements", async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue(personalUser(false));
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.entitlement.findMany.mockResolvedValue([]);

    const service = new InvoiceService(prisma as unknown as never);
    const result = await service.generatePersonalInvoice("user-1", periodStart);

    expect(result).toBeNull();
    expect(prisma.invoice.create).not.toHaveBeenCalled();
  });

  it("throws when the user does not exist", async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue(null);

    const service = new InvoiceService(prisma as unknown as never);
    await expect(
      service.generatePersonalInvoice("missing", periodStart),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("InvoiceService.settleInvoice", () => {
  function issuedInvoice() {
    return {
      id: "inv-1",
      organizationId: "org-1",
      status: InvoiceStatus.ISSUED,
      total: new Prisma.Decimal(131.99),
      currency: "USD",
      periodStart: new Date("2026-09-01T00:00:00.000Z"),
      periodEnd: new Date("2026-10-01T00:00:00.000Z"),
      lines: [{ id: "line-1" }],
    };
  }

  function fundedPayer(prisma: MockPrisma) {
    prisma.subscription.findFirst.mockResolvedValue({
      id: "sub-1",
      userId: "payer-1",
      endDate: new Date("2026-09-01T00:00:00.000Z"),
    });
    prisma.subscription.update.mockResolvedValue({});
    prisma.userWallet.findFirst.mockResolvedValue({
      id: "wallet-1",
      userId: "payer-1",
      balance: new Prisma.Decimal(1000),
    });
    prisma.userPaymentMethod.findFirst.mockResolvedValue({ id: "pm-1" });
    prisma.userWallet.update.mockResolvedValue({});
    prisma.transaction.create.mockResolvedValue({ id: "txn-1" });
    prisma.financialAuditLog.create.mockResolvedValue({ id: "audit-1" });
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.PAID,
    });
  }

  it("debits the A1 payer wallet and records a transaction scoped to the org", async () => {
    const prisma = buildPrismaMock();
    prisma.invoice.findUnique.mockResolvedValue(issuedInvoice());
    fundedPayer(prisma);

    const service = new InvoiceService(prisma as unknown as never);
    await service.settleInvoice("inv-1");

    expect(prisma.userWallet.update).toHaveBeenCalledWith({
      where: { id: "wallet-1" },
      data: { balance: { decrement: 131.99 } },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "payer-1",
        paymentMethodId: "pm-1",
        type: TransactionType.PAYMENT,
        status: TransactionStatus.SUCCESS,
        amount: 131.99,
        organizationId: "org-1",
      }),
    });
    expect(prisma.financialAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "INVOICE_PAID",
        entityType: "Invoice",
        entityId: "inv-1",
      }),
    });
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: InvoiceStatus.PAID, paidAt: expect.any(Date) },
    });
    // Unified billing: settlement is the SINGLE owner of endDate renewal.
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date("2026-10-01T00:00:00.000Z"),
      }),
    });
  });

  it("is idempotent: an already-PAID invoice is returned untouched", async () => {
    const prisma = buildPrismaMock();
    prisma.invoice.findUnique.mockResolvedValue({
      ...issuedInvoice(),
      status: InvoiceStatus.PAID,
    });

    const service = new InvoiceService(prisma as unknown as never);
    const result = await service.settleInvoice("inv-1");

    expect(result.status).toBe(InvoiceStatus.PAID);
    expect(prisma.userWallet.update).not.toHaveBeenCalled();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });

  it("rejects an insufficient wallet without debiting anything", async () => {
    const prisma = buildPrismaMock();
    prisma.invoice.findUnique.mockResolvedValue(issuedInvoice());
    prisma.subscription.findFirst.mockResolvedValue({ userId: "payer-1" });
    prisma.userWallet.findFirst.mockResolvedValue({
      id: "wallet-1",
      balance: new Prisma.Decimal(10),
    });

    const service = new InvoiceService(prisma as unknown as never);
    await expect(service.settleInvoice("inv-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.userWallet.update).not.toHaveBeenCalled();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it("rejects when the payer has no active payment method", async () => {
    const prisma = buildPrismaMock();
    prisma.invoice.findUnique.mockResolvedValue(issuedInvoice());
    prisma.subscription.findFirst.mockResolvedValue({ userId: "payer-1" });
    prisma.userWallet.findFirst.mockResolvedValue({
      id: "wallet-1",
      balance: new Prisma.Decimal(1000),
    });
    prisma.userPaymentMethod.findFirst.mockResolvedValue(null);

    const service = new InvoiceService(prisma as unknown as never);
    await expect(service.settleInvoice("inv-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.userWallet.update).not.toHaveBeenCalled();
  });

  it("throws when the invoice does not exist", async () => {
    const prisma = buildPrismaMock();
    prisma.invoice.findUnique.mockResolvedValue(null);

    const service = new InvoiceService(prisma as unknown as never);
    await expect(service.settleInvoice("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("debits the personal owner's own wallet for a personal invoice (A1)", async () => {
    const prisma = buildPrismaMock();
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-p1",
      organizationId: null,
      userId: "user-1",
      status: InvoiceStatus.ISSUED,
      total: new Prisma.Decimal(69.99),
      currency: "USD",
      periodStart: new Date("2026-09-01T00:00:00.000Z"),
      periodEnd: new Date("2026-10-01T00:00:00.000Z"),
      lines: [{ id: "line-1" }],
    });
    prisma.subscription.findFirst.mockResolvedValue({
      id: "sub-p1",
      endDate: new Date("2026-09-01T00:00:00.000Z"),
    });
    prisma.subscription.update.mockResolvedValue({});
    prisma.userWallet.findFirst.mockResolvedValue({
      id: "wallet-u1",
      userId: "user-1",
      balance: new Prisma.Decimal(100),
    });
    prisma.userPaymentMethod.findFirst.mockResolvedValue({ id: "pm-u1" });
    prisma.userWallet.update.mockResolvedValue({});
    prisma.transaction.create.mockResolvedValue({ id: "txn-u1" });
    prisma.financialAuditLog.create.mockResolvedValue({ id: "audit-u1" });
    prisma.invoice.update.mockResolvedValue({
      id: "inv-p1",
      status: InvoiceStatus.PAID,
    });

    const service = new InvoiceService(prisma as unknown as never);
    await service.settleInvoice("inv-p1");

    expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          organizationId: null,
          status: SubscriptionStatus.ACTIVE,
        }),
      }),
    );
    expect(prisma.userWallet.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", deletedAt: null },
    });
    expect(prisma.userWallet.update).toHaveBeenCalledWith({
      where: { id: "wallet-u1" },
      data: { balance: { decrement: 69.99 } },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        organizationId: null,
        amount: 69.99,
      }),
    });
    // Personal renewal is also owned by settlement.
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-p1" },
      data: expect.objectContaining({
        endDate: new Date("2026-10-01T00:00:00.000Z"),
      }),
    });
  });
});

describe("monthStartInTimeZone", () => {
  it("bills the previous month for a UTC instant that is still last month in Caracas", () => {
    const instant = new Date("2026-10-01T00:30:00.000Z");
    expect(monthStartInTimeZone(instant, "America/Caracas").toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("bills the current month once the business timezone crosses midnight", () => {
    const instant = new Date("2026-10-01T05:00:00.000Z");
    expect(monthStartInTimeZone(instant, "America/Caracas").toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });

  it("falls back to UTC for an unsupported time zone", () => {
    const instant = new Date("2026-09-15T18:30:00.000Z");
    expect(monthStartInTimeZone(instant, "Not/AZone").toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
    expect(monthStartInTimeZone(instant).toISOString()).toBe(
      monthStartUtc(instant).toISOString(),
    );
  });

  it("labels a period key as YYYY-MM", () => {
    expect(formatPeriodKey(new Date("2026-09-01T00:00:00.000Z"))).toBe(
      "2026-09",
    );
  });

  it("exposes a default business time zone", () => {
    expect(BILLING_TIME_ZONE_DEFAULT).toBe("America/Caracas");
  });
});

describe("InvoiceService.markInvoiceFailed", () => {
  it("sets FAILED and writes an audit trail for an unsettled invoice", async () => {
    const prisma = buildPrismaMock();
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.ISSUED,
    });
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.FAILED,
    });
    prisma.financialAuditLog.create.mockResolvedValue({ id: "audit-1" });

    const service = new InvoiceService(prisma as unknown as never);
    await service.markInvoiceFailed("inv-1", "Saldo insuficiente");

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: InvoiceStatus.FAILED },
    });
    expect(prisma.financialAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "INVOICE_PAYMENT_FAILED",
        entityId: "inv-1",
      }),
    });
  });

  it("never downgrades an already-PAID invoice", async () => {
    const prisma = buildPrismaMock();
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.PAID,
    });

    const service = new InvoiceService(prisma as unknown as never);
    await service.markInvoiceFailed("inv-1", "late failure");

    expect(prisma.invoice.update).not.toHaveBeenCalled();
    expect(prisma.financialAuditLog.create).not.toHaveBeenCalled();
  });
});

describe("InvoiceService.listInvoices", () => {
  it("paginates org history and returns the line breakdown", async () => {
    const prisma = buildPrismaMock();
    const invoices = [
      {
        id: "inv-2",
        organizationId: "org-1",
        periodStart: new Date("2026-10-01T00:00:00.000Z"),
        status: InvoiceStatus.PAID,
        lines: [{ id: "l-1", description: "Plan Clínica", amount: 99.99 }],
      },
    ];
    prisma.invoice.findMany.mockResolvedValue(invoices);
    prisma.invoice.count.mockResolvedValue(21);

    const service = new InvoiceService(prisma as unknown as never);
    const result = await service.listInvoices({
      organizationId: "org-1",
      period: "2026-10",
      status: InvoiceStatus.PAID,
      page: 2,
      limit: 10,
    });

    expect(result.list).toBe(invoices);
    expect(result.total).toBe(21);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(2);
    expect(result.hasPrev).toBe(true);
    expect(result.hasNext).toBe(true);

    const where = prisma.invoice.findMany.mock.calls[0][0].where;
    expect(where.organizationId).toBe("org-1");
    expect(where.status).toBe(InvoiceStatus.PAID);
    expect(where.periodStart).toEqual({
      gte: new Date("2026-10-01T00:00:00.000Z"),
      lt: new Date("2026-11-01T00:00:00.000Z"),
    });
    expect(prisma.invoice.findMany.mock.calls[0][0].skip).toBe(10);
    expect(prisma.invoice.findMany.mock.calls[0][0].take).toBe(10);
  });

  it("scopes personal history to organizationId=null and the user", async () => {
    const prisma = buildPrismaMock();
    prisma.invoice.findMany.mockResolvedValue([]);
    prisma.invoice.count.mockResolvedValue(0);

    const service = new InvoiceService(prisma as unknown as never);
    const result = await service.listInvoices({ userId: "user-1" });

    const where = prisma.invoice.findMany.mock.calls[0][0].where;
    expect(where.organizationId).toBeNull();
    expect(where.userId).toBe("user-1");
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
  });
});

describe("InvoiceService.runMonthlyBilling", () => {
  const periodStart = new Date("2026-09-01T00:00:00.000Z");

  function mockOwnerQueries(
    prisma: MockPrisma,
    orgs: Array<{ organizationId: string; autoRenew: boolean }>,
    personal: Array<{ userId: string; autoRenew: boolean }> = [],
  ) {
    prisma.subscription.findMany.mockImplementation(
      (args: { where: { organizationId?: unknown } }) =>
        args.where.organizationId ? orgs : personal,
    );
    prisma.entitlement.findMany.mockResolvedValue([]);
  }

  it("settles auto-renew owners and isolates a per-owner failure", async () => {
    const prisma = buildPrismaMock();
    mockOwnerQueries(prisma, [
      { organizationId: "org-1", autoRenew: true },
      { organizationId: "org-2", autoRenew: true },
    ]);

    const service = new InvoiceService(prisma as unknown as never);
    jest
      .spyOn(service, "generateMonthlyInvoice")
      .mockResolvedValueOnce({
        id: "inv-1",
        status: InvoiceStatus.ISSUED,
      } as any)
      .mockResolvedValueOnce({
        id: "inv-2",
        status: InvoiceStatus.ISSUED,
      } as any);
    jest
      .spyOn(service, "settleInvoice")
      .mockResolvedValueOnce({ id: "inv-1", status: InvoiceStatus.PAID } as any)
      .mockRejectedValueOnce(new BadRequestException("Saldo insuficiente"));
    const markFailed = jest
      .spyOn(service, "markInvoiceFailed")
      .mockResolvedValue(undefined);

    const summary = await service.runMonthlyBilling(periodStart);

    expect(summary.periodKey).toBe("2026-09");
    expect(summary.organizations).toBe(2);
    expect(summary.issued).toBe(2);
    expect(summary.settled).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.errors).toEqual([
      {
        ownerType: "organization",
        ownerId: "org-2",
        message: "Saldo insuficiente",
      },
    ]);
    expect(markFailed).toHaveBeenCalledWith("inv-2", "Saldo insuficiente");
  });

  it("defers settlement when autoRenew is disabled (invoice stays pending)", async () => {
    const prisma = buildPrismaMock();
    mockOwnerQueries(prisma, [{ organizationId: "org-1", autoRenew: false }]);

    const service = new InvoiceService(prisma as unknown as never);
    jest
      .spyOn(service, "generateMonthlyInvoice")
      .mockResolvedValue({ id: "inv-1", status: InvoiceStatus.ISSUED } as any);
    const settle = jest.spyOn(service, "settleInvoice");

    const summary = await service.runMonthlyBilling(periodStart);

    expect(summary.pending).toBe(1);
    expect(summary.settled).toBe(0);
    expect(settle).not.toHaveBeenCalled();
  });

  it("processes personal owners from both subscriptions and entitlements", async () => {
    const prisma = buildPrismaMock();
    mockOwnerQueries(prisma, [], [{ userId: "user-1", autoRenew: true }]);
    prisma.entitlement.findMany.mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" },
    ]);

    const service = new InvoiceService(prisma as unknown as never);
    const generate = jest
      .spyOn(service, "generatePersonalInvoice")
      .mockResolvedValue({ id: "inv-p", status: InvoiceStatus.ISSUED } as any);
    jest
      .spyOn(service, "settleInvoice")
      .mockResolvedValue({ id: "inv-p", status: InvoiceStatus.PAID } as any);

    const summary = await service.runMonthlyBilling(periodStart);

    expect(summary.personalOwners).toBe(2);
    expect(summary.settled).toBe(2);
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
