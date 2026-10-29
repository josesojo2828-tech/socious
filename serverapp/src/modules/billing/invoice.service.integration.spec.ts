import { InvoiceStatus, SubscriptionStatus } from "@prisma/client";

import { InvoiceService } from "./invoice.service";

/**
 * Integration coverage for the invoice engine's idempotency contract.
 *
 * The repo's integration specs run the REAL service against an in-memory Prisma
 * fake (see `adoption-analytics.integration.spec.ts`). This fake enforces the
 * polymorphic partial-unique semantics of `Invoice` with a real P2002 error, so
 * two consecutive generation calls prove "re-run → no duplicate" without
 * mutating the shared local database.
 */

interface FakeInvoiceLine {
  id: string;
  type: string;
  description: string;
  quantity: number;
  amount: number;
}

interface FakeInvoice {
  id: string;
  organizationId: string | null;
  userId: string | null;
  periodStart: Date;
  periodEnd: Date;
  status: InvoiceStatus;
  subtotal: number;
  total: number;
  lines: FakeInvoiceLine[];
}

interface FindFirstWhere {
  organizationId?: string | null;
  userId?: string | null;
  periodStart: Date;
}

interface ListWhere {
  organizationId?: string | null;
  userId?: string | null;
  periodStart?: Date;
}

interface CreateData {
  organizationId?: string | null;
  userId?: string | null;
  periodStart: Date;
  periodEnd: Date;
  status: InvoiceStatus;
  subtotal: number;
  total: number;
  lines?: { create?: Array<Record<string, unknown>> };
}

class InMemoryInvoiceStore {
  readonly invoices: FakeInvoice[] = [];
  private sequence = 0;

  findFirst(where: FindFirstWhere): FakeInvoice | null {
    return (
      this.invoices.find((invoice) => {
        const orgMatch =
          where.organizationId === undefined ||
          invoice.organizationId === where.organizationId;
        const userMatch =
          where.userId === undefined || invoice.userId === where.userId;
        return (
          orgMatch &&
          userMatch &&
          invoice.periodStart.getTime() === where.periodStart.getTime()
        );
      }) ?? null
    );
  }

  findMany(where: ListWhere = {}): FakeInvoice[] {
    return this.invoices
      .filter((invoice) => {
        const orgMatch =
          where.organizationId === undefined ||
          invoice.organizationId === where.organizationId;
        const userMatch =
          where.userId === undefined || invoice.userId === where.userId;
        const periodMatch =
          where.periodStart === undefined ||
          invoice.periodStart.getTime() === where.periodStart.getTime();
        return orgMatch && userMatch && periodMatch;
      })
      .sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime());
  }

  count(where: ListWhere = {}): number {
    return this.findMany(where).length;
  }

  create(data: CreateData): FakeInvoice {
    const duplicate = this.findFirst({
      organizationId: data.organizationId ?? null,
      userId: data.userId ?? null,
      periodStart: data.periodStart,
    });
    if (duplicate) {
      const error = new Error("Unique constraint failed") as Error & {
        code: string;
      };
      error.code = "P2002";
      throw error;
    }

    this.sequence += 1;
    const invoice: FakeInvoice = {
      id: `inv-${this.sequence}`,
      organizationId: data.organizationId ?? null,
      userId: data.userId ?? null,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      status: data.status,
      subtotal: data.subtotal,
      total: data.total,
      lines: (data.lines?.create ?? []).map((line, index) => ({
        id: `line-${this.sequence}-${index}`,
        type: String(line.type),
        description:
          typeof line.description === "string" ? line.description : "",
        quantity: Number(line.quantity ?? 1),
        amount: Number(line.amount),
      })),
    };
    this.invoices.push(invoice);
    return invoice;
  }
}

type FindFirstArgs = { where: FindFirstWhere };
type CreateArgs = { data: CreateData };

function buildFakePrisma(store: InMemoryInvoiceStore) {
  return {
    organization: {
      findFirst: jest.fn().mockResolvedValue({
        id: "org-1",
        maxSeats: 7,
        subscriptions: [
          {
            userId: "payer-1",
            status: SubscriptionStatus.ACTIVE,
            plan: { name: "Clínica", price: 99.99, currency: "USD" },
          },
        ],
      }),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({
        id: "user-1",
        subscriptions: [
          {
            userId: "user-1",
            status: SubscriptionStatus.ACTIVE,
            plan: { name: "Premium", price: 49.99, currency: "USD" },
          },
        ],
      }),
    },
    entitlement: { findMany: jest.fn().mockResolvedValue([]) },
    invoice: {
      findFirst: jest.fn((args: FindFirstArgs) =>
        Promise.resolve(store.findFirst(args.where)),
      ),
      findMany: jest.fn((args: { where?: ListWhere }) =>
        Promise.resolve(store.findMany(args?.where)),
      ),
      count: jest.fn((args: { where?: ListWhere }) =>
        Promise.resolve(store.count(args?.where)),
      ),
      create: jest.fn((args: CreateArgs) =>
        Promise.resolve(store.create(args.data)),
      ),
    },
  };
}

describe("InvoiceService idempotency (in-memory store)", () => {
  const periodStart = new Date("2026-09-01T00:00:00.000Z");

  it("re-running the monthly pass creates exactly one invoice per period", async () => {
    const store = new InMemoryInvoiceStore();
    const prisma = buildFakePrisma(store);
    const service = new InvoiceService(prisma as unknown as never);

    const first = await service.generateMonthlyInvoice("org-1", periodStart);
    const second = await service.generateMonthlyInvoice("org-1", periodStart);

    expect(store.invoices).toHaveLength(1);
    expect(first?.id).toBe(second?.id);
    expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
  });

  it("issues a distinct invoice for a different period", async () => {
    const store = new InMemoryInvoiceStore();
    const prisma = buildFakePrisma(store);
    const service = new InvoiceService(prisma as unknown as never);

    const september = await service.generateMonthlyInvoice(
      "org-1",
      periodStart,
    );
    const october = await service.generateMonthlyInvoice(
      "org-1",
      new Date("2026-10-15T12:00:00.000Z"),
    );

    expect(store.invoices).toHaveLength(2);
    expect(september?.id).not.toBe(october?.id);
    expect(october?.periodStart.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("normalizes non-midnight input to the same period key", async () => {
    const store = new InMemoryInvoiceStore();
    const prisma = buildFakePrisma(store);
    const service = new InvoiceService(prisma as unknown as never);

    const a = await service.generateMonthlyInvoice(
      "org-1",
      new Date("2026-09-01T00:00:00.000Z"),
    );
    const b = await service.generateMonthlyInvoice(
      "org-1",
      new Date("2026-09-28T23:59:59.000Z"),
    );

    expect(store.invoices).toHaveLength(1);
    expect(a?.id).toBe(b?.id);
  });

  it("re-running the personal pass creates exactly one personal invoice per period", async () => {
    const store = new InMemoryInvoiceStore();
    const prisma = buildFakePrisma(store);
    prisma.entitlement.findMany.mockResolvedValue([
      {
        id: "ent-p1",
        addOnId: "addon-1",
        quantity: 1,
        priceAtPurchase: 20,
        addOn: { name: "Control de Asistencia" },
      },
    ]);
    const service = new InvoiceService(prisma as unknown as never);

    const first = await service.generatePersonalInvoice("user-1", periodStart);
    const second = await service.generatePersonalInvoice("user-1", periodStart);

    expect(store.invoices).toHaveLength(1);
    expect(first?.id).toBe(second?.id);
    expect(store.invoices[0].organizationId).toBeNull();
    expect(store.invoices[0].userId).toBe("user-1");
    expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
  });

  it("keeps personal and org invoices for the same period independent", async () => {
    const store = new InMemoryInvoiceStore();
    const prisma = buildFakePrisma(store);
    prisma.entitlement.findMany.mockResolvedValue([
      {
        id: "ent-p1",
        addOnId: "addon-1",
        quantity: 1,
        priceAtPurchase: 20,
        addOn: { name: "Control de Asistencia" },
      },
    ]);
    const service = new InvoiceService(prisma as unknown as never);

    await service.generateMonthlyInvoice("org-1", periodStart);
    await service.generatePersonalInvoice("user-1", periodStart);

    expect(store.invoices).toHaveLength(2);
    expect(
      store.invoices.filter((i) => i.organizationId === null),
    ).toHaveLength(1);
    expect(store.invoices.filter((i) => i.userId === "user-1")).toHaveLength(1);
  });

  it("persists invoices with their line breakdown and serves them as history", async () => {
    const store = new InMemoryInvoiceStore();
    const prisma = buildFakePrisma(store);
    const service = new InvoiceService(prisma as unknown as never);

    await service.generateMonthlyInvoice(
      "org-1",
      new Date("2026-09-01T00:00:00.000Z"),
    );
    await service.generateMonthlyInvoice(
      "org-1",
      new Date("2026-10-15T12:00:00.000Z"),
    );

    const history = await service.listInvoices({ organizationId: "org-1" });

    expect(history.total).toBe(2);
    expect(history.list).toHaveLength(2);
    expect(history.list[0].periodStart.toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
    expect(history.list[1].periodStart.toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
    expect(history.list[0].lines.length).toBeGreaterThan(0);
    expect(history.list[0].lines[0]).toMatchObject({
      type: "BASE_PLAN",
      description: "Plan Clínica",
      quantity: 1,
    });
  });
});
