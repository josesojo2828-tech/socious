/** Studio plan routes (mesas/sillas + agenda). */
export const StudioEndpoints = {
  stations: "/api/studio/stations",
  station: (stationId: string) => `/api/studio/stations/${stationId}`,
  appointments: "/api/studio/appointments",
  appointment: (appointmentId: string) =>
    `/api/studio/appointments/${appointmentId}`,
};
