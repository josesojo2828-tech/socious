import { MeatCarcassController } from "./meat-carcass.controller";

describe("MeatCarcassController", () => {
  let controller: MeatCarcassController;
  let carcassService: any;
  let workspaceContext: any;
  let prisma: any;

  beforeEach(() => {
    carcassService = {
      findAll: jest.fn().mockResolvedValue([{ id: "c-1", name: "Cochino en canal" }]),
      findOne: jest.fn().mockResolvedValue({ id: "c-1", name: "Cochino en canal" }),
      create: jest.fn().mockResolvedValue({ id: "c-1", name: "Cochino en canal" }),
      update: jest.fn().mockResolvedValue({ id: "c-1", name: "Cochino modificado" }),
      delete: jest.fn().mockResolvedValue({ id: "c-1" }),
      getLastDeconstruction: jest.fn().mockResolvedValue({ orderNumber: "DSP-00001" }),
    };
    workspaceContext = {
      getWorkspaceId: jest.fn().mockReturnValue("org-1"),
    };
    prisma = {
      organizationMember: {
        findFirst: jest.fn().mockResolvedValue({ organizationId: "org-1" }),
      },
    };
    controller = new MeatCarcassController(carcassService, workspaceContext, prisma);
  });

  const mockReq = (permit = "ADMIN") =>
    ({
      user: { id: "u-1", permits: { name: permit } },
    }) as any;

  it("findAll retorna la lista de piezas", async () => {
    const res = await controller.findAll(mockReq());
    expect(res).toHaveLength(1);
    expect(carcassService.findAll).toHaveBeenCalledWith("org-1");
  });

  it("getLastDeconstruction llama al servicio con el id de la pieza", async () => {
    const res = await controller.getLastDeconstruction(mockReq(), "c-1");
    expect(res).toEqual({ orderNumber: "DSP-00001" });
    expect(carcassService.getLastDeconstruction).toHaveBeenCalledWith("org-1", "c-1");
  });

  it("create delega al servicio", async () => {
    await controller.create(mockReq(), { name: "Cochino en canal", defaultCostUSD: 2.8 });
    expect(carcassService.create).toHaveBeenCalledWith("org-1", {
      name: "Cochino en canal",
      defaultCostUSD: 2.8,
    });
  });
});
