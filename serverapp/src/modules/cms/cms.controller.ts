import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  NotFoundException,
} from "@nestjs/common";

import { CmsService } from "./cms.service";
import CmsRepository from "./repository/cms.repository";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { Public } from "src/shared/decorators/public.decorator";

import { CmsCreateDto, CmsUpdateDto } from "./dto/cms.type";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";

@Controller("api/cms")
export class CmsController {
  constructor(
    private readonly cmsService: CmsService,
    private readonly cmsRepository: CmsRepository,
  ) {}

  // ---------- PUBLIC ENDPOINTS ---------- //

  @Get("public/key/:key")
  @Public()
  private async getPublicKey(@Param() param: { key: string }) {
    return await this.cmsService.findOneByKey(param.key);
  }

  // ---------- ACCIONES (CREATE, UPDATE, DELETE) ---------- //

  @Post("/create")
  @UseGuards(SessionAuthGuard)
  private async create(
    @Body() body: CmsCreateDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.cmsService.create({
      data: body,
      userSession: req.user,
    });

    return { success: true, id: (entity as any).id };
  }

  @Post("/:id/update")
  @UseGuards(SessionAuthGuard)
  private async update(
    @Param() param: { id: string },
    @Body() body: CmsUpdateDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.cmsService.update({
      data: body,
      id: param.id,
      userSession: req.user,
    });

    return { success: true, id: param.id };
  }

  @Post("/:id/delete")
  @UseGuards(SessionAuthGuard)
  private async delete(
    @Param() param: { id: string },
    @Req() req: RequestWithUser,
  ) {
    await this.cmsService.delete({
      id: param.id,
      userSession: req.user,
    });

    return { success: true, id: param.id };
  }

  // ---------- VISTAS Y DATOS (GET) ---------- //

  @Get("")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  private async paginate(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return await this.cmsService.pagination({
      query,
      userSession: req.user,
    });
  }

  @Get("/:id")
  @UseGuards(SessionAuthGuard)
  private async unique(
    @Req() req: RequestWithUser,
    @Param() param: { id: string },
  ) {
    return await this.cmsService.unique({
      id: param.id,
      userSession: req.user,
    });
  }

  // ---------- FORMULARIOS DINÁMICOS (MODALES) ---------- //

  @Get("form/:type")
  @UseGuards(SessionAuthGuard)
  private async form(
    @Query() query: { id?: string; lang?: string },
    @Param() param: { type: string },
  ) {
    const effectiveLang = query.lang || "es";

    if (param.type === "create") {
      const formStructure = this.cmsRepository.getFormCreate({});
      return this.cmsService.translateForm(
        formStructure,
        effectiveLang,
      );
    } else if (param.type === "update") {
      const object = await this.cmsRepository.findOne({
        where: { id: query.id },
      });
      if (!object) throw new NotFoundException("Contenido corporativo no encontrado");

      const formStructure = this.cmsRepository.getFormUpdate({
        object,
        id: query.id,
      });
      return this.cmsService.translateForm(
        formStructure,
        effectiveLang,
      );
    } else {
      throw new NotFoundException("Formulario no válido");
    }
  }
}
