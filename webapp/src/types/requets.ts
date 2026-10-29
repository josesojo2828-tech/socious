import { Column } from "./backend/table.type";
import { FilterConfig } from "./filter.type";

export interface ReponseStrucTable <T>{
    actions: any,
    columns: Column[];
    currentPage: number;
    currentQuery: { lang: string };

    hasNext: boolean;
    hasPrev: boolean;
    
    list: T[];
    pageTitle: string;
    sortParams: any;

    lang: string;    
    limit: number;
    total: number;
    totalPages: number;

    filters: FilterConfig
}

export interface ActionsType {
    create: boolean;
    update: boolean;
    delete: boolean;
    view?: boolean;
}

export type FORMATTER_TYPE = 'username' | 'date' | 'badge' | 'capitalize' | 'email' | 'status_badge' | 'number' | 'percentage' | 'currency' | 'boolean';
