import { FORMATTER_TYPE } from "../requets";

export interface Column {
    field: string;
    label: string;
    formatter?: FORMATTER_TYPE;
    sortable?: boolean;
    searchable?: boolean;
    hidden?: boolean;
    width?: string;
    className?: string;
}

// ---------------------- TABLES ---------------------- //
/**
 * A table row as served by the CRUD list endpoints: an object with dynamic
 * columns plus the `id` used for row keys and actions.
 */
export type TableRow = Record<string, unknown> & { id: string | number };

export interface DefTable<T = TableRow> {
    title: string,
    total: number,
    list: T[],
    columns: Column[],
    limit: number,
    currentPage: number,
}
