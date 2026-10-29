import { apiClient } from "@/shared/api/api.client";

interface Props {
    path: string
}

export async function GetStructAndTable<T>({ path }: Props) {
    const response = await apiClient.get<T>(path);
    return response.data;
}
