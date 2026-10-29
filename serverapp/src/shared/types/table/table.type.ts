export interface Column {
  field: string;
  label: string;
  formatter?: string;
  sortable?: boolean;
  searchable?: boolean;
  hidden?: boolean;
  width?: string;
  className?: string;
}

// ---------------------- TABLES ---------------------- //
export interface DefTable {
  title: string;
  total: number;
  list: any[];
  columns: Column[];
  limit: number;
}
