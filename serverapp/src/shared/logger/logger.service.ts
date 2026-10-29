import { Logger, InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { Injectable } from "@nestjs/common";

@Injectable()
export class LoggerService extends Logger {
  constructor(
    @InjectPinoLogger(LoggerService.name) logger: PinoLogger
  ) {
    super(logger, {});
  }

  logInfo(message: string, context?: string) {
    this.logger.info(message, context);
  }

  logError(message: string, trace: string, context?: string) {
    this.logger.error({ message, trace }, context);
  }

  logDebug(message: string, context?: string) {
    this.logger.debug(message, context);
  }
}
