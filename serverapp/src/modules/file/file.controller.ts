import { Controller, Get, Param, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { StorageService } from "./storage.service";
import { Public } from "src/shared/decorators/public.decorator";
import { SkipThrottle } from "@nestjs/throttler";
import { isPublicAssetKey } from "./storage-keys.util";

@Controller("api/file")
export class FileController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @SkipThrottle()
  @Get("public/:key")
  async getPublicFile(@Param("key") key: string, @Res() res: FastifyReply) {
    // Solo assets no clínicos (portfolio_/profile_/menu_). Claves como
    // campus_* (documentos de identidad) o arbitrarias → 404 sin consultar
    // el storage (S3, legal-compliance). Las sensibles se sirven por
    // getSignedUrl a usuarios autorizados.
    if (!isPublicAssetKey(key)) {
      return res.status(404).send({ message: "File not found" });
    }
    try {
      const { stream, contentType } = await this.storageService.getFileStream(key);
      if (stream && typeof stream.transformToByteArray === "function") {
        const bytes = await stream.transformToByteArray();
        return res
          .status(200)
          .type(contentType)
          .header("Cache-Control", "public, max-age=31536000, immutable")
          .send(Buffer.from(bytes));
      }
      if (stream && typeof stream.pipe === "function") {
        res.type(contentType).header("Cache-Control", "public, max-age=31536000, immutable");
        return res.send(stream);
      }
      return res.status(404).send({ message: "File stream unavailable" });
    } catch (error) {
      return res.status(404).send({ message: "File not found" });
    }
  }
}
