import { GLOBAL_TENANT_KEY, SequenceService } from "./sequence.service";

const makeDb = (values: number[]) => {
  let i = 0;
  const upsert = jest.fn(async (_args: any) => ({
    value: values[i++] ?? values[values.length - 1],
  }));
  return { db: { counter: { upsert } } as any, upsert };
};

describe("SequenceService", () => {
  it("numbers documents from 1 per scope and tenant", async () => {
    const { db, upsert } = makeDb([1]);
    const service = new SequenceService({} as any);

    await expect(service.next("SALE", "org-1", db)).resolves.toBe(1);
    expect(upsert).toHaveBeenCalledWith({
      where: { tenantKey_scope: { tenantKey: "org-1", scope: "SALE" } },
      create: { tenantKey: "org-1", scope: "SALE", value: 1 },
      update: { value: { increment: 1 } },
      select: { value: true },
    });
  });

  it("falls back to the GLOBAL tenant key without an organization", async () => {
    const { db, upsert } = makeDb([7]);
    const service = new SequenceService({} as any);

    await service.next("ORDER", null, db);

    expect(upsert.mock.calls[0]?.[0].where.tenantKey_scope.tenantKey).toBe(
      GLOBAL_TENANT_KEY,
    );
  });

  it("keeps separate counters per scope", async () => {
    const { db, upsert } = makeDb([3, 9]);
    const service = new SequenceService({} as any);

    await service.next("SALE", "org-1", db);
    await service.next("PURCHASE", "org-1", db);

    expect(upsert.mock.calls[0]?.[0].where.tenantKey_scope.scope).toBe("SALE");
    expect(upsert.mock.calls[1]?.[0].where.tenantKey_scope.scope).toBe("PURCHASE");
  });

  it("formats a zero-padded document number", async () => {
    const { db } = makeDb([42]);
    const service = new SequenceService({} as any);

    await expect(
      service.nextFormatted("SALE", "org-1", "VTA", 5, db),
    ).resolves.toBe("VTA-00042");
  });

  it("uses the injected root client when no transaction is passed", async () => {
    const { db, upsert } = makeDb([1]);
    const service = new SequenceService(db);

    await service.next("SALE", "org-1");

    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
