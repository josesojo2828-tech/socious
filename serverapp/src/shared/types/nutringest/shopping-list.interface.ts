import { PatientSimple } from "./anthropometry.interface";

export interface ShoppingList {
  id: string;
  patientId: string;
  createdBy?: { id: string; firstName: string; lastName: string; username: string; email: string } | null;

  name: string;

  // JSON Key-Value: { "Pollo": "1kg", "Arroz": "500g" }
  items: Record<string, string>;

  // --- RELACIONES ---
  patient?: PatientSimple;

  createdAt: string | Date;
}
