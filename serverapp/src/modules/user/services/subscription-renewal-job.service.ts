import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "nestjs-prisma";
import { SubscriptionStatus } from "@prisma/client";

import { MailService } from "../../mail/mail.service";
import {
  BILLING_TIME_ZONE_DEFAULT,
  InvoiceService,
  formatPeriodKey,
  monthStartInTimeZone,
} from "../../billing/invoice.service";

@Injectable()
export class SubscriptionRenewalJobService {
  private readonly logger = new Logger(SubscriptionRenewalJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly invoiceService: InvoiceService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Subscription LIFECYCLE job (daily).
   *
   * Owns ONLY the warning/grace/expiry lifecycle:
   *   * 5-day pre-expiry warning email,
   *   * GRACE_PERIOD transition (10 days) with reminder email,
   *   * EXPIRED transition once grace is over.
   *
   * It NO LONGER debits the wallet, creates a `Transaction`, nor extends
   * `Subscription.endDate` — that was the legacy daily renewal that double
   * charged alongside the monthly invoice engine. `Subscription.endDate`
   * renewal is now owned solely by `InvoiceService.settleInvoice` (unified
   * billing, option b). A month that is not settled simply reaches the grace
   * period and then expires here.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionRenewalCron() {
    this.logger.log(
      "🔄 Iniciando tarea programada de ciclo de vida de suscripciones...",
    );

    const log = await this.prisma.subscriptionRenewalJobLog.create({
      data: {
        startedAt: new Date(),
        status: "RUNNING",
      },
    });

    let totalProcessed = 0;
    const totalRenewed = 0;
    let totalFailedNoFunds = 0;
    let totalExpired = 0;
    const details: any[] = [];

    try {
      const now = new Date();

      // 1. Notificación PRE-VENCIMIENTO (5 días antes)
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
      const startOfWindow = new Date(fiveDaysFromNow);
      startOfWindow.setHours(0, 0, 0, 0);
      const endOfWindow = new Date(fiveDaysFromNow);
      endOfWindow.setHours(23, 59, 59, 999);

      const expiringSoonSubs = await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: { gte: startOfWindow, lte: endOfWindow },
        },
        include: { plan: true, user: true },
      });

      for (const sub of expiringSoonSubs) {
        if (sub.user?.email) {
          this.mailService.sendMail({
            to: sub.user.email,
            subject: "Tu plan Nutringest vence en 5 días ⏳",
            html: `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"></head>
              <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
                  <tr><td align="center">
                    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                      <tr>
                        <td style="background:#4f46e5;padding:32px 40px;text-align:center;">
                          <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">Nutringest</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:40px;">
                          <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Aviso de Próximo Vencimiento</h2>
                          <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 16px;">
                            Hola <strong>${sub.user.firstName || "Nutricionista"}</strong>, tu suscripción al plan <strong>${sub.plan?.name || "Nutringest"}</strong> vencerá en 5 días (${new Date(sub.endDate!).toLocaleDateString("es-ES")}).
                          </p>
                          <p style="color:#64748b;line-height:1.7;font-size:16px;">
                            Asegurate de contar con saldo suficiente en tu billetera virtual para evitar interrupciones en tu servicio.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#f1f5f9;padding:20px 40px;text-align:center;">
                          <p style="color:#94a3b8;font-size:12px;margin:0;">Nutringest — Tu salud en tus manos</p>
                        </td>
                      </tr>
                    </table>
                  </td></tr>
                </table>
              </body>
              </html>
            `,
          }).catch((err) => this.logger.error("Error enviando email pre-vencimiento", err));
        }
      }

      // 2. Suscripciones vencidas (endDate <= now) en ACTIVE o GRACE_PERIOD:
      //    transición a GRACE_PERIOD (10 días) o EXPIRED. SIN débito de wallet.
      const expiredSubs = await this.prisma.subscription.findMany({
        where: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE_PERIOD] },
          endDate: { lte: now },
        },
        include: {
          plan: true,
          user: true,
        },
      });

      totalProcessed = expiredSubs.length;

      for (const sub of expiredSubs) {
        const graceEnd = new Date(sub.endDate!);
        graceEnd.setDate(graceEnd.getDate() + 10);

        if (now > graceEnd) {
          // Pasaron los 10 días de gracia -> EXPIRED
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.EXPIRED },
          });
          totalExpired++;
          details.push({
            subscriptionId: sub.id,
            userId: sub.userId,
            action: "MARKED_EXPIRED",
            reason: "GRACE_PERIOD_EXCEEDED",
          });
        } else {
          // Dentro de los 10 días de gracia -> GRACE_PERIOD
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.GRACE_PERIOD },
          });

          if (sub.user?.email) {
            this.mailService.sendMail({
              to: sub.user.email,
              subject: "Tu plan entró en Período de Gracia ⚠️",
              html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"></head>
                <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
                    <tr><td align="center">
                      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                        <tr>
                          <td style="background:#d97706;padding:32px 40px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">Nutringest</h1>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:40px;">
                            <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Inicio de Período de Gracia</h2>
                            <p style="color:#64748b;line-height:1.7;font-size:16px;margin:0 0 16px;">
                              Hola <strong>${sub.user.firstName || "Nutricionista"}</strong>, tu plan <strong>${sub.plan?.name}</strong> venció y disponés de un <strong>período de gracia de 5 a 10 días</strong> para recargar tu saldo antes de que se restrinjan las acciones de escritura en la plataforma.
                            </p>
                            <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:12px;padding:20px;margin:24px 0;">
                              <p style="color:#b45309;font-size:14px;margin:0;">
                                Recargá saldo desde la sección de Billetera en tu panel para mantener tu cuenta activa.
                              </p>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="background:#f1f5f9;padding:20px 40px;text-align:center;">
                            <p style="color:#94a3b8;font-size:12px;margin:0;">Nutringest — Tu salud en tus manos</p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
              `,
            }).catch((err) => this.logger.error("Error enviando email período de gracia", err));
          }

          totalFailedNoFunds++;
          details.push({
            subscriptionId: sub.id,
            userId: sub.userId,
            action: "ENTERED_GRACE_PERIOD",
            graceEndDate: graceEnd,
          });
        }
      }

      await this.prisma.subscriptionRenewalJobLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          totalProcessed,
          totalRenewed,
          totalFailedNoFunds,
          totalExpired,
          status: "SUCCESS",
          details,
        },
      });

      this.logger.log(
        `✅ Ciclo de vida finalizado. Procesadas: ${totalProcessed}, En gracia: ${totalFailedNoFunds}, Expiradas: ${totalExpired}`,
      );
    } catch (err: any) {
      this.logger.error("❌ Error en Cron de ciclo de vida:", err);
      await this.prisma.subscriptionRenewalJobLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: "FAILED",
          details: { error: err?.message || String(err) },
        },
      });
    }
  }

  /**
   * Unified monthly billing pass (first day of the month).
   *
   * Delegates to `InvoiceService.runMonthlyBilling`, which is the SINGLE
   * billing path: it issues the monthly `Invoice` (base plan + seats + active
   * add-ons) for BOTH organization and personal owners, settles it from the A1
   * wallet when `autoRenew` is on, renews `Subscription.endDate`, and isolates
   * failures per owner.
   *
   * Gated by `INVOICE_ENGINE_ENABLED` (default `false`). Enabling it is SAFE
   * from a double-charge standpoint: the legacy daily wallet debit was retired
   * in this change, so the invoice engine is the only thing that charges.
   * With the flag off there is no automated billing at all.
   */
  @Cron("0 0 1 * *", { timeZone: BILLING_TIME_ZONE_DEFAULT })
  async handleMonthlyInvoiceCron() {
    if (!this.isInvoiceEngineEnabled()) {
      this.logger.log(
        JSON.stringify({
          event: "billing.run.skipped",
          reason: "INVOICE_ENGINE_ENABLED=false",
        }),
      );
      return;
    }

    const timeZone =
      this.config.get<string>("BILLING_TIMEZONE") ?? BILLING_TIME_ZONE_DEFAULT;
    const periodStart = monthStartInTimeZone(new Date(), timeZone);

    this.logger.log(
      JSON.stringify({
        event: "billing.run.start",
        period: formatPeriodKey(periodStart),
        timeZone,
      }),
    );

    try {
      const summary = await this.invoiceService.runMonthlyBilling(periodStart);
      this.logger.log(
        JSON.stringify({
          event: "billing.run.complete",
          period: summary.periodKey,
          organizations: summary.organizations,
          personalOwners: summary.personalOwners,
          issued: summary.issued,
          settled: summary.settled,
          pending: summary.pending,
          failed: summary.failed,
        }),
      );
    } catch (err: any) {
      this.logger.error(
        JSON.stringify({
          event: "billing.run.error",
          period: formatPeriodKey(periodStart),
          message: err?.message || String(err),
        }),
      );
    }
  }

  private isInvoiceEngineEnabled(): boolean {
    return (
      (this.config.get<string>("INVOICE_ENGINE_ENABLED") ?? "false")
        .trim()
        .toLowerCase() === "true"
    );
  }
}
