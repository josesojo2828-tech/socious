import { Column } from "./table/table.type";

export interface SidebarSection {
  title: string;
  icon: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  title: string;
  icon: string;
  link: string;
  /** Public pages (the storefront) open in a new tab so the panel is kept. */
  newTab?: boolean;
  badge?: string;
  badgeColor?: string;
}

export interface TabItem {
  title: string;
  icon: string;
  link: string;
}

// ---------------------- CRUD ---------------------- //

export interface Actions {
  create: ActionsCrud | null;
  update: ActionsCrud | null;
  list: ActionsCrud | null;
  unique: ActionsCrud | null;
  delete: ActionsCrud | null;
  password?: ActionsCrud | null;
  status?: ActionsCrud | null;
}

export interface ActionsCrud {
  label: string;
  icon: string;
  link: string;
  key?: string;
  form?: any;
  action?: "modal" | "redirect";
}

// ---------------------- CARDS ---------------------- //

// Interface para la estructura de la ficha de usuario

export interface FieldDefinition {
  label: string; // Clave de traducción para el título (ej: 'user.email')
  value: any; // El valor real del objeto (ej: user.email)
  formatter?: string; // Opcional: Para usar tu helper 'formatValue' (ej: 'date')
  className?: string; // Opcional: Clases de Tailwind específicas (ej: 'text-lg font-bold')
}

export interface CardDefinition {
  title: string; // Título de la tarjeta (ej: 'Información Personal')
  icon?: string; // Icono (opcional)
  fields: FieldDefinition[];
  // Opcional: Para controlar la columna (col-span-5)
  wrapperClass?: string;
}

export interface RenderPieChart {
  id: string;
  title: string;
  data: any;
  keyLabel: string;
  keyValue: string;
  type?: "doughnut" | "pie";
}
