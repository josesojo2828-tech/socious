import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { Public } from "src/shared/decorators/public.decorator";
import type { RequestWithUser } from "src/shared/types/server.type";
import { TutorialService } from "./tutorial.service";
import { isGlobalRole } from "./youtube";
import {
  CreateTutorialDto,
  PreviewTutorialDto,
  UpdateTutorialDto,
} from "./dto/tutorial.dto";

/**
 * Tutorial catalog. `GET /api/tutorials` is public (the storefront page needs
 * it without a session); everything else is platform-admin only.
 */
@Controller("api/tutorials")
@UseGuards(SessionAuthGuard)
export class TutorialController {
  constructor(private readonly tutorials: TutorialService) {}

  private assertAdmin(request: RequestWithUser): void {
    if (!request.user) throw new UnauthorizedException("No autorizado");
    if (!isGlobalRole(request.user)) {
      throw new ForbiddenException(
        "La gestión de tutoriales es solo para administradores.",
      );
    }
  }

  @Public()
  @Get()
  listPublic() {
    return this.tutorials.listPublic();
  }

  @Get("admin")
  listAdmin(@Req() request: RequestWithUser) {
    this.assertAdmin(request);
    return this.tutorials.listAdmin();
  }

  @Post("preview")
  preview(
    @Req() request: RequestWithUser,
    @Body() body: PreviewTutorialDto,
  ) {
    this.assertAdmin(request);
    return this.tutorials.preview(body.url);
  }

  @Post()
  create(@Req() request: RequestWithUser, @Body() body: CreateTutorialDto) {
    this.assertAdmin(request);
    return this.tutorials.create(body);
  }

  @Patch(":id")
  update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateTutorialDto,
  ) {
    this.assertAdmin(request);
    return this.tutorials.update(id, body);
  }

  @Delete(":id")
  remove(@Req() request: RequestWithUser, @Param("id") id: string) {
    this.assertAdmin(request);
    return this.tutorials.remove(id);
  }
}
