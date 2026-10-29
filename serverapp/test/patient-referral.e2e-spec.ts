import { Test, TestingModule } from "@nestjs/testing";
import {
  NestFastifyApplication,
  FastifyAdapter,
} from "@nestjs/platform-fastify";
import { PrismaService } from "nestjs-prisma";
import { PatientNutritionistRole, PatientReferralStatus } from "@prisma/client";
import { AppModule } from "./../src/app.module";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyFlash from "@fastify/flash";

// =========================================================
// T6.5 — E2E del módulo patient-referral
// Convención: AppModule real + FastifyAdapter + app.inject()
// Auth: Bearer token almacenado en User.token (SessionAuthGuard,
// estrategia A). Fixtures efímeros y cleanup por marcador e2e-*.
// =========================================================

const PREFIX = "e2e-pr-x";

const tokenOf = (suffix: string) => `bearer-${PREFIX}-${suffix}`;
const emailOf = (suffix: string) => `${PREFIX}-${suffix}@nutringest.test`;
const FAKE_UUID = "00000000-0000-4000-8000-000000000000";

describe("Patient Referral API (e2e)", () => {
  jest.setTimeout(120000);

  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const ids: string[] = [];
  const track = (id: string) => ids.push(id);

  let nutA: { userId: string; nutritionistId: string };
  let nutB: { userId: string; nutritionistId: string };
  let patientForeign: string; // pertenece a nutC (PRIMARY)

  async function createUser(suffix: string): Promise<string> {
    const user = await prisma.user.create({
      data: {
        email: emailOf(suffix),
        username: `${PREFIX}-${suffix}`,
        status: "ACTIVE",
        token: tokenOf(suffix),
        permits: { connect: { id: ids[0] } },
      },
    });
    track(user.id);
    return user.id;
  }

  async function createNutritionist(userId: string, suffix: string) {
    const prof = await prisma.nutritionist.create({
      data: { userId, licenseCode: `${PREFIX}-${suffix}` },
    });
    track(prof.id);
    return prof.id;
  }

  /** Paciente fresco owned por nutA con membership PRIMARY activa. */
  async function createPatientOwnedByA(suffix: string): Promise<string> {
    const patient = await prisma.patient.create({
      data: {
        firstName: "Paciente",
        lastName: `E2E-${suffix}`,
        gender: "FEMALE",
        birthDate: new Date("1990-01-01"),
      },
    });
    track(patient.id);
    const membership = await prisma.patientNutritionist.create({
      data: {
        patientId: patient.id,
        nutritionistId: nutA.nutritionistId,
        role: PatientNutritionistRole.PRIMARY,
        isActive: true,
      },
    });
    track(membership.id);
    return patient.id;
  }

  async function createReferral(ownerSuffix: string, patientId: string) {
    const res = await app.inject({
      method: "POST",
      url: "/api/nutringest/patient-referral/create/api",
      headers: {
        authorization: `Bearer ${tokenOf(ownerSuffix)}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      payload: JSON.stringify({
        patientId,
        toNutritionistId: nutB.nutritionistId,
        message: "E2E referral",
        // Flujo COLLABORATOR: la aceptación se une como SUPPORT (el default
        // TRANSFER degradaría al remitente y promovería a PRIMARY al target).
        type: "COLLABORATOR",
      }),
    });
    const body = res.json() as any;
    if (body?.entity?.id) track(body.entity.id);
    return res;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: "testsecretkeymustbeatleast32charslong",
      cookie: { secure: false },
    });
    await app.register(fastifyFlash);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);

    // --- Limpieza previa (corridas abortadas): los UUID no llevan prefijo,
    // así que se elimina por marcador isNotEmpty en licenseCode / email. ---
    const leftoverNutritionists = await prisma.nutritionist.findMany({
      where: { licenseCode: { startsWith: PREFIX } },
      select: { id: true },
    });
    const leftoverNutIds = leftoverNutritionists.map((n) => n.id);
    if (leftoverNutIds.length) {
      const leftoverMemberPats = await prisma.patientNutritionist.findMany({
        where: { nutritionistId: { in: leftoverNutIds } },
        select: { patientId: true },
      });
      await prisma.patientReferral.deleteMany({
        where: {
          OR: [
            { fromNutritionistId: { in: leftoverNutIds } },
            { toNutritionistId: { in: leftoverNutIds } },
          ],
        },
      });
      await prisma.patientNutritionist.deleteMany({
        where: { nutritionistId: { in: leftoverNutIds } },
      });
      await prisma.patient.deleteMany({
        where: { id: { in: leftoverMemberPats.map((p) => p.patientId) } },
      });
      await prisma.nutritionist.deleteMany({
        where: { id: { in: leftoverNutIds } },
      });
    }
    const leftoverUsers = await prisma.user.findMany({
      where: { email: { startsWith: PREFIX } },
      select: { id: true },
    });
    const leftoverUserIds = leftoverUsers.map((u) => u.id);
    if (leftoverUserIds.length) {
      await prisma.userActivityLog.deleteMany({
        where: { userId: { in: leftoverUserIds } },
      });
      await prisma.notification.deleteMany({
        where: { userId: { in: leftoverUserIds } },
      });
      await prisma.userSession.deleteMany({
        where: { userId: { in: leftoverUserIds } },
      });
    }
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await prisma.permit.deleteMany({ where: { name: { startsWith: PREFIX } } });

    // --- Fixtures ---
    const permit = await prisma.permit.create({
      data: { name: `${PREFIX}-permit`, list: [] },
    });
    track(permit.id);

    nutA = { userId: null, nutritionistId: null };
    nutA.userId = await createUser("a");
    nutA.nutritionistId = await createNutritionist(nutA.userId, "a");

    nutB = { userId: null, nutritionistId: null };
    nutB.userId = await createUser("b");
    nutB.nutritionistId = await createNutritionist(nutB.userId, "b");

    const nutC = { userId: null, nutritionistId: null };
    nutC.userId = await createUser("c");
    nutC.nutritionistId = await createNutritionist(nutC.userId, "c");

    // Paciente de un tercer nutricionista (no accesible por A)
    const foreign = await prisma.patient.create({
      data: {
        firstName: "Paciente",
        lastName: "E2E-foreign",
        gender: "MALE",
        birthDate: new Date("1985-06-15"),
      },
    });
    track(foreign.id);
    await prisma.patientNutritionist.create({
      data: {
        patientId: foreign.id,
        nutritionistId: nutC.nutritionistId,
        role: PatientNutritionistRole.PRIMARY,
        isActive: true,
      },
    });
    patientForeign = foreign.id;
  });

  afterAll(async () => {
    if (prisma) {
      // Referidos: from/to apuntan a nutricionistas e2e.
      await prisma.patientReferral.deleteMany({
        where: {
          OR: [
            { fromNutritionistId: { in: ids } },
            { toNutritionistId: { in: ids } },
          ],
        },
      });
      await prisma.patientNutritionist.deleteMany({
        where: {
          OR: [
            { patientId: { in: ids } },
            { nutritionistId: { in: ids } },
          ],
        },
      });
      await prisma.patient.deleteMany({
        where: { id: { in: ids } },
      });
      await prisma.nutritionist.deleteMany({
        where: { id: { in: ids } },
      });
      await prisma.userActivityLog.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.notification.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.userSession.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.permit.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  // =========================================================
  // 1. AUTH
  // =========================================================

  it("rejects create/api without session/token (401)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/nutringest/patient-referral/create/api",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      payload: JSON.stringify({ patientId: FAKE_UUID, toNutritionistId: nutB.nutritionistId }),
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects create/api with an invalid/expired token (401)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/nutringest/patient-referral/create/api",
      headers: {
        authorization: "Bearer not-a-real-token",
        "content-type": "application/json",
        accept: "application/json",
      },
      payload: JSON.stringify({ patientId: FAKE_UUID, toNutritionistId: nutB.nutritionistId }),
    });
    expect(res.statusCode).toBe(401);
  });

  // =========================================================
  // 2. CREATE + OWNERSHIP GUARD
  // =========================================================

  it("creates a PENDING referral as PRIMARY owner", async () => {
    const patient = await createPatientOwnedByA("create");
    const res = await createReferral("a", patient);
    expect(res.statusCode).toBe(201);

    const body = res.json();
    expect(body.entity.status).toBe(PatientReferralStatus.PENDING);
    expect(body.entity.fromNutritionistId).toBe(nutA.nutritionistId);
    expect(body.entity.toNutritionistId).toBe(nutB.nutritionistId);
  });

  it("fails to create a referral for a patient not owned (403)", async () => {
    const res = await createReferral("a", patientForeign);
    expect(res.statusCode).toBe(403);
  });

  it("fails to create a referral for a non-existent patient (404)", async () => {
    const res = await createReferral("a", FAKE_UUID);
    expect(res.statusCode).toBe(404);
  });

  // =========================================================
  // 3. ACCEPT -> TEAM (SUPPORT)
  // =========================================================

  it("happy flow: accept -> team lists the new SUPPORT member", async () => {
    const patient = await createPatientOwnedByA("accept");
    const created = await createReferral("a", patient);
    const referralId = created.json().entity.id;

    const accepted = await app.inject({
      method: "POST",
      url: `/api/nutringest/patient-referral/${referralId}/accept`,
      headers: {
        authorization: `Bearer ${tokenOf("b")}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      payload: JSON.stringify({ responseMessage: "Voy a hacerme cargo" }),
    });
    expect(accepted.statusCode).toBe(201);
    expect(accepted.json().entity.status).toBe(PatientReferralStatus.ACCEPTED);

    const team = await app.inject({
      method: "GET",
      url: `/api/nutringest/patient-referral/team/${patient}`,
      headers: { authorization: `Bearer ${tokenOf("a")}` },
    });
    expect(team.statusCode).toBe(200);

    const members = team.json();
    const support = members.find(
      (m: any) => m.nutritionistId === nutB.nutritionistId,
    );
    expect(support).toBeDefined();
    expect(support.role).toBe(PatientNutritionistRole.SUPPORT);
    expect(support.isActive).toBe(true);
  });

  it("rejects accept by a non-recipient nutritionist (403)", async () => {
    const patient = await createPatientOwnedByA("accept-forbidden");
    const created = await createReferral("a", patient);
    const referralId = created.json().entity.id;

    const res = await app.inject({
      method: "POST",
      url: `/api/nutringest/patient-referral/${referralId}/accept`,
      headers: {
        authorization: `Bearer ${tokenOf("c")}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(403);
  });

  // =========================================================
  // 4. REJECT / CANCEL TRANSITIONS
  // =========================================================

  it("reject transitions status to REJECTED with response message", async () => {
    const patient = await createPatientOwnedByA("reject");
    const created = await createReferral("a", patient);
    const referralId = created.json().entity.id;

    const rejected = await app.inject({
      method: "POST",
      url: `/api/nutringest/patient-referral/${referralId}/reject`,
      headers: {
        authorization: `Bearer ${tokenOf("b")}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      payload: JSON.stringify({ responseMessage: "No tengo cupo hoy" }),
    });
    expect(rejected.statusCode).toBe(201);
    expect(rejected.json().entity.status).toBe(PatientReferralStatus.REJECTED);
    expect(rejected.json().entity.responseMessage).toBe("No tengo cupo hoy");
    expect(rejected.json().entity.respondedById).toBe(nutB.nutritionistId);
  });

  it("cancel transitions status to CANCELED (sender)", async () => {
    const patient = await createPatientOwnedByA("cancel");
    const created = await createReferral("a", patient);
    const referralId = created.json().entity.id;

    const canceled = await app.inject({
      method: "POST",
      url: `/api/nutringest/patient-referral/${referralId}/cancel`,
      headers: { authorization: `Bearer ${tokenOf("a")}` },
    });
    expect(canceled.statusCode).toBe(201);
    expect(canceled.json().entity.status).toBe(PatientReferralStatus.CANCELED);

    // El receptor ya no puede responder un referido cancelado (400)
    const rejectedAfterCancel = await app.inject({
      method: "POST",
      url: `/api/nutringest/patient-referral/${referralId}/reject`,
      headers: {
        authorization: `Bearer ${tokenOf("b")}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      payload: JSON.stringify({}),
    });
    expect(rejectedAfterCancel.statusCode).toBe(400);
  });

  it("fails to cancel a referral the user did not send (403)", async () => {
    const patient = await createPatientOwnedByA("cancel-forbidden");
    const created = await createReferral("a", patient);
    const referralId = created.json().entity.id;

    const res = await app.inject({
      method: "POST",
      url: `/api/nutringest/patient-referral/${referralId}/cancel`,
      headers: { authorization: `Bearer ${tokenOf("c")}` },
    });
    expect(res.statusCode).toBe(403);
  });
});