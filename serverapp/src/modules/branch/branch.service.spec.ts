import { ConflictException, ForbiddenException } from "@nestjs/common";
import { BranchService } from "./branch.service";

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const makeService = (opts: {
  subscription?: any;
  branches?: any[];
  count?: number;
  documents?: { sales?: number; orders?: number; registers?: number };
  existing?: any;
  createError?: any;
} = {}) => {
  const prisma: any = {
    subscription: {
      findFirst: jest.fn().mockResolvedValue(opts.subscription ?? null),
    },
    branch: {
      findMany: jest.fn().mockResolvedValue(opts.branches ?? []),
      count: jest.fn().mockResolvedValue(opts.count ?? 1),
      findFirst: jest.fn().mockResolvedValue(opts.existing ?? null),
      create: jest.fn(
        opts.createError
          ? () => Promise.reject(opts.createError)
          : async (args: any) => ({ id: "branch-new", ...args.data }),
      ),
      update: jest.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
      delete: jest.fn(async () => ({ id: "x" })),
    },
    sale: { count: jest.fn().mockResolvedValue(opts.documents?.sales ?? 0) },
    order: { count: jest.fn().mockResolvedValue(opts.documents?.orders ?? 0) },
    cashRegister: {
      count: jest.fn().mockResolvedValue(opts.documents?.registers ?? 0),
    },
  };

  return { service: new BranchService(prisma), prisma };
};

const scope = (organizationId: string | null = ORG_A) => ({ organizationId });

const premiumPlan = {
  plan: { content: { capacity: { maxBranches: 3, includedSeats: 6 } } },
};

describe("BranchService (S10)", () => {
  it("refuses a personal context", async () => {
    const { service } = makeService();

    await expect(service.list(scope(null))).rejects.toThrow(ForbiddenException);
  });

  it("lists the branches of the workspace", async () => {
    const { service, prisma } = makeService({
      branches: [{ id: "b-1", name: "Principal", isDefault: true }],
    });

    const list = await service.list(scope());

    expect(list).toHaveLength(1);
    expect(prisma.branch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: ORG_A } }),
    );
  });

  it("refuses to extend past the plan capacity", async () => {
    const { service } = makeService({
      subscription: {
        plan: { content: { capacity: { maxBranches: 2, includedSeats: 4 } } },
      },
      count: 2,
    });

    await expect(
      service.create(scope(), { name: "Sucursal Norte" }),
    ).rejects.toThrow(/Tu plan permite 2 sucursal/);
  });

  it("creates a branch while the plan allows it", async () => {
    const { service, prisma } = makeService({
      subscription: premiumPlan,
      count: 1,
    });

    await service.create(scope(), { name: "Sucursal Norte" });

    expect(prisma.branch.create.mock.calls[0][0].data).toMatchObject({
      organizationId: ORG_A,
      name: "Sucursal Norte",
    });
  });

  it("falls back to one branch when there is no readable plan", async () => {
    const { service } = makeService({ subscription: null, count: 1 });

    await expect(service.create(scope(), { name: "Otra" })).rejects.toThrow(
      /Tu plan permite 1 sucursal/,
    );
  });

  it("maps a duplicated name to a clear conflict", async () => {
    const { service } = makeService({
      subscription: premiumPlan,
      count: 1,
      createError: Object.assign(new Error("unique"), { code: "P2002" }),
    });

    await expect(
      service.create(scope(), { name: "Principal" }),
    ).rejects.toThrow(/Ya existe una sucursal llamada "Principal"/);
  });

  it("never deletes the default branch", async () => {
    const { service } = makeService({
      existing: { id: "b-1", organizationId: ORG_A, isDefault: true, name: "Principal" },
    });

    await expect(service.remove(scope(), "b-1")).rejects.toThrow(
      /no se elimina/,
    );
  });

  it("refuses to delete a branch that holds documents", async () => {
    const { service } = makeService({
      existing: { id: "b-2", organizationId: ORG_A, isDefault: false, name: "Norte" },
      documents: { sales: 3 },
    });

    await expect(service.remove(scope(), "b-2")).rejects.toThrow(
      /desactívala en lugar de eliminarla/,
    );
  });

  it("deletes an empty secondary branch", async () => {
    const { service, prisma } = makeService({
      existing: { id: "b-2", organizationId: ORG_A, isDefault: false, name: "Norte" },
    });

    await expect(service.remove(scope(), "b-2")).resolves.toEqual({
      id: "b-2",
      deleted: true,
    });
    expect(prisma.branch.delete).toHaveBeenCalled();
  });
});
