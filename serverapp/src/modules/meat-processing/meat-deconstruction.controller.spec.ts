import { MeatDeconstructionController } from "./meat-deconstruction.controller";

describe("MeatDeconstructionController", () => {
  let controller: MeatDeconstructionController;
  let deconstructionService: any;
  let workspaceContext: any;
  let prisma: any;

  beforeEach(() => {
    deconstructionService = {
      findAll: jest.fn().mockResolvedValue({ list: [], total: 0 }),
      findOne: jest.fn().mockResolvedValue({ id: "ord-1", orderNumber: "DSP-00001" }),
      create: jest.fn().mockResolvedValue({ id: "ord-1", orderNumber: "DSP-00001" }),
    };
    workspaceContext = {
      getWorkspaceId: jest.fn().mockReturnValue("org-1"),
    };
    prisma = {
      organizationMember: {
        findFirst: jest.fn().mockResolvedValue({ organizationId: "org-1" }),
      },
    };
    controller = new MeatDeconstructionController(
      deconstructionService,
      workspaceContext,
      prisma,
    );
  });

  const mockReq = (permit = "ADMIN") =>
    ({
      user: { id: "u-1", permits: { name: permit } },
    }) as any;

  it("findAll delega con query de paginación", async () => {
    await controller.findAll(mockReq(), 1, 10, "cochino");
    expect(deconstructionService.findAll).toHaveBeenCalledWith("org-1", {
      page: 1,
      limit: 10,
      q: "cochino",
    });
  });

  it("findOne devuelve el detalle de la orden", async () => {
    const res = await controller.findOne(mockReq(), "ord-1");
    expect(res).toEqual({ id: "ord-1", orderNumber: "DSP-00001" });
    expect(deconstructionService.findOne).toHaveBeenCalledWith("org-1", "ord-1");
  });

  it("create pasa userId y orgId al servicio", async () => {
    const dto: any = {
      incomingWeightKg: 80,
      unitCostUSD: 3.0,
      items: [{ productId: "p-1", quantityKg: 20, unitCostUSD: 4.5 }],
    };
    await controller.create(mockReq(), dto);
    expect(deconstructionService.create).toHaveBeenCalledWith("org-1", "u-1", dto);
  });
});
