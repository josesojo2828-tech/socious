import type { TourStep } from "@/components/ui/guided-tour";

export const WALLET_TOUR_STEPS: TourStep[] = [
  {
    title: "Tu billetera y facturación",
    body: "Te muestro en 20 segundos cómo gestionar tus pagos y tu plan. Puedes cerrar cuando quieras.",
    mood: "wave",
  },
  {
    target: '[data-tour="wallet-methods"]',
    title: "Métodos de pago",
    body: 'Aquí ves cuántos métodos tienes registrados. Toca "Agregar Método" para sumar una tarjeta, Pago Móvil, Zelle o PayPal.',
    mood: "pointing",
  },
  {
    target: '[data-tour="wallet-balance"]',
    title: "Tu saldo",
    body: 'Tu saldo disponible en la billetera digital. Con "Reportar Pago" subes el comprobante de una transferencia o Pago Móvil.',
    mood: "pointing",
  },
  {
    target: '[data-tour="wallet-subscription"]',
    title: "Tu plan actual",
    body: "Aquí ves el plan activo, su precio, la próxima renovación y si la autorenovación está activa.",
    mood: "presenting",
  },
  {
    target: '[data-tour="wallet-billing"]',
    title: "Resumen de facturación",
    body: "El detalle de tu factura mensual estimada, con el total recurrente que se debita al vencimiento.",
    mood: "presenting",
  },
  {
    target: '[data-tour="wallet-charts"]',
    title: "Tus gráficos",
    body: "El volumen de tus transacciones y la distribución de estados de pago, de un vistazo.",
    mood: "pointing",
  },
  {
    target: '[data-tour="wallet-history"]',
    title: "Historial de pagos",
    body: "Cada pago reportado con su estado: Aprobado, En Revisión o Rechazado.",
    mood: "thinking",
  },
  {
    title: "¡Eso es todo!",
    body: 'Cuando reportás un pago, queda "En Revisión" y nuestro equipo lo valida. Te avisamos apenas se confirme. ¡Listo!',
    mood: "celebrate",
  },
];
