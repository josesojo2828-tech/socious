import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import type { RequestWithUser } from "src/shared/types/server.type";
import { SportsHistoryService } from "../service/sports-history.service";
import {
  CreateSportsHistoryDto,
  UpdateSportsHistoryDto,
} from "../dto/sports-history.dto";

@Controller("api/sport-history")
@UseGuards(SessionAuthGuard)
export class SportsHistoryApiController {
  constructor(
    private readonly sportsHistoryService: SportsHistoryService,
  ) {}

  @Get("")
  async index(
    @Req() req: RequestWithUser,
    @Query() query: { patientId?: string },
  ) {
    return this.sportsHistoryService.getLastActive({
      patientId: query.patientId,
      userSession: req.user,
    });
  }

  @Post("/create/api")
  async create(
    @Body() body: CreateSportsHistoryDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.sportsHistoryService.create({
      data: body,
      userSession: req.user,
    });
    return { message: "Historia deportiva registrada correctamente.", entity };
  }

  @Post("/:id/update/api")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateSportsHistoryDto,
    @Req() req: RequestWithUser,
  ) {
    const entity = await this.sportsHistoryService.update({
      id,
      data: body,
      userSession: req.user,
    });
    return { message: "Historia deportiva actualizada.", entity };
  }

  @Post("/:id/delete/api")
  async delete(@Param("id") id: string, @Req() req: RequestWithUser) {
    const entity = await this.sportsHistoryService.softDelete({
      id,
      userSession: req.user,
    });
    return { message: "Registro eliminado.", entity };
  }
}