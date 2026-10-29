/**
 * Seed script para generar datos de actividad (UserActivityLog)
 *
 * Uso: npx ts-node serverapp/src/shared/fixtures/seed.activity.ts [cantidad-por-usuario]
 *
 * Ejemplo:
 *   npx ts-node serverapp/src/shared/fixtures/seed.activity.ts          # 30 logs por usuario
 *   npx ts-node serverapp/src/shared/fixtures/seed.activity.ts 100      # 100 logs por usuario
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Config ──────────────────────────────────────────────────────────
const LOGS_PER_USER = parseInt(process.argv[2] || "30", 10);
const DAYS_BACK = 30;

// ── Datos falsos pero realistas ─────────────────────────────────────
const ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "LOGIN",
  "LOGIN",
  "CREATE",
  "UPDATE",
  "LOGIN",
  "LOGOUT",
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
]; // Sesgados hacia LOGIN para que se vea natural

const ACTIONS_WITH_DESC: Record<string, string[]> = {
  LOGIN: [
    "Inicio de sesión exitoso",
    "Acceso desde nueva ubicación",
    "Inicio de sesión desde dispositivo móvil",
    "Autenticación exitosa",
    "Inicio de sesión vía email",
  ],
  LOGOUT: [
    "Cierre de sesión manual",
    "Sesión cerrada por inactividad",
    "Cierre de sesión exitoso",
  ],
  CREATE: [
    'Creó paciente "{name}"',
    'Creó menú "{name}"',
    'Creó dieta "{name}"',
    'Creó lista de intercambio "{name}"',
    'Registró nuevo alimento "{name}"',
    'Creó nuevo plan alimenticio',
    'Agregó paciente a su consultorio',
  ],
  UPDATE: [
    'Actualizó paciente "{name}"',
    'Modificó menú "{name}"',
    'Editó dieta "{name}"',
    'Actualizó perfil profesional',
    'Modificó lista de intercambio "{name}"',
    'Actualizó datos del alimento "{name}"',
  ],
  DELETE: [
    'Eliminó paciente "{name}"',
    'Canceló suscripción',
    'Eliminó menú "{name}"',
    'Removió dieta "{name}"',
  ],
};

const NAMES = [
  "María García",
  "Juan Pérez",
  "Ana López",
  "Carlos Martínez",
  "Laura Rodríguez",
  "Pedro Sánchez",
  "Sofía Díaz",
  "Diego Fernández",
  "Valentina Ruiz",
  "Mateo Gómez",
  "Camila Torres",
  "Lucas Vargas",
  "Isabella Castro",
  "Santiago Morales",
  "Emilia Ortiz",
];

const IPS = [
  "190.210.45.12",
  "181.164.89.33",
  "192.168.1.100",
  "10.0.0.45",
  "186.56.120.78",
  "201.234.88.12",
  "179.34.201.55",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 Safari/17.2",
  "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
  "Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0",
  "curl/7.88.1",
  "PostmanRuntime/7.36.0",
];

// ── Helpers ─────────────────────────────────────────────────────────
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - randomInt(0, daysBack * 24 * 60 * 60 * 1000));
  // Le ponemos hora aleatoria también
  past.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59));
  return past;
}

function generateDescription(action: string): string | null {
  const templates = ACTIONS_WITH_DESC[action];
  if (!templates || templates.length === 0) return null;
  let desc = randomItem(templates);
  if (desc.includes("{name}")) {
    desc = desc.replace("{name}", randomItem(NAMES));
  }
  return desc;
}

function generateMetadata(action: string): Record<string, any> | undefined {
  // Solo algunos eventos tienen metadata
  if (Math.random() > 0.4) return undefined;

  switch (action) {
    case "LOGIN":
      return {
        provider: randomItem(["email", "google", "github"]),
        mfa_used: Math.random() > 0.7,
      };
    case "CREATE":
      return {
        entity_type: randomItem(["patient", "menu", "diet", "food", "exchange_list"]),
        source: randomItem(["web", "mobile", "api"]),
      };
    case "UPDATE":
      return {
        changed_fields: randomItem([
          ["name", "email"],
          ["price", "description"],
          ["status", "plan"],
          ["schedule", "notes"],
        ]),
      };
    default:
      return undefined;
  }
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log("\n===========================================");
  console.log("🌱  Seed de Actividad del Sistema");
  console.log(`   ${LOGS_PER_USER} logs por usuario`);
  console.log(`   Ventana: últimos ${DAYS_BACK} días`);
  console.log("===========================================\n");

  // 1. Obtener usuarios existentes
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, fullName: true, email: true },
  });

  if (users.length === 0) {
    console.log("❌ No hay usuarios en la DB. Ejecutá seed.test-users.ts primero.");
    return;
  }

  console.log(`📦 Usuarios encontrados: ${users.length}\n`);

  let totalCreated = 0;

  for (const user of users) {
    const batch: any[] = [];

    for (let i = 0; i < LOGS_PER_USER; i++) {
      const action = randomItem(ACTIONS);
      const createdAt = randomDate(DAYS_BACK);
      const description = generateDescription(action);

      batch.push({
        userId: user.id,
        action,
        description,
        ipAddress: randomItem(IPS),
        userAgent: randomItem(USER_AGENTS),
        metadata: generateMetadata(action) || undefined,
        createdAt,
        updatedAt: createdAt,
      });
    }

    // Insertar en batch
    await prisma.userActivityLog.createMany({ data: batch });
    totalCreated += batch.length;

    const lastDate = batch.reduce((latest, curr) =>
      curr.createdAt > latest ? curr.createdAt : latest,
      batch[0].createdAt,
    );

    console.log(
      `   ✓ ${(user.fullName || user.email).padEnd(25)} → ${String(batch.length).padStart(3)} logs  (último: ${lastDate.toLocaleDateString("es-ES")})`,
    );
  }

  // 3. Mostrar resumen por tipo de acción
  const actionCounts = await prisma.userActivityLog.groupBy({
    by: ["action"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  console.log("\n📊  Resumen por tipo de acción:");
  for (const ac of actionCounts) {
    console.log(`   ${ac.action.padEnd(10)} → ${ac._count.id}`);
  }

  console.log(`\n✅  Total de logs creados en esta ejecución: ${totalCreated}`);
  console.log(`📈  Total en DB: ${actionCounts.reduce((sum, a) => sum + a._count.id, 0)}`);
  console.log("===========================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
