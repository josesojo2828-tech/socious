import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { FilterParamsDto } from "src/shared/types/server.type";
import type { RequestWithUser } from "src/shared/types/server.type";
import { PermitService } from "./permit.service";

@UseGuards(SessionAuthGuard)
@Controller("/api/dashboard/permits")
export class PermitListController {
  constructor(private readonly permitService: PermitService) {}

  @Get("/api/list")
  @UseGuards(SessionAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  public async apiList(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return await this.permitService.getPaginate(query);
  }
}
