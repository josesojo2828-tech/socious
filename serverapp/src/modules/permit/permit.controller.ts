import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { PermitService } from "./permit.service";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";

@Controller("api/permit")
export class PermitController {
  constructor(private readonly permitService: PermitService) {}

  @Get("permissions")
  @UseGuards(SessionAuthGuard)
  async getPermissions() {
    const groups = this.permitService.getAllPermissionsGrouped();
    return { groups };
  }

  @Get(":id")
  @UseGuards(SessionAuthGuard)
  async getOne(@Param("id") id: string) {
    const entity = await this.permitService.findOne({ id });
    return { entity };
  }

  @Post()
  @UseGuards(SessionAuthGuard)
  async create(
    @Body() body: { name: string; description?: string; list: string[] },
  ) {
    const entity = await this.permitService.createPermit(body);
    return { entity, message: "Rol creado correctamente" };
  }

  @Patch(":id")
  @UseGuards(SessionAuthGuard)
  async update(
    @Param("id") id: string,
    @Body() body: { name?: string; description?: string; list?: string[] },
  ) {
    const entity = await this.permitService.updatePermit({
      where: { id },
      data: body,
    });
    return { entity, message: "Rol actualizado correctamente" };
  }

  @Delete(":id")
  @UseGuards(SessionAuthGuard)
  async delete(@Param("id") id: string) {
    await this.permitService.deletePermit({ id });
    return { message: "Rol eliminado correctamente" };
  }
}
