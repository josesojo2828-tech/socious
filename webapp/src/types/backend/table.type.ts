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
export interface DefTable {
    title: string,
    total: number,
    list: any[],
    columns: Column[],
    limit: number,
    currentPage: number,
}
