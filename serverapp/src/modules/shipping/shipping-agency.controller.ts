import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ShippingAgencyService } from "./shipping-agency.service";
import { CreateShippingAgencyDto, UpdateShippingAgencyDto } from "./dto/shipping.dto";
import { Public } from "src/shared/decorators/public.decorator";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import { isSuperadmin } from "../permit/authz";
import { JwtService } from "@nestjs/jwt";
import type { RequestWithUser } from "src/shared/types/server.type";
import { Req } from "@nestjs/common";

/**
 * Shipping agency catalog (S4).
 *
 * The checkout reads it anonymously; only `SUPERADMIN` maintains it — a
 * merchant enables agencies through its own settings, never through here.
 */
@Controller("api/shipping-agencies")
export class ShippingAgencyController {
  constructor(
    private readonly shippingAgencyService: ShippingAgencyService,
    private readonly jwtService: JwtService,
  ) {}

  private assertPlatformAdmin(request: RequestWithUser): void {
    if (!isSuperadmin(request.user as any)) {
      throw new ForbiddenException(
        "Solo la plataforma mantiene el catálogo de agencias.",
      );
    }
  }

  /** Active agencies for the public checkout. */
  @Public()
  @Get()
  listActive() {
    return this.shippingAgencyService.listActive();
  }

  /** Full catalog (including inactive) for the platform admin. */
  @Get("admin")
  @UseGuards(SessionAuthGuard)
  listAll(@Req() request: RequestWithUser) {
    this.assertPlatformAdmin(request);
    return this.shippingAgencyService.listAll();
  }

  @Post()
  @UseGuards(SessionAuthGuard)
  create(@Req() request: RequestWithUser, @Body() body: CreateShippingAgencyDto) {
    this.assertPlatformAdmin(request);
    return this.shippingAgencyService.create(body);
  }

  @Patch(":id")
  @UseGuards(SessionAuthGuard)
  update(
    @Req() request: RequestWithUser,
    @Param("id") id: string,
    @Body() body: UpdateShippingAgencyDto,
  ) {
    this.assertPlatformAdmin(request);
    return this.shippingAgencyService.update(id, body);
  }
}
