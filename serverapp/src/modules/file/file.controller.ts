import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, type File } from "@nest-lab/fastify-multer";
import type { FastifyReply } from "fastify";
import { StorageService } from "./storage.service";
import { Public } from "src/shared/decorators/public.decorator";
import { SkipThrottle } from "@nestjs/throttler";
import { isPublicAssetKey } from "./storage-keys.util";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { safeExtensionFromMime } from "src/shared/helpers/file.util";
import type { RequestWithUser } from "src/shared/types/server.type";

const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  // Facturas de proveedor (S14 #5): foto o PDF. `purchase_` NO entra en la
  // allowlist pública — se sirve por getSignedUrl en /api/purchases/:id/invoice.
  "application/pdf",
];
const MAX_SIZE = 5 * 1024 * 1024;
const UPLOAD_PREFIXES = ["product", "offer", "purchase"] as const;

@Controller("api/file")
export class FileController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Upload de imágenes de catálogo/ofertas (S8/S9) y facturas de compra
   * (S14 #5). El prefijo se limita a la allowlist para no escribir claves
   * arbitrarias en el bucket; la respuesta devuelve la clave (persistida en
   * la entidad) y la URL pública.
   */
  @Post("upload")
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadImage(
    @Req() _req: RequestWithUser,
    @UploadedFile() file: File,
    @Body() body: { prefix?: string },
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException("Debe subir un archivo.");
    }
    if (file.size && file.size > MAX_SIZE) {
      throw new BadRequestException("El archivo excede el máximo de 5MB.");
    }
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        "Formato no permitido. Solo PNG, JPG, JPEG, WEBP o PDF.",
      );
    }
    const prefix = UPLOAD_PREFIXES.includes(
      (body?.prefix ?? "product") as (typeof UPLOAD_PREFIXES)[number],
    )
      ? body.prefix
      : "product";
    const extension = safeExtensionFromMime(file.mimetype, file.originalname);
    const key = `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${extension}`;
    await this.storageService.uploadFile(file.buffer, key, file.mimetype);
    const url = await this.storageService.getFileUrl(key);
    return { key, url };
  }

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
