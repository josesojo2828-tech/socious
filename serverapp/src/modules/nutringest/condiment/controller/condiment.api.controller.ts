import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { CondimentService } from "../service/condiment.service";
import { PermissionService } from "src/modules/permit/service/permission.service";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";

@UseGuards(SessionAuthGuard)
@Controller("api/condiments")
export class CondimentApiController {
  constructor(
    private readonly condimentService: CondimentService,
    private readonly permissionService: PermissionService,
  ) {}

  private hasReadAccess(user: RequestWithUser["user"]): boolean {
    return (
      this.permissionService.hasPermission(user, "CONDIMENT_LIST") ||
      this.permissionService.hasPermission(user, "CONDIMENT_LIST_OWN") ||
      this.permissionService.hasPermission(user, "CONDIMENT_LIST_ALL")
    );
  }

  private hasWriteAccess(user: RequestWithUser["user"]): boolean {
    return this.permissionService.hasPermission(user, "CONDIMENT_LIST_ALL");
  }

  @Get()
  async index(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    if (!this.hasReadAccess(req.user)) {
      throw new ForbiddenException(
        "No tienes permiso para listar condimentos.",
      );
    }
    return this.condimentService.pagination({ query });
  }

  @Get(":id")
  async getOne(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    if (!this.hasReadAccess(req.user)) {
      throw new ForbiddenException(
        "No tienes permiso para ver condimentos.",
      );
    }
    return this.condimentService.unique({ id });
  }

  @Post("create")
  async create(
    @Body() body: any,
    @Req() req: RequestWithUser,
  ) {
    if (!this.hasWriteAccess(req.user)) {
      throw new ForbiddenException(
        "No tienes permiso para crear condimentos.",
      );
    }
    return this.condimentService.create({ data: body });
  }

  @Post(":id/update")
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: RequestWithUser,
  ) {
    if (!this.hasWriteAccess(req.user)) {
      throw new ForbiddenException(
        "No tienes permiso para actualizar condimentos.",
      );
    }
    return this.condimentService.update({ id, data: body });
  }

  @Post(":id/delete")
  async delete(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    if (!this.hasWriteAccess(req.user)) {
      throw new ForbiddenException(
        "No tienes permiso para eliminar condimentos.",
      );
    }
    return this.condimentService.delete({ id });
  }
}
