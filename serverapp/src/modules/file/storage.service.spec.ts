import { StorageService } from "./storage.service";
import {
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";

function buildService() {
  const config = {
    get: (key: string, def?: string) => {
      const values: Record<string, string> = {
        MINIO_BUCKET: "test-bucket",
      };
      return values[key] ?? def;
    },
  } as any;
  const logger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  } as any;
  const service = new StorageService(config, logger);
  return { service, logger };
}

/**
 * S3 (legal-compliance): la policy del bucket debe ser POR PREFIJO
 * (portfolio_/profile_/menu_) — nunca Principal:"*" sobre el bucket entero,
 * que expondría documentos de identidad (campus_*) adivinando la URL.
 */
describe("StorageService — policy del bucket (S3)", () => {
  it("getSignedUrl devuelve una URL firmada con X-Amz-Signature", async () => {
    const { service } = buildService();

    const url = await service.getSignedUrl("campus_doc.pdf", 60);

    expect(url).toContain("X-Amz-Signature=");
    expect(url).toContain("X-Amz-Expires=60");
    expect(url).toContain("campus_doc.pdf");
  });

  it("al detectar bucket existente reemplaza la policy por la prefijada", async () => {
    const { service } = buildService();
    const send = jest
      .spyOn((service as any).s3Client, "send")
      .mockImplementation(async (cmd: any) => {
        if (cmd instanceof HeadBucketCommand) return {};
        return {};
      });

    await (service as any).ensureBucketExists();

    const commands = send.mock.calls.map(([c]: any[]) => c.constructor.name);
    expect(commands).toContain("HeadBucketCommand");
    expect(commands).toContain("PutBucketPolicyCommand");

    const policyCall = send.mock.calls.find(
      ([c]: any[]) => c instanceof PutBucketPolicyCommand,
    ) as any[];
    const policy = JSON.parse(policyCall[0].input.Policy as string);
    const resources: string[] = policy.Statement[0].Resource;
    expect(resources).toContain("arn:aws:s3:::test-bucket/portfolio_*");
    expect(resources).toContain("arn:aws:s3:::test-bucket/profile_*");
    expect(resources).toContain("arn:aws:s3:::test-bucket/menu_*");
    // Jamás el wildcard total del bucket:
    expect(resources).not.toContain("arn:aws:s3:::test-bucket/*");
  });

  it("al crear el bucket usa la misma policy prefijada (nunca acceso total)", async () => {
    const { service } = buildService();
    const send = jest
      .spyOn((service as any).s3Client, "send")
      .mockImplementation(async (cmd: any) => {
        if (cmd instanceof HeadBucketCommand) {
          throw Object.assign(new Error("no bucket"), { name: "404" });
        }
        return {};
      });

    await (service as any).ensureBucketExists();

    const commands = send.mock.calls.map(([c]: any[]) => c.constructor.name);
    expect(commands).toContain("CreateBucketCommand");
    expect(commands).toContain("PutBucketPolicyCommand");

    const policyCall = send.mock.calls.find(
      ([c]: any[]) => c instanceof PutBucketPolicyCommand,
    ) as any[];
    const policy = JSON.parse(policyCall[0].input.Policy as string);
    const resources: string[] = policy.Statement[0].Resource;
    expect(resources).not.toContain("arn:aws:s3:::test-bucket/*");
    expect(resources.every((r: string) => r.includes("_*"))).toBe(true);
  });
});
