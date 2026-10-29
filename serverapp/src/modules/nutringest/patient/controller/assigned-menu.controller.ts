import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Delete,
  Patch,
} from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { AssignedMenuService } from "../service/assigned-menu.service";
import type { RequestWithUser } from "src/shared/types/server.type";

@Controller("api/assigned-menus")
@UseGuards(SessionAuthGuard)
export class AssignedMenuController {
  constructor(private readonly service: AssignedMenuService) {}

  // Eliminar asignación
  @Delete("/:id")
  async delete(@Param("id") id: string, @Req() req: RequestWithUser) {
    await this.service.delete({ id, userSession: req.user });
    return { message: "Menú removido del plan." };
  }

  // Actualizar notas o momento
  @Patch("/:id")
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.service.update({
      id,
      data: body,
      userSession: req.user,
    });
    return { message: "Asignación actualizada.", entity };
  }
}
