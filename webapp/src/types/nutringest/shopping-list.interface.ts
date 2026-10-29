import { PatientSimple } from "./anthropometry.interface";

export interface ShoppingList {
    id: string;
    patientId: string;
    
    name: string;
    
    // JSON Key-Value: { "Pollo": "1kg", "Arroz": "500g" }
    items: Record<string, string>; 

    // --- RELACIONES ---
    patient?: PatientSimple;

    createdAt: string | Date;
}