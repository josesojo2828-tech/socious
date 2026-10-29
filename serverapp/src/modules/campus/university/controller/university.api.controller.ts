import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { UniversityService } from "../service/university.service";
import { SessionAuthGuard } from "src/modules/auth/guards/authenticated.guard";
import { Public } from "src/shared/decorators/public.decorator";
import { CreateUniversityDto } from "../dto/create-university.dto";
import { UpdateUniversityDto } from "../dto/update-university.dto";
import { QueryUniversityDto } from "../dto/query-university.dto";
import type { RequestWithUser, FilterParamsDto } from "src/shared/types/server.type";

@Controller("api/universities")
export class UniversityApiController {
  constructor(private readonly universityService: UniversityService) {}

  @Post()
  @UseGuards(SessionAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Req() req: RequestWithUser,
    @Body() body: CreateUniversityDto,
  ) {
    const entity = await this.universityService.create(body, req.user);
    return { entity, message: "Universidad creada correctamente" };
  }

  @Get()
  @UseGuards(SessionAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } }))
  async findAll(
    @Req() req: RequestWithUser,
    @Query() query: FilterParamsDto,
  ) {
    return await this.universityService.getPaginate(query, req.user);
  }

  @Get("active")
  @Public()
  async findActive() {
    return await this.universityService.findActive();
  }

  @Get(":id")
  @UseGuards(SessionAuthGuard)
  async findOne(@Param("id") id: string) {
    const entity = await this.universityService.findOne({ id });
    return { entity };
  }

  @Patch(":id")
  @UseGuards(SessionAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateUniversityDto,
  ) {
    const entity = await this.universityService.update(
      { where: { id }, data: body },
      req.user,
    );
    return { entity, message: "Universidad actualizada correctamente" };
  }

  @Delete(":id")
  @UseGuards(SessionAuthGuard)
  async delete(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
  ) {
    const entity = await this.universityService.delete({ id }, req.user);
    return { entity, message: "Universidad eliminada correctamente" };
  }
}
