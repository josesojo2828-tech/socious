/**
 * Quotes the checkout and the POS show (S3/S6). `currencies` includes EUR as a
 * display-only quote (storage stays USD/VES/USDT).
 */
export const ExchangeEndpoints = {
  currencies: "/api/exchange/currencies",
  latest: "/api/exchange/rates/latest",
  history: "/api/exchange/rates/history",
};
