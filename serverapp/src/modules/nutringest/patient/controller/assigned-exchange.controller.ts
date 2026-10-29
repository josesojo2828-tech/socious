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
import { AssignedExchangeService } from "../service/assigned-exchange.service";
import type { RequestWithUser } from "src/shared/types/server.type";

@Controller("api/assigned-exchanges")
@UseGuards(SessionAuthGuard)
export class AssignedExchangeController {
  constructor(private readonly service: AssignedExchangeService) {}

  @Delete("/:id")
  async delete(@Param("id") id: string, @Req() req: RequestWithUser) {
    await this.service.delete({ id, userSession: req.user });
    return { message: "Grupo de intercambio removido." };
  }

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
