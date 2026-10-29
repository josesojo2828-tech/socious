import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Req, BadRequestException } from "@nestjs/common";
import { FileInterceptor, type File } from "@nest-lab/fastify-multer";
import { safeExtensionFromMime } from "src/shared/helpers/file.util";
import { CoreService } from "./core.service";
import { UserService } from "../user/services/user.service";
import { StorageService } from "../file/storage.service";
import { LoggerService } from "src/shared/logger/logger.service";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import type { RequestWithUser } from "src/shared/types/server.type";

@Controller("api/core")
export class CoreController {
  constructor(
    private readonly coreService: CoreService,
    private readonly userService: UserService,
    private readonly storageService: StorageService,
    private readonly logger: LoggerService,
  ) { }

  @Post("api/profile")
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadProfileImage(
    @Req() req: RequestWithUser,
    @UploadedFile() file: File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException("Debe subir una imagen.");
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size && file.size > maxSize) {
      throw new BadRequestException("La imagen excede el tamaño máximo permitido de 5MB.");
    }

    const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("El formato de archivo no está permitido. Solo PNG, JPG, JPEG, WEBP.");
    }

    const fileExtension = safeExtensionFromMime(file.mimetype, file.originalname);
    const filename = `profile_${req.user.id}_${Date.now()}.${fileExtension}`;
    
    // Subir a MinIO
    await this.storageService.uploadFile(file.buffer, filename, file.mimetype);
    const fileUrl = await this.storageService.getFileUrl(filename);

    // Actualizar usuario en la base de datos
    await this.userService.updateUser({
      where: { id: req.user.id },
      data: { avatarUrl: fileUrl },
    });

    return { success: true, avatarUrl: fileUrl };
  }
}
