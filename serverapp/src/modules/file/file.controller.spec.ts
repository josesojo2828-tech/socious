import { FileController } from "./file.controller";

/** Respuesta FastifyReply simulada encadenable. */
function mockReply() {
  const res: any = {
    _status: undefined,
    _body: undefined,
    status(code: number) {
      res._status = code;
      return res;
    },
    type() {
      return res;
    },
    header() {
      return res;
    },
    send(body: unknown) {
      res._body = body;
      return res;
    },
  };
  return res;
}

function buildController(getFileStream: jest.Mock) {
  const storage = { getFileStream } as any;
  return { controller: new FileController(storage), storage };
}

/**
 * S3 (legal-compliance): el proxy público /api/file/public/:key solo puede
 * servir assets NO clínicos (portfolio_, profile_, menu_). Documentos de
 * identidad (campus_*) y cualquier otra clave deben devolver 404 sin ni
 * siquiera consultar MinIO.
 */
describe("FileController.getPublicFile — S3", () => {
  it("devuelve 404 para claves clínicas (campus_*) sin consultar MinIO", async () => {
    const getFileStream = jest.fn();
    const { controller } = buildController(getFileStream);
    const res = mockReply();

    await controller.getPublicFile("campus_1700000000_abc.pdf", res);

    expect(res._status).toBe(404);
    expect(getFileStream).not.toHaveBeenCalled();
  });

  it("devuelve 404 para claves arbitrarias sin consultar MinIO", async () => {
    const getFileStream = jest.fn();
    const { controller } = buildController(getFileStream);
    const res = mockReply();

    await controller.getPublicFile("secret-results.pdf", res);

    expect(res._status).toBe(404);
    expect(getFileStream).not.toHaveBeenCalled();
  });

  it("sirve assets públicos (portfolio_*) con cache", async () => {
    const bytes = Buffer.from("img");
    const getFileStream = jest.fn().mockResolvedValue({
      stream: { transformToByteArray: async () => bytes },
      contentType: "image/png",
    });
    const { controller } = buildController(getFileStream);
    const res = mockReply();

    await controller.getPublicFile("portfolio_1_x.png", res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual(bytes);
  });

  it("sirve el logo del tenant (identity_*) sin URL firmada", async () => {
    const bytes = Buffer.from("logo");
    const getFileStream = jest.fn().mockResolvedValue({
      stream: { transformToByteArray: async () => bytes },
      contentType: "image/png",
    });
    const { controller } = buildController(getFileStream);
    const res = mockReply();

    await controller.getPublicFile("identity_1700000000_abc123.png", res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual(bytes);
  });
});

/**
 * The tenant logo is uploaded through the same endpoint as catalog images.
 * `identity` must be an allowed prefix so `logoUrl` can point at the stored
 * key (or at the public URL built from it).
 */
describe("FileController.uploadImage — prefijo identity", () => {
  const buildUploadController = () => {
    const storage = {
      uploadFile: jest.fn().mockResolvedValue(undefined),
      getFileUrl: jest.fn(async (key: string) => `http://minio/bucket/${key}`),
    } as any;
    return { controller: new FileController(storage), storage };
  };

  it("acepta identity y genera la clave con el prefijo existente", async () => {
    const { controller, storage } = buildUploadController();
    const file = {
      buffer: Buffer.from("logo"),
      size: 4,
      mimetype: "image/png",
      originalname: "logo.png",
    } as any;

    const result = await controller.uploadImage(
      {} as any,
      file,
      { prefix: "identity" },
    );

    expect(storage.uploadFile).toHaveBeenCalledWith(
      file.buffer,
      expect.stringMatching(/^identity_\d+_[a-z0-9]+\.png$/),
      "image/png",
    );
    expect(result.key).toMatch(/^identity_\d+_[a-z0-9]+\.png$/);
    expect(result.url).toBe(`http://minio/bucket/${result.key}`);
  });
});
