export const PaymentMethodEndpoints = {
  /** Business payment methods of the POS (CASH_USD, PAGO_MOVIL, ...). */
  options: '/api/payment-methods/options',
  data: {
    list: '/api/payment-methods',
  },
  actions: {
    create: '/api/payment-methods/create',
  }
};
