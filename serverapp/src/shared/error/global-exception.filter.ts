// src/shared/error/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal Server Error";

    let errorMessage = "Error desconocido";
    if (typeof exceptionResponse === "string") {
      errorMessage = exceptionResponse;
    } else if (
      typeof exceptionResponse === "object" &&
      (exceptionResponse as any).message
    ) {
      const msg = (exceptionResponse as any).message;
      errorMessage = Array.isArray(msg) ? msg[0] : msg;
    }

    // Respuesta JSON única (la app es 100% API; ya no hay vistas MVC)
    response.status(status).send({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: errorMessage,
    });

    if (status === (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
      const errMessage =
        exception instanceof Error
          ? exception.message
          : JSON.stringify(exception);
      const errStack =
        exception instanceof Error ? exception.stack : undefined;

      this.logger.error(
        `🔥 ERROR 500 en ${request.method} ${request.url}: ${errMessage}`,
        errStack,
      );
      console.error(
        `[GlobalExceptionFilter] 🔥 CRITICAL 500 en ${request.url}:`,
        exception,
      );
    } else if (status === (HttpStatus.BAD_REQUEST as number)) {
      this.logger.warn(
        `⚠️ ERROR 400 en ${request.url}: ${JSON.stringify(exceptionResponse)}`,
      );
    }
  }
}
