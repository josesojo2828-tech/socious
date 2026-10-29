import { BadRequestException } from "@nestjs/common";
import { CampusController } from "./campus.controller";
import type { File } from "@nest-lab/fastify-multer";

/**
 * S6/S3 (legal-compliance): the public campus request endpoint must keep
 * its file guards (size, MIME) and store identity documents as PRIVATE
 * files served only through signed URLs.
 */
describe("CampusController.createRequest — file guards (S6)", () => {
  const makeController = () => {
    const campusService = { createRequest: jest.fn().mockResolvedValue({ ok: true }) };
    const storageService = { uploadFile: jest.fn().mockResolvedValue(undefined) };
    const prisma = { file: { create: jest.fn().mockResolvedValue({ id: "file-1" }) } };
    const controller = new CampusController(
      campusService as any,
      storageService as any,
      prisma as any,
    );
    return { controller, campusService, storageService, prisma };
  };

  const makeFile = (overrides: Partial<File> = {}): File =>
    ({
      buffer: Buffer.from("documento"),
      size: 1024,
      mimetype: "application/pdf",
      originalname: "cedula.pdf",
      ...overrides,
    }) as File;

  it("rejects the request when no document is provided", async () => {
    const { controller, prisma } = makeController();
    await expect(
      controller.createRequest({} as any, undefined as any),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.file.create).not.toHaveBeenCalled();
  });

  it("rejects documents larger than 10MB", async () => {
    const { controller, storageService } = makeController();
    const bigFile = makeFile({ size: 11 * 1024 * 1024 });
    await expect(
      controller.createRequest({} as any, bigFile),
    ).rejects.toThrow("El archivo excede el tamaño máximo permitido de 10MB.");
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it("rejects disallowed MIME types (only PDF/PNG/JPG)", async () => {
    const { controller, storageService } = makeController();
    const badFile = makeFile({ mimetype: "application/x-msdownload" });
    await expect(
      controller.createRequest({} as any, badFile),
    ).rejects.toThrow("El formato de archivo no está permitido. Solo PDF, PNG, JPG, JPEG.");
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it("stores accepted documents with PRIVATE visibility", async () => {
    const { controller, storageService, prisma } = makeController();
    const okFile = makeFile();

    await controller.createRequest({ email: "a@b.com" } as any, okFile);

    expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    expect(prisma.file.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ visibility: "PRIVATE" }),
      }),
    );
  });
});
