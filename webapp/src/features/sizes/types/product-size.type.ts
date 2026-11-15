/** A clothing size (talla): system rows are read-only, own rows are editable. */
export interface ProductSize {
  id: string;
  /** null = talla del sistema, compartida y de solo lectura. */
  organizationId: string | null;
  label: string;
  sortOrder: number;
  active: boolean;
}
