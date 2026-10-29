export interface Condiment {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CondimentPaginationResponse {
    data: Condiment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
