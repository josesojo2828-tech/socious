import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { OrganizationScopeService } from "src/shared/services/organization-scope.service";
import { InitialLoadController } from "./initial-load.controller";

const REQUEST = { user: { id: "user-1" } } as any;

const makeController = () => {
  const service = {
    template: jest.fn().mockReturnValue("\uFEFFfecha,cliente_nombre"),
    validate: jest.fn().mockResolvedValue({ ok: true }),
    commit: jest
      .fn()
      .mockResolvedValue({ created: { sales: 0, clients: 0, products: 0 } }),
    createManual: jest.fn().mockResolvedValue({ saleId: "sale-1" }),
  };
  const workspaceContext = { getWorkspaceId: jest.fn().mockReturnValue(undefined) };
  const controller = new InitialLoadController(
    service as any,
    workspaceContext as any,
    {} as any,
  );
  return { controller, service };
};

const scopeResult = (organizationId: string | null) => ({
  organizationId,
  source: organizationId ? "own-membership" : "personal",
  isGlobalRole: false,
});

afterEach(() => jest.restoreAllMocks());

describe("InitialLoadController", () => {
  it("rejects validate without a resolved organization", async () => {
    jest
      .spyOn(OrganizationScopeService.prototype, "resolveOrganizationScope")
      .mockResolvedValue(scopeResult(null) as any);
    const { controller } = makeController();

    await expect(
      controller.validate(REQUEST, { content: "x" }),
    ).rejects.toThrow(
      new BadRequestException(
        "Selecciona un espacio de negocio para cargar datos iniciales.",
      ),
    );
  });

  it("rejects commit without a resolved organization", async () => {
    jest
      .spyOn(OrganizationScopeService.prototype, "resolveOrganizationScope")
      .mockResolvedValue(scopeResult(null) as any);
    const { controller } = makeController();

    await expect(
      controller.commit(REQUEST, { content: "x" }),
    ).rejects.toThrow(
      "Selecciona un espacio de negocio para cargar datos iniciales.",
    );
  });

  it("delegates validate and commit with the resolved scope", async () => {
    jest
      .spyOn(OrganizationScopeService.prototype, "resolveOrganizationScope")
      .mockResolvedValue(scopeResult("org-1") as any);
    const { controller, service } = makeController();

    await controller.validate(REQUEST, { content: "x" });
    await controller.commit(REQUEST, { content: "x" });

    expect(service.validate).toHaveBeenCalledWith(
      { organizationId: "org-1", createdById: "user-1" },
      { content: "x" },
    );
    expect(service.commit).toHaveBeenCalledWith(
      { organizationId: "org-1", createdById: "user-1" },
      { content: "x" },
    );
  });

  it("rejects a manual creation without a resolved organization", async () => {
    jest
      .spyOn(OrganizationScopeService.prototype, "resolveOrganizationScope")
      .mockResolvedValue(scopeResult(null) as any);
    const { controller } = makeController();

    await expect(
      controller.createManual(REQUEST, {
        clientName: "Ana",
        productName: "Arroz",
        quantity: 1,
        unitPriceUSD: 2,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        "Selecciona un espacio de negocio para cargar datos iniciales.",
      ),
    );
  });

  it("rejects a manual creation without a client and a product", async () => {
    jest
      .spyOn(OrganizationScopeService.prototype, "resolveOrganizationScope")
      .mockResolvedValue(scopeResult("org-1") as any);
    const { controller, service } = makeController();

    await expect(
      controller.createManual(REQUEST, {
        quantity: 1,
        unitPriceUSD: 2,
      } as any),
    ).rejects.toThrow(
      "Indica un cliente o un nombre de cliente.",
    );
    expect(service.createManual).not.toHaveBeenCalled();
  });

  it("delegates a manual creation with the resolved scope", async () => {
    jest
      .spyOn(OrganizationScopeService.prototype, "resolveOrganizationScope")
      .mockResolvedValue(scopeResult("org-1") as any);
    const { controller, service } = makeController();
    const body = {
      clientName: "Ana",
      productName: "Arroz",
      quantity: 1,
      unitPriceUSD: 2,
    };

    await controller.createManual(REQUEST, body);

    expect(service.createManual).toHaveBeenCalledWith(
      { organizationId: "org-1", createdById: "user-1" },
      body,
    );
  });

  it("serves the template as a downloadable UTF-8 CSV", () => {
    const { controller } = makeController();
    const reply = { header: jest.fn() };

    const body = controller.template(reply as any);

    expect(body.startsWith("\uFEFF")).toBe(true);
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Type",
      "text/csv; charset=utf-8",
    );
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="plantilla-cuentas-por-cobrar.csv"',
    );
  });
});
