import { NestFactory } from "@nestjs/core";
import {
  NestFastifyApplication,
  FastifyAdapter,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { fastifyMultipart } from "@fastify/multipart";
import { GlobalExceptionFilter } from "./shared/error/global-exception.filter";
import { Logger } from "nestjs-pino";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 1024 * 1024 * 30,
    }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));


  const defaultOrigins = [
    "https://nutringest.com",
    "https://www.nutringest.com",
    "https://api.nutringest.com",
    "https://nutringest.quanticarch.com",
    "https://backend-nutrigest.ramirezicode.com.ve",
    "http://localhost:3000",
    "http://localhost:7782",
    "http://localhost:3001",
    "http://localhost:5173",
  ];

  const envOrigins = [
    process.env.CORS_ORIGINS,
    process.env.ALLOWED_ORIGINS,
    process.env.CORS_ORIGIN,
    process.env.APP_URL,
  ]
    .filter((val): val is string => Boolean(val))
    .flatMap((val) => val.split(","))
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set([...defaultOrigins, ...envOrigins].map((o) => o.replace(/\/$/, "")))
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin header Origin (ej. cURL, Postman, llamadas servidor a servidor)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/$/, "");

      const isAllowed =
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.endsWith(".nutringest.com") ||
        normalizedOrigin.endsWith(".quanticarch.com") ||
        normalizedOrigin.endsWith(".ramirezicode.com.ve");

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "X-Access-Token",
      "X-Refresh-Token",
      "X-Workspace-Id",
    ],
  });

  await app.register(fastifyMultipart);

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Fastify rejects `POST` with `Content-Type: application/json` and an empty
  // body ("Body cannot be empty"), which any client that sets the JSON header
  // by default would hit on our body-less mutations
  // (`POST /api/orders/:id/convert`, `POST /api/sales/:id/cancel`, ...).
  // Nest registers its own JSON parser while initializing, so the tolerant
  // parser can only be installed after that: swap it for one that reads an
  // empty payload as `{}` (validation still owns the decision) and keeps
  // rejecting malformed JSON.
  await app.init();
  const fastify = app.getHttpAdapter().getInstance();
  if (fastify.hasContentTypeParser("application/json")) {
    fastify.removeContentTypeParser("application/json");
  }
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (
      _req: unknown,
      body: string,
      done: (err: Error | null, value?: unknown) => void,
    ) => {
      const raw = typeof body === "string" ? body.trim() : "";
      if (raw === "") {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(raw));
      } catch (error) {
        done(error as Error);
      }
    },
  );

  await app.listen(process.env.PORT ?? 3001, "0.0.0.0");
}
bootstrap();
