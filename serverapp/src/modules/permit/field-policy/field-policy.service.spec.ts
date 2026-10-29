import { NotFoundException } from "@nestjs/common";
import { FieldAccess } from "@prisma/client";
import { PrismaService } from "nestjs-prisma";
import { FieldPolicyService } from "./field-policy.service";

function makePrisma() {
  return {
    organizationMember: { findUnique: jest.fn() },
    fieldPolicy: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe("FieldPolicyService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: FieldPolicyService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new FieldPolicyService(prisma as unknown as PrismaService);
  });

  describe("resolveRole", () => {
    it("returns null without a workspace", async () => {
      await expect(service.resolveRole({ id: "u1" }, null)).resolves.toBeNull();
      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });

    it("uses preloaded memberships without hitting the DB", async () => {
      const role = await service.resolveRole(
        {
          id: "u1",
          organizationMembers: [
            { organizationId: "org-a", role: "RECEPTIONIST", status: "ACTIVE" },
          ],
        },
        "org-a",
      );

      expect(role).toBe("RECEPTIONIST");
      expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
    });

    it("falls back to a scoped query when memberships are not preloaded", async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        role: "NUTRITIONIST",
        status: "ACTIVE",
      });

      const role = await service.resolveRole({ id: "u1" }, "org-a");

      expect(role).toBe("NUTRITIONIST");
      expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          organizationId_userId: { organizationId: "org-a", userId: "u1" },
        },
        select: { role: true, status: true },
      });
    });

    it("returns null for an inactive membership", async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        role: "NUTRITIONIST",
        status: "INACTIVE",
      });

      await expect(
        service.resolveRole({ id: "u1" }, "org-a"),
      ).resolves.toBeNull();
    });
  });

  describe("getHiddenFields", () => {
    it("queries HIDDEN policies for the module/role and dedupes keys", async () => {
      prisma.fieldPolicy.findMany.mockResolvedValue([
        { fieldKey: "notes" },
        { fieldKey: "notes" },
        { fieldKey: "reason" },
      ]);

      const fields = await service.getHiddenFields(
        "ATTENDANCE_CONTROL",
        "RECEPTIONIST",
        "attendance.agenda",
      );

      expect(fields).toEqual(["notes", "reason"]);
      expect(prisma.fieldPolicy.findMany).toHaveBeenCalledWith({
        where: {
          moduleKey: "ATTENDANCE_CONTROL",
          role: "RECEPTIONIST",
          access: FieldAccess.HIDDEN,
          formKey: "attendance.agenda",
        },
        select: { fieldKey: true },
      });
    });

    it("omits the formKey filter when not provided", async () => {
      prisma.fieldPolicy.findMany.mockResolvedValue([]);

      await service.getHiddenFields("ATTENDANCE_CONTROL", "RECEPTIONIST");

      expect(prisma.fieldPolicy.findMany).toHaveBeenCalledWith({
        where: {
          moduleKey: "ATTENDANCE_CONTROL",
          role: "RECEPTIONIST",
          access: FieldAccess.HIDDEN,
        },
        select: { fieldKey: true },
      });
    });
  });

  describe("upsert", () => {
    it("upserts on the compound unique and defaults access to EDITABLE", async () => {
      prisma.fieldPolicy.upsert.mockResolvedValue({ id: "p1" });

      await service.upsert({
        moduleKey: "ATTENDANCE_CONTROL",
        role: "RECEPTIONIST",
        formKey: "attendance.agenda",
        fieldKey: "notes",
      });

      expect(prisma.fieldPolicy.upsert).toHaveBeenCalledWith({
        where: {
          moduleKey_role_formKey_fieldKey: {
            moduleKey: "ATTENDANCE_CONTROL",
            role: "RECEPTIONIST",
            formKey: "attendance.agenda",
            fieldKey: "notes",
          },
        },
        update: { access: FieldAccess.EDITABLE },
        create: {
          moduleKey: "ATTENDANCE_CONTROL",
          role: "RECEPTIONIST",
          formKey: "attendance.agenda",
          fieldKey: "notes",
          access: FieldAccess.EDITABLE,
        },
      });
    });
  });

  describe("remove", () => {
    it("throws NotFound when the policy does not exist", async () => {
      prisma.fieldPolicy.findUnique.mockResolvedValue(null);

      await expect(service.remove("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("deletes an existing policy", async () => {
      prisma.fieldPolicy.findUnique.mockResolvedValue({ id: "p1" });
      prisma.fieldPolicy.delete.mockResolvedValue({ id: "p1" });

      await expect(service.remove("p1")).resolves.toEqual({ id: "p1" });
      expect(prisma.fieldPolicy.delete).toHaveBeenCalledWith({
        where: { id: "p1" },
      });
    });
  });
});
