/** Studio plan: mesas/sillas and the daily agenda. */

export type StationKind = "TABLE" | "CHAIR";

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "DONE"
  | "CANCELED"
  | "NO_SHOW";

export interface StudioStation {
  id: string;
  organizationId: string;
  name: string;
  kind: StationKind;
  capacity: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudioAppointment {
  id: string;
  organizationId: string;
  clientId: string | null;
  serviceId: string | null;
  stationId: string | null;
  staffId: string | null;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; phone?: string | null } | null;
  service: { id: string; name: string; salePriceUSD?: string | number } | null;
  station: { id: string; name: string; kind: StationKind } | null;
  staff: { id: string; fullName?: string | null; email: string } | null;
}

export const STATION_KIND_LABELS: Record<StationKind, string> = {
  TABLE: "Mesa",
  CHAIR: "Silla",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  DONE: "Atendida",
  CANCELED: "Cancelada",
  NO_SHOW: "No asistió",
};

/** Minimal shapes of the pickers the agenda form consumes. */
export interface AgendaClientOption {
  id: string;
  name: string;
}

export interface AgendaServiceOption {
  id: string;
  name: string;
  salePriceUSD?: string | number;
}
