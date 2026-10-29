import { Test, TestingModule } from "@nestjs/testing";
import { NestFastifyApplication, FastifyAdapter } from "@nestjs/platform-fastify";
import { AppModule } from "./../src/app.module";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyFlash from "@fastify/flash";

describe("AppController (e2e)", () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: "testsecretkeymustbeatleast32charslong",
      cookie: { secure: false },
    });
    await app.register(fastifyFlash);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/test (GET) - redirect", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test",
    });
    expect(response.headers.location).toBe("/dashboard");
  });
});
