import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PurchaseController } from "./purchase.controller";
import { SavePurchaseDraftDto } from "./dto/purchase.dto";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

const memberUser = { id: "u-1", permits: { name: "USER" } };

const VALID_PAYLOAD = {
  supplierId: "sup-1",
  issueDate: "2026-11-01",
  dueDate: "2026-11-15",
  notes: "Factura A-123",
  items: [{ productName: "Harina", quantity: "2", unitCostUSD: "10.5" }],
};

/**
 * Draft endpoints contract (S13): `/api/purchases/drafts` is a per
 * org+creator slot — never a global collection.
 *
 *  - GET    answers MY draft (or null) scoped to the resolved organization
 *  - PUT    upserts it keyed on [organizationId, createdById]
 *  - DELETE removes MY draft only
 *
 * `SavePurchaseDraftDto` carries the payload shape check; the global
 * ValidationPipe (whitelist + forbidNonWhitelisted + transform in
 * src/main.ts) is what turns a failing DTO into the HTTP 400, so the DTO is
 * exercised through class-validator exactly like the pipe does.
 */
const makeController = ({
  requestedOrgId = ORG_A as string | null,
  user = memberUser as unknown,
  draft = null as unknown,
  memberships = [ORG_A] as string[],
} = {}) => {
  const purchaseService = {
    getReport: jest.fn(),
    list: jest.fn(),
    getOne: jest.fn(),
    create: jest.fn(),
    receive: jest.fn(),
    addPayment: jest.fn(),
    cancel: jest.fn(),
  };

  const workspaceContext = {
    getWorkspaceId: jest.fn(() => requestedOrgId),
  };

  const prisma = {
    organizationMember: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (where.userId !== (memberUser as { id: string }).id) return null;
        if (where.status && where.status !== "ACTIVE") return null;
        if (!memberships.includes(where.organizationId)) return null;
        return { id: "m-1", organizationId: where.organizationId };
      }),
    },
    purchaseDraft: {
      findFirst: jest.fn(async () => draft),
      create: jest.fn(async (args: any) => ({
        id: "draft-1",
        name: null,
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-01T10:00:00.000Z",
        ...args.data,
      })),
      update: jest.fn(async (args: any) => ({
        id: "draft-1",
        ...args.data,
      })),
      deleteMany: jest.fn(async () => ({ count: 1 })),
    },
  };

  const controller = new PurchaseController(
    purchaseService as any,
    workspaceContext as any,
    prisma as any,
  );

  return { controller, prisma, purchaseService };
};

const request = (user: unknown) => ({ user, headers: {} }) as any;

const saveBody = (payload: unknown) =>
  plainToInstance(SavePurchaseDraftDto, { payload });

describe("PurchaseController — GET /api/purchases/drafts (S13)", () => {
  it("answers MY draft scoped to the resolved organization and creator", async () => {
    const stored = { id: "draft-1", payload: VALID_PAYLOAD };
    const { controller, prisma } = makeController({ draft: stored });

    const result = await controller.getDraft(request(memberUser));

    expect(result).toBe(stored);
    expect(prisma.purchaseDraft.findFirst).toHaveBeenCalledWith({
      where: { organizationId: ORG_A, createdById: "u-1" },
    });
  });

  it("answers null in the personal context without querying", async () => {
    const { controller, prisma } = makeController({ requestedOrgId: null });

    await expect(controller.getDraft(request(memberUser))).resolves.toBeNull();
    expect(prisma.purchaseDraft.findFirst).not.toHaveBeenCalled();
  });

  it("never reads another organization's draft", async () => {
    // Asks for ORG_B but only holds an ACTIVE membership in ORG_A: the scope
    // rule degrades to the personal context instead of leaking ORG_B's draft.
    const { controller, prisma } = makeController({
      requestedOrgId: ORG_B,
      memberships: [ORG_A],
      draft: { id: "foreign" },
    });

    await expect(controller.getDraft(request(memberUser))).resolves.toBeNull();
    expect(prisma.purchaseDraft.findFirst).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated call", async () => {
    const { controller, prisma } = makeController({ user: null });

    await expect(controller.getDraft(request(null))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.purchaseDraft.findFirst).not.toHaveBeenCalled();
  });
});

describe("PurchaseController — PUT /api/purchases/drafts (S13)", () => {
  it("updates MY draft keyed on organization + creator", async () => {
    const { controller, prisma } = makeController({
      draft: { id: "draft-1", payload: { items: [] } },
    });

    await controller.saveDraft(request(memberUser), saveBody(VALID_PAYLOAD) as any);

    expect(prisma.purchaseDraft.findFirst).toHaveBeenCalledWith({
      where: { organizationId: ORG_A, createdById: "u-1" },
    });
    expect(prisma.purchaseDraft.update).toHaveBeenCalledWith({
      where: { id: "draft-1" },
      data: { name: null, payload: VALID_PAYLOAD },
    });
    expect(prisma.purchaseDraft.create).not.toHaveBeenCalled();
  });

  it("creates MY draft on the same key when none exists yet", async () => {
    const { controller, prisma } = makeController({ draft: null });

    await controller.saveDraft(request(memberUser), saveBody(VALID_PAYLOAD) as any);

    expect(prisma.purchaseDraft.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG_A,
        createdById: "u-1",
        name: null,
        payload: VALID_PAYLOAD,
      },
    });
    expect(prisma.purchaseDraft.update).not.toHaveBeenCalled();
  });

  it("stores the draft name when the body sends one", async () => {
    const { controller, prisma } = makeController({ draft: null });
    const body = plainToInstance(SavePurchaseDraftDto, {
      name: "Semana 44",
      payload: VALID_PAYLOAD,
    });

    await controller.saveDraft(request(memberUser), body as any);

    expect(prisma.purchaseDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Semana 44" }),
      }),
    );
  });

  it("refuses to save without an organization (drafts are org-keyed)", async () => {
    const { controller, prisma } = makeController({ requestedOrgId: null });

    await expect(
      controller.saveDraft(request(memberUser), saveBody(VALID_PAYLOAD) as any),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.purchaseDraft.create).not.toHaveBeenCalled();
    expect(prisma.purchaseDraft.update).not.toHaveBeenCalled();
  });

  it("rejects a payload that is not an object with an items array", async () => {
    const notAnObject = await validate(saveBody("texto"));
    expect(notAnObject).not.toHaveLength(0);
    expect(notAnObject[0].constraints).toBeDefined();

    const withoutItems = await validate(saveBody({ supplierId: "sup-1" }));
    expect(withoutItems).not.toHaveLength(0);
    expect(JSON.stringify(withoutItems[0].constraints)).toMatch(/items/);

    const itemsNotArray = await validate(saveBody({ items: "nope" }));
    expect(itemsNotArray).not.toHaveLength(0);
  });

  it("accepts the payload the screen sends", async () => {
    await expect(validate(saveBody(VALID_PAYLOAD))).resolves.toHaveLength(0);
    await expect(
      validate(plainToInstance(SavePurchaseDraftDto, { payload: VALID_PAYLOAD })),
    ).resolves.toHaveLength(0);
  });
});

describe("PurchaseController — DELETE /api/purchases/drafts (S13)", () => {
  it("deletes only mine and answers { deleted: true }", async () => {
    const { controller, prisma } = makeController();

    await expect(
      controller.deleteDraft(request(memberUser)),
    ).resolves.toEqual({ deleted: true });
    expect(prisma.purchaseDraft.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_A, createdById: "u-1" },
    });
  });

  it("is idempotent in the personal context (nothing to delete, no query)", async () => {
    const { controller, prisma } = makeController({ requestedOrgId: null });

    await expect(
      controller.deleteDraft(request(memberUser)),
    ).resolves.toEqual({ deleted: true });
    expect(prisma.purchaseDraft.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated call", async () => {
    const { controller, prisma } = makeController({ user: null });

    await expect(controller.deleteDraft(request(null))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.purchaseDraft.deleteMany).not.toHaveBeenCalled();
  });
});
