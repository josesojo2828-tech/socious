import { CoreEndpoints } from "@/features/core/service/core.enpoints";

const BASE_URL = '/api/user';
const BASE_TRANSACTION_URL = '/api/transactions';
const BASE_NOTIFICATION_URL = '/api/notification';
const BASE_REFERRAL_URL = '/api/referrals';

// --- CONSTANTES DE PACIENTES (Agregadas) ---
const BASE_PATIENT_API = '/api/patients';

export const UserEndpoints = {
  form: {
    create: `${BASE_URL}/form/create`,
    control: `${BASE_URL}/form/control`,
    // Estos requieren ID por Query Param (@Query() query)
    update: (id: string) => `${BASE_URL}/form/update?id=${id}`,
    password: (id: string) => `${BASE_URL}/form/password?id=${id}`,
    address: (id: string) => `${BASE_URL}/form/address?id=${id}`,
    paymentMethod: (id?: string) => `${BASE_URL}/form/payment-method${id ? `?id=${id}&internal=update` : ''}`,
    subscription: (id?: string) => `${BASE_URL}/form/subscription${id ? `?id=${id}` : ''}`,

    wallet: {
      report: `${BASE_TRANSACTION_URL}/form/create`
    },

    // --- GESTIÓN DE FORMULARIOS DE PACIENTES ---
    // Usados para obtener la estructura JSON del modal
    patient: {
      create: `${BASE_PATIENT_API}/form/create`,
      update: (id: string) => `${BASE_PATIENT_API}/form/update?id=${id}`,
    }
  },

  // Endpoints para ejecutar acciones (POST)
  actions: {
    create: `${BASE_URL}`,
    update: (id: string) => `${BASE_URL}/${id}/update`,
    updatePassword: (id: string) => `${BASE_URL}/${id}/password`,
    delete: (id: string) => `${BASE_URL}/${id}/delete`,

    // ----- ADDRESS -----
    createAddress: (id: string) => `${BASE_URL}/address/${id}`,

    // ----- PAYMENT METHOD -----
    createPaymentMethod: (id: string) => `${BASE_URL}/payment-method/${id}/create`,
    paymentMethods: () => `${BASE_URL}/payment-methods`,
    paymentMethodUnique: (id: string) => `${BASE_URL}/payment-methods/${id}`,
    paymentMethodUpdate: (id: string) => `${BASE_URL}/payment-method/${id}/update`,
    paymentMethodRemove: (id: string) => `${BASE_URL}/payment-method/${id}/delete`,

    // ----- SUBSCRIPTION -----
    createSubscription: (id: string) => `${BASE_URL}/${id}/subscription`,
    subscriptions: () => `${BASE_URL}/subscriptions`,
    subscriptionUnique: (id: string) => `${BASE_URL}/subscriptions/${id}`,
    subscriptionByUser: () => `${BASE_URL}/subscriptions/user/session`,
    subscriptionAutorew: (id: string) => `${BASE_URL}/subscription/${id}/autorenew`,

    uploadProfile: CoreEndpoints.actions.uploadProfileImage,

    // ----- GESTIÓN DE PACIENTES (ACCIONES API) -----
    patient: {
      list: () => `${BASE_PATIENT_API}`, // GET
      unique: (id: string) => `${BASE_PATIENT_API}/${id}`, // GET (Detalle)
      create: `${BASE_PATIENT_API}/create/api`, // POST
      update: (id: string) => `${BASE_PATIENT_API}/${id}/update/api`, // POST
      archive: (id: string) => `${BASE_PATIENT_API}/${id}/archive`, // POST
      unarchive: (id: string) => `${BASE_PATIENT_API}/${id}/unarchive`, // POST
      delete: (id: string) => `${BASE_PATIENT_API}/${id}/delete`, // POST (Hard delete, solo archivados)
    }
  },

  notification: {
    all: () => `${BASE_NOTIFICATION_URL}`,
    readAll: () => `${BASE_NOTIFICATION_URL}/read-all`,
    read: (id: string) => `${BASE_NOTIFICATION_URL}/${id}/read`,
  },

  referral: {
    me: () => `${BASE_REFERRAL_URL}/analytics/me`,
    // adminOverview: () => '/api/analytics/referrals/admin/overview', // Por si lo usas luego
  }
};