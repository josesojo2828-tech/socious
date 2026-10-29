import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./services/user-analitics.service";
import type { RequestWithUser } from "src/shared/types/server.type";
import { SessionAuthGuard } from "../auth/guards/authenticated.guard";
// Importa tus Guards de autenticación aquí (ej: JwtAuthGuard)

@Controller("api/user/analytics")
// @UseGuards(JwtAuthGuard) // <--- Descomenta esto para proteger las rutas
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dashboard/wallet")
  @UseGuards(SessionAuthGuard)
  async getWalletOverview(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    const data = await this.analyticsService.getWalletMetrics(userId);
    return { data };
  }

  @Get("charts/monthly-history")
  @UseGuards(SessionAuthGuard)
  async getMonthlyHistory(@Req() req: RequestWithUser) {
    const data = await this.analyticsService.getMonthlyHistory(req.user.id);
    return { data };
  }

  @Get("charts/status-distribution")
  @UseGuards(SessionAuthGuard)
  async getStatusDistribution(@Req() req: RequestWithUser) {
    const data = await this.analyticsService.getTransactionStatusStats(
      req.user.id,
    );
    return { data };
  }

  @Get("charts/payment-methods")
  @UseGuards(SessionAuthGuard)
  async getPaymentMethodChart(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    const data = await this.analyticsService.getPaymentMethodUsage(userId);
    return { data };
  }

  @Get("charts/transactions-volume")
  @UseGuards(SessionAuthGuard)
  async getTransactionVolumeChart(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    const data = await this.analyticsService.getTransactionHistoryChart(userId);
    return { data };
  }

  @Get("charts/popular-plans")
  @UseGuards(SessionAuthGuard)
  async getPopularPlansChart() {
    // Endpoint público o privado, da igual el user, son estadísticas globales
    const data = await this.analyticsService.getPopularPlans();
    return { data };
  }

  @Get("tables/sessions")
  @UseGuards(SessionAuthGuard)
  async getSessionsTable(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    const data = await this.analyticsService.getRecentSessions(userId);
    return { data };
  }

  @Get("tables/payments")
  @UseGuards(SessionAuthGuard)
  async getPaymentsTable(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    const data = await this.analyticsService.getRecentTransactions(userId);
    return { data };
  }
}
