import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
import type { RequestWithUser } from "src/shared/types/server.type";
import { ReferralAnalyticsService } from "./services/referral-analytics.service";

@Controller("api/referrals")
@UseGuards(SessionAuthGuard)
export class ReferralAnalyticsController {
  constructor(private readonly referralService: ReferralAnalyticsService) {}

  @Get("analytics/me") // Mis estadísticas
  async getMyStats(@Req() req: RequestWithUser) {
    return await this.referralService.getUserStats(req.user.id);
  }

  @Get("analytics/admin/overview") // Estadísticas globales (Proteger con Role Guard idealmente)
  async getGlobalStats() {
    return await this.referralService.getAdminStats();
  }
}
