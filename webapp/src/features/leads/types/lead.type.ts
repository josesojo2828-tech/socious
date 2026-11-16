export type LeadRubro =
  | "Barbería"
  | "Peluquería"
  | "Uñas"
  | "Estética"
  | "Belleza/Estética";

export type LeadPriority = "A" | "B" | "C";

export type LeadStatus =
  | "nuevo"
  | "contactado"
  | "respondió"
  | "no interesado"
  | "cerrado";

export interface Lead {
  name: string;
  rubro: LeadRubro;
  phone: string;
  instagram: string;
  address: string;
  rating: number | null;
  reviews: number;
  priority: LeadPriority;
  source: string;
  note: string;
}
