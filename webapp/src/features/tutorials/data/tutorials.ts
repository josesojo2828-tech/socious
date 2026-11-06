import type { Tutorial, TutorialSeries } from "../types";

/**
 * Tutorial catalog. To publish a video: upload it to YouTube and paste its id
 * in `youtubeId` (the part after `v=` in the URL, e.g. `dQw4w9WgXcQ`).
 * Nothing else to change — the card and the player read from here.
 */
export const TUTORIAL_SERIES: TutorialSeries[] = [
  {
    key: "primeros-pasos",
    label: "Primeros pasos",
    description: "De cero a vender en 20 minutos.",
  },
  {
    key: "dia-a-dia",
    label: "El día a día",
    description: "Las tareas que hacés todas las semanas.",
  },
  {
    key: "diferencias",
    label: "Lo que nos diferencia",
    description: "Lo que no encontrás en otro sistema.",
  },
];

export const TUTORIALS: Tutorial[] = [
  {
    id: "a1",
    code: "A1",
    title: "Crear tu cuenta y elegir plan",
    description:
      "Registro, período de prueba y primer ingreso al panel del negocio.",
    cover: "/tutoriales/a1.svg",
    series: "primeros-pasos",
    duration: "2 min",
  },
  {
    id: "a2",
    code: "A2",
    title: "Configurar tu tasa y tus monedas",
    description:
      "BCV y USDT, qué monedas mostrar y cómo se congelan en cada venta.",
    cover: "/tutoriales/a2.svg",
    series: "primeros-pasos",
    duration: "2 min",
  },
  {
    id: "a3",
    code: "A3",
    title: "Cargar tus productos desde Excel",
    description:
      "Descargá la plantilla, importá cientos de productos y corregí los errores sin cargar uno por uno.",
    cover: "/tutoriales/a3.svg",
    series: "primeros-pasos",
    duration: "4 min",
    featured: true,
  },
  {
    id: "a4",
    code: "A4",
    title: "Tu primer cliente y tu primera venta",
    description:
      "Cliente, carrito en el POS y cobro en bolívares, dólares o USDT.",
    cover: "/tutoriales/a4.svg",
    series: "primeros-pasos",
    duration: "4 min",
    featured: true,
  },
  {
    id: "a5",
    code: "A5",
    title: "Tu tienda pública en un solo link",
    description:
      "Poné el WhatsApp del negocio y recibí el primer pedido desde la web.",
    cover: "/tutoriales/a5.svg",
    series: "primeros-pasos",
    duration: "3 min",
  },
  {
    id: "b1",
    code: "B1",
    title: "Venta a crédito y abonos",
    description:
      "Cómo queda el saldo, cuánto resta y por qué cada abono usa la tasa del día del cobro.",
    cover: "/tutoriales/b1.svg",
    series: "dia-a-dia",
    duration: "4 min",
  },
  {
    id: "b2",
    code: "B2",
    title: "Caja y turnos",
    description: "Abrir, cobrar, cerrar y cuadrar el turno sin diferencias.",
    cover: "/tutoriales/b2.svg",
    series: "dia-a-dia",
    duration: "3 min",
  },
  {
    id: "b3",
    code: "B3",
    title: "Compras y proveedores",
    description:
      "Cargar mercancía, actualizar el costo y ver cómo entra al inventario.",
    cover: "/tutoriales/b3.svg",
    series: "dia-a-dia",
    duration: "4 min",
  },
  {
    id: "b4",
    code: "B4",
    title: "Devoluciones",
    description:
      "Devolver una venta sin romper el stock ni el saldo del cliente.",
    cover: "/tutoriales/b4.svg",
    series: "dia-a-dia",
    duration: "3 min",
  },
  {
    id: "b5",
    code: "B5",
    title: "Importar las ventas del año pasado",
    description:
      "Traé tu historial desde un CSV: registra cobros y saldos sin tocar el stock.",
    cover: "/tutoriales/b5.svg",
    series: "dia-a-dia",
    duration: "4 min",
  },
  {
    id: "c1",
    code: "C1",
    title: "Presentaciones: mismo producto, distintos colores",
    description:
      "Color, medidas y stock propio para vender la misma cosa de varias formas.",
    cover: "/tutoriales/c1.svg",
    series: "diferencias",
    duration: "3 min",
  },
  {
    id: "c2",
    code: "C2",
    title: "Materiales y productos compuestos",
    description:
      "Cargá el insumo una vez y el sistema lo descuenta al vender el producto.",
    cover: "/tutoriales/c2.svg",
    series: "diferencias",
    duration: "4 min",
  },
  {
    id: "c3",
    code: "C3",
    title: "Reporte: facturé vs. cobré",
    description:
      "El reporte de devengo y cobro: qué vendiste, qué cobraste y qué está vencido.",
    cover: "/tutoriales/c3.svg",
    series: "diferencias",
    duration: "3 min",
  },
  {
    id: "c4",
    code: "C4",
    title: "Usuarios y permisos",
    description:
      "Qué puede hacer el dueño, el vendedor y el cajero, y qué no.",
    cover: "/tutoriales/c4.svg",
    series: "diferencias",
    duration: "3 min",
  },
];

export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@socious";
