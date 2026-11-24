import { apiClient } from "@/shared/api/api.client";
import { MeatProcessingEndpoints } from "./meat-processing.endpoints";
import type {
  MeatCarcass,
  MeatDeconstructionOrder,
  CreateMeatCarcassPayload,
  UpdateMeatCarcassPayload,
  CreateMeatDeconstructionPayload,
} from "../types/meat-processing.type";

interface Paged<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}

export const meatProcessingService = {
  // Piezas / Animales (Carcasses)
  async listCarcasses(): Promise<MeatCarcass[]> {
    const { data } = await apiClient.get<MeatCarcass[]>(
      MeatProcessingEndpoints.carcasses,
    );
    return Array.isArray(data) ? data : [];
  },

  async getCarcass(id: string): Promise<MeatCarcass> {
    const { data } = await apiClient.get<MeatCarcass>(
      MeatProcessingEndpoints.carcass(id),
    );
    return data;
  },

  async getLastDeconstruction(
    id: string,
  ): Promise<MeatDeconstructionOrder | null> {
    const { data } = await apiClient.get<MeatDeconstructionOrder | null>(
      MeatProcessingEndpoints.lastDeconstruction(id),
    );
    return data;
  },

  async createCarcass(payload: CreateMeatCarcassPayload): Promise<MeatCarcass> {
    const { data } = await apiClient.post<MeatCarcass>(
      MeatProcessingEndpoints.carcasses,
      payload,
    );
    return data;
  },

  async updateCarcass(
    id: string,
    payload: UpdateMeatCarcassPayload,
  ): Promise<MeatCarcass> {
    const { data } = await apiClient.patch<MeatCarcass>(
      MeatProcessingEndpoints.carcass(id),
      payload,
    );
    return data;
  },

  async deleteCarcass(id: string): Promise<{ id: string }> {
    const { data } = await apiClient.delete<{ id: string }>(
      MeatProcessingEndpoints.carcass(id),
    );
    return data;
  },

  // Despieces (Deconstructions)
  async listDeconstructions(params?: {
    page?: number;
    limit?: number;
    q?: string;
  }): Promise<Paged<MeatDeconstructionOrder>> {
    const { data } = await apiClient.get<Paged<MeatDeconstructionOrder>>(
      MeatProcessingEndpoints.deconstructions,
      { params },
    );
    return data;
  },

  async getDeconstruction(id: string): Promise<MeatDeconstructionOrder> {
    const { data } = await apiClient.get<MeatDeconstructionOrder>(
      MeatProcessingEndpoints.deconstruction(id),
    );
    return data;
  },

  async createDeconstruction(
    payload: CreateMeatDeconstructionPayload,
  ): Promise<MeatDeconstructionOrder> {
    const { data } = await apiClient.post<MeatDeconstructionOrder>(
      MeatProcessingEndpoints.deconstructions,
      payload,
    );
    return data;
  },
};
