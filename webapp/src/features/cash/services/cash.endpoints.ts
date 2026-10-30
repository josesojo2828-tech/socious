/** Cash surface of the backend (S5 of the webapp port). */
export const CashEndpoints = {
  registers: "/api/cash/registers",
  register: (registerId: string) => `/api/cash/registers/${registerId}`,
  openShift: (registerId: string) => `/api/cash/registers/${registerId}/shifts`,
  currentShift: "/api/cash/shifts/current",
  closeShift: (shiftId: string) => `/api/cash/shifts/${shiftId}/close`,
  movements: (shiftId: string) => `/api/cash/shifts/${shiftId}/movements`,
  daily: "/api/cash/daily",
};
