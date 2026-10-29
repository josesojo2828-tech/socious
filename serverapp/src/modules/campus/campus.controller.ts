import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  Req,
} from '@nestjs/common';
import { FileInterceptor, type File } from '@nest-lab/fastify-multer';
import { safeExtensionFromMime } from "src/shared/helpers/file.util";
import { CampusService } from './campus.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { StorageService } from '../file/storage.service';
import { SessionAuthGuard } from '../auth/guards/authenticated.guard';
import { Public } from 'src/shared/decorators/public.decorator';
import { PrismaService } from 'nestjs-prisma';
import type { RequestWithUser } from 'src/shared/types/server.type';

@Controller('api/campus')
export class CampusController {
  constructor(
    private readonly campusService: CampusService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('request')
  @Public()
  @UseInterceptors(FileInterceptor('document'))
  async createRequest(
    @Body() dto: CreateRequestDto,
    @UploadedFile() file: File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Debe subir un documento de verificación.');
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size && file.size > maxSize) {
      throw new BadRequestException('El archivo excede el tamaño máximo permitido de 10MB.');
    }

    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('El formato de archivo no está permitido. Solo PDF, PNG, JPG, JPEG.');
    }

    const extension = safeExtensionFromMime(file.mimetype, file.originalname);
    const filename = `campus_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extension}`;
    await this.storageService.uploadFile(file.buffer, filename, file.mimetype);

    const fileRecord = await this.prisma.file.create({
      data: {
        name: file.originalname,
        path: filename,
        mimeType: file.mimetype,
        size: file.size,
        storage: "S3",
        visibility: "PRIVATE",
        description: file.mimetype,
      },
    });

    return this.campusService.createRequest(dto, fileRecord.id);
  }

  @Get('requests')
  @UseGuards(SessionAuthGuard)
  async listRequests(
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
  ) {
    const requests = await this.campusService.listRequests(status, req.user);
    const decoratedRequests = await Promise.all(
      requests.map(async (requestRecord) => {
        if (requestRecord.documentFile) {
          // Documento de identidad: URL firmada que expira (1h); la clave
          // nunca se expone como URL plana pública (S3, legal-compliance).
          const url = await this.storageService.getSignedUrl(
            requestRecord.documentFile.path,
            3600,
          );
          return {
            ...requestRecord,
            documentFile: {
              ...requestRecord.documentFile,
              url,
            },
          };
        }
        return requestRecord;
      })
    );
    return decoratedRequests;
  }

  @Post('requests/:id/approve')
  @UseGuards(SessionAuthGuard)
  async approveRequest(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.campusService.approveRequest(id, req.user);
  }

  @Post('requests/:id/reject')
  @UseGuards(SessionAuthGuard)
  async rejectRequest(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.campusService.rejectRequest(id, req.user);
  }

  @Get('validate-coupon/:code')
  @Public()
  async validateCoupon(@Param('code') code: string) {
    return this.campusService.validateCoupon(code);
  }
}
