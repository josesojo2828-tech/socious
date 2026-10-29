import type { TourStep } from "@/components/ui/guided-tour";

export const PROFILE_TOUR_STEPS: TourStep[] = [
  {
    title: "Tu perfil",
    body: "Tu casa en Nutringest: tus datos, tu bio link, tu acreditación y la configuración de tu cuenta. Te lo recorro en un minuto. Puedes cerrar cuando quieras.",
    mood: "wave",
  },
  {
    target: '[data-tour="profile-defaults"]',
    title: "Datos por defecto",
    body: "Tu nombre, tu usuario y tu correo: con estos te identificas en toda la plataforma. Edita lo que necesites y guarda los cambios.",
    mood: "pointing",
  },
  {
    target: '[data-tour="profile-biolink"]',
    title: "Tu bio link: la biografía",
    body: "Esta descripción es lo primero que ve quien entra a tu portafolio público, en /nutri/@tu-usuario. Cuenta quién eres, qué tratas y por qué elegirte: es lo que convierte una visita en un paciente. Toca \"Guardar bio\" y se publica al instante.",
    mood: "reading",
  },
  {
    target: '[data-tour="profile-social"]',
    title: "Tu bio link: las redes sociales",
    body: "Tus redes viajan juntas con tu bio. Instagram, TikTok, X, LinkedIn, Facebook y WhatsApp aparecen como iconos clickeables en tu portafolio público. Carga los links completos, con https://, y guarda: así te siguen donde quieran y tu presencia digital trabaja por ti.",
    mood: "presenting",
  },
  {
    target: '[data-tour="profile-accreditation"]',
    title: "Datos de acreditación",
    body: "Aquí registras tu título universitario, año de egreso, matrícula MPPS, N° de colegiado CNDV, seccional y cédula, más el escáner del título y el carnet. Son los documentos que auditamos para darte la insignia oficial de Nutricionista Verificado: tu respaldo de confianza ante cada paciente.",
    mood: "reading",
  },
  {
    target: '[data-tour="profile-accreditation-status"]',
    title: "Estado de verificación",
    body: "Tu acreditación pasa por \"En revisión\" mientras nuestro equipo la valida contra los registros MPPS y CNDV. \"Verificada\" te pone el sello oficial en tu portafolio público; \"Rechazada\" te muestra el motivo para corregir. El sello es lo que hace que un paciente confíe en ti antes de escribirte.",
    mood: "thinking",
  },
  {
    target: '[data-tour="profile-payments"]',
    title: "Métodos de pago",
    body: "Toca \"Métodos de Pago\" en el menú: ahí ves tus tarjetas, Pago Móvil, PayPal o Binance, y agregas uno nuevo con \"Agregar Método\".",
    mood: "pointing",
  },
  {
    target: '[data-tour="profile-subscription"]',
    title: "Tu suscripción",
    body: "Toca \"Mi Suscripción & Plan\" para ver tu plan activo, el ciclo de facturación y todos los beneficios incluidos.",
    mood: "presenting",
  },
  {
    target: '[data-tour="profile-security"]',
    title: "Seguridad",
    body: "Toca \"Seguridad & Contraseña\" para cambiar tu contraseña y proteger el acceso a tu cuenta.",
    mood: "thumbsup",
  },
  {
    target: '[data-tour="profile-notifications"]',
    title: "Notificaciones",
    body: "Toca \"Notificaciones\" para ver tus avisos nuevos y marcarlos como leídos.",
    mood: "pointing",
  },
  {
    title: "¡Listo!",
    body: "Ya conoces tu perfil de punta a punta. Si te desorientas, toca el botón de la guía y vuelves cuando quieras.",
    mood: "celebrate",
  },
];
