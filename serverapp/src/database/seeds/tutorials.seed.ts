import type { PrismaClient } from "@prisma/client";

/**
 * Planned tutorial catalog, seeded once so the admin panel and the public
 * page start with the full roadmap. They stay unpublished until the admin
 * pastes the YouTube link from Configuración → Tutoriales.
 */
const PLANNED = [
  { code: "A1", title: "Crear tu cuenta y elegir plan", description: "Registro, período de prueba y primer ingreso al panel del negocio.", series: "primeros-pasos", duration: "2 min" },
  { code: "A2", title: "Configurar tu tasa y tus monedas", description: "BCV y USDT, qué monedas mostrar y cómo se congelan en cada venta.", series: "primeros-pasos", duration: "2 min" },
  { code: "A3", title: "Cargar tus productos desde Excel", description: "Plantilla, importación y errores típicos.", series: "primeros-pasos", duration: "4 min", featured: true },
  { code: "A4", title: "Tu primer cliente y tu primera venta", description: "Cliente, carrito en el POS y cobro en bolívares, dólares o USDT.", series: "primeros-pasos", duration: "4 min", featured: true },
  { code: "A5", title: "Tu tienda pública en un solo link", description: "WhatsApp del negocio y el primer pedido desde la web.", series: "primeros-pasos", duration: "3 min" },
  { code: "B1", title: "Venta a crédito y abonos", description: "Saldo, cuánto resta y la tasa del día del cobro.", series: "dia-a-dia", duration: "4 min" },
  { code: "B2", title: "Caja y turnos", description: "Abrir, cobrar, cerrar y cuadrar el turno.", series: "dia-a-dia", duration: "3 min" },
  { code: "B3", title: "Compras y proveedores", description: "Cargar mercancía, costo y entrada al inventario.", series: "dia-a-dia", duration: "4 min" },
  { code: "B4", title: "Devoluciones", description: "Devolver sin romper stock ni saldo.", series: "dia-a-dia", duration: "3 min" },
  { code: "B5", title: "Importar las ventas del año pasado", description: "Historial desde CSV, sin tocar stock.", series: "dia-a-dia", duration: "4 min" },
  { code: "C1", title: "Presentaciones: mismo producto, distintos colores", description: "Color, medidas y stock propio.", series: "diferencias", duration: "3 min" },
  { code: "C2", title: "Materiales y productos compuestos", description: "El insumo se descuenta al vender.", series: "diferencias", duration: "4 min" },
  { code: "C3", title: "Reporte: facturé vs. cobré", description: "Devengo, cobro y deuda vencida.", series: "diferencias", duration: "3 min" },
  { code: "C4", title: "Usuarios y permisos", description: "Qué puede hacer cada rol.", series: "diferencias", duration: "3 min" },
] as const;

export async function seedTutorials(
  prisma: PrismaClient,
  log: (message: string) => void = () => undefined,
): Promise<void> {
  // Only seeds a fresh catalog: never re-creates rows the admin deleted.
  const existing = await prisma.tutorial.count();
  if (existing > 0) return;

  await prisma.tutorial.createMany({
    data: PLANNED.map((tutorial, index) => ({
      code: tutorial.code,
      title: tutorial.title,
      description: tutorial.description,
      series: tutorial.series,
      duration: tutorial.duration,
      featured: "featured" in tutorial ? tutorial.featured : false,
      published: false,
      sortOrder: index,
    })),
  });

  log(`  → ${PLANNED.length} tutorial(es) planificados (sin video todavía)`);
}
