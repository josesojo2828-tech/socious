import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SystemSettingService } from "./system-setting.service";
import { UpdateSystemSettingDto } from "./dto/update-system-setting.dto";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { Public } from "src/shared/decorators/public.decorator";

@Controller("api/system-settings")
export class SystemSettingController {
  constructor(private readonly systemSettingService: SystemSettingService) {}

  @Get("")
  @UseGuards(SessionAuthGuard)
  async findAll() {
    return this.systemSettingService.findAll();
  }

  @Post("update")
  @UseGuards(SessionAuthGuard)
  async update(@Body() dto: UpdateSystemSettingDto) {
    return this.systemSettingService.update(dto);
  }

  @Get("trial-days")
  @Public()
  async findTrialDays() {
    return this.systemSettingService.findPublicTrialDays();
  }

  @Get("public/:key")
  @Public()
  async findPublicByKey(@Param("key") key: string) {
    return this.systemSettingService.findByKey(key);
  }
}
