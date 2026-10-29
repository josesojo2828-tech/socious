import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingHistoryQueryDto } from "./dto/billing-history.dto";

function makeController(opts?: {
  workspaceId?: string | null;
  membership?: { status: string } | null;
}) {
  const invoiceService = {
    listInvoices: jest.fn().mockResolvedValue({ list: [], total: 0 }),
    getInvoiceById: jest.fn(),
  };
  const prisma = {
    organizationMember: {
      findUnique: jest.fn().mockResolvedValue(opts?.membership ?? null),
    },
  };
  const workspaceContext = {
    getWorkspaceId: jest.fn().mockReturnValue(opts?.workspaceId ?? null),
  };

  const controller = new BillingController(
    invoiceService as any,
    prisma as any,
    workspaceContext as any,
  );

  return { controller, invoiceService, prisma, workspaceContext };
}

function makeRequest(
  permitName: string,
  userId = "user-1",
  headers: Record<string, string> = {},
): any {
  return {
    user: {
      id: userId,
      email: `${userId}@test.dev`,
      permits: { name: permitName },
    },
    headers,
  };
}

function query(
  partial: Partial<BillingHistoryQueryDto>,
): BillingHistoryQueryDto {
  return Object.assign(new BillingHistoryQueryDto(), partial);
}

describe("BillingController", () => {
  describe("owner resolution", () => {
    it("defaults to the workspace organization when x-workspace-id is present", async () => {
      const { controller, invoiceService } = makeController({
        workspaceId: "org-a",
        membership: { status: "ACTIVE" },
      });

      await controller.listInvoices(
        makeRequest("NUTRITIONIST", "user-1", { "x-workspace-id": "org-a" }),
        query({}),
      );

      expect(invoiceService.listInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-a" }),
      );
    });

    it("defaults to the caller's personal invoices without a workspace", async () => {
      const { controller, invoiceService } = makeController({
        workspaceId: null,
      });

      await controller.listInvoices(makeRequest("NUTRITIONIST"), query({}));

      expect(invoiceService.listInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1" }),
      );
    });

    it("honors an explicit organization owner after membership check", async () => {
      const { controller, invoiceService } = makeController({
        membership: { status: "ACTIVE" },
      });

      await controller.listInvoices(
        makeRequest("NUTRITIONIST"),
        query({ ownerType: "organization", ownerId: "org-b" }),
      );

      expect(invoiceService.listInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-b" }),
      );
    });

    it("requires ownerId for an explicit owner", async () => {
      const { controller } = makeController({});

      await expect(
        controller.listInvoices(
          makeRequest("NUTRITIONIST"),
          query({ ownerType: "organization" }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("access control", () => {
    it("rejects org history when the caller is not an ACTIVE member", async () => {
      const { controller, invoiceService } = makeController({
        workspaceId: "org-a",
        membership: null,
      });

      await expect(
        controller.listInvoices(
          makeRequest("NUTRITIONIST", "user-1", { "x-workspace-id": "org-a" }),
          query({}),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(invoiceService.listInvoices).not.toHaveBeenCalled();
    });

    it("rejects another user's personal history", async () => {
      const { controller } = makeController({});

      await expect(
        controller.listInvoices(
          makeRequest("NUTRITIONIST", "user-1"),
          query({ ownerType: "user", ownerId: "user-2" }),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("lets a global admin read any owner without a membership row", async () => {
      const { controller, invoiceService } = makeController({
        membership: null,
      });

      await controller.listInvoices(
        makeRequest("SUPERADMIN", "admin-1"),
        query({ ownerType: "organization", ownerId: "org-z" }),
      );

      expect(invoiceService.listInvoices).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-z" }),
      );
    });
  });

  describe("getInvoice", () => {
    it("returns an org invoice for an ACTIVE member", async () => {
      const { controller, invoiceService } = makeController({
        membership: { status: "ACTIVE" },
      });
      invoiceService.getInvoiceById.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-a",
        userId: null,
      });

      const result = await controller.getInvoice(
        makeRequest("NUTRITIONIST", "user-1", { "x-workspace-id": "org-a" }),
        "inv-1",
      );

      expect(result.id).toBe("inv-1");
    });

    it("throws 404 when the invoice does not exist", async () => {
      const { controller, invoiceService } = makeController({});
      invoiceService.getInvoiceById.mockResolvedValue(null);

      await expect(
        controller.getInvoice(makeRequest("NUTRITIONIST"), "missing"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("forbids reading another org's invoice", async () => {
      const { controller, invoiceService } = makeController({
        membership: null,
      });
      invoiceService.getInvoiceById.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-a",
        userId: null,
      });

      await expect(
        controller.getInvoice(makeRequest("NUTRITIONIST"), "inv-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
