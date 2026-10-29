import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { CountryService } from "./country.service";
import { Public } from "../../shared/decorators/public.decorator";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { isSuperadmin } from "../permit/authz";

@Controller("api/countries")
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get("active")
  @Public()
  async getActiveCountries() {
    return this.countryService.getActiveCountries();
  }

  @Get("admin")
  @UseGuards(SessionAuthGuard)
  async getAllAdminCountries(@Req() req: any) {
    const user = req.user;
    if (!isSuperadmin(user as any)) {
      throw new ForbiddenException(
        "Acceso denegado. Se requieren permisos de SuperAdmin.",
      );
    }
    return this.countryService.getAllAdminCountries();
  }

  @Patch("admin/:id/toggle")
  @UseGuards(SessionAuthGuard)
  async toggleCountryStatus(@Param("id") id: string, @Req() req: any) {
    const user = req.user;
    if (!isSuperadmin(user as any)) {
      throw new ForbiddenException(
        "Acceso denegado. Se requieren permisos de SuperAdmin.",
      );
    }
    return this.countryService.toggleCountryStatus(id);
  }
}
