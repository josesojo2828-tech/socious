import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(private config: ConfigService) {
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");

    if (!user || !pass) {
      this.logger.warn("SMTP_USER or SMTP_PASS not set — mail service disabled");
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  async sendMail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Mail not sent — transport not configured (to: ${to})`);
      return;
    }

    const from = this.config.get<string>("SMTP_USER");

    try {
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err}`);
      throw err;
    }
  }
}
