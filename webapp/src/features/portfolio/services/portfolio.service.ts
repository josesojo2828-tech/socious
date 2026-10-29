import { apiClient } from "@/shared/api/api.client";
import { PortfolioEndpoints } from "./portfolio.endpoints";
import type {
  Portfolio,
  PortfolioPublic,
  PortfolioUpdate,
  PortfolioValidateResponse,
  PortfolioAnalytics,
  TrackPortfolioEventPayload,
  BookConsultationPayload,
} from "@/types/backend/portfolio.interface";

export async function getPublicPortfolio(username: string): Promise<PortfolioPublic> {
  const response = await apiClient.get<PortfolioPublic>(PortfolioEndpoints.actions.public(username));
  return response.data;
}

export async function getMyPortfolio(): Promise<Portfolio> {
  const response = await apiClient.get<Portfolio>(PortfolioEndpoints.actions.me);
  return response.data;
}

export async function updatePortfolio(data: PortfolioUpdate): Promise<Portfolio> {
  const response = await apiClient.post<{ success: boolean; portfolio: Portfolio }>(
    PortfolioEndpoints.actions.update,
    data
  );
  return response.data.portfolio;
}

export async function validateUsername(username: string): Promise<PortfolioValidateResponse> {
  const response = await apiClient.get<PortfolioValidateResponse>(PortfolioEndpoints.actions.validate(username));
  return response.data;
}

export async function trackPortfolioEvent(
  username: string,
  payload: TrackPortfolioEventPayload
): Promise<{ success: boolean }> {
  const cleanUsername = username.startsWith("@") ? username.substring(1) : username;
  const response = await apiClient.post<{ success: boolean }>(
    PortfolioEndpoints.actions.track(cleanUsername),
    payload
  );
  return response.data;
}

export async function bookPublicConsultation(
  username: string,
  payload: BookConsultationPayload
): Promise<{ success: boolean; appointment: any }> {
  const cleanUsername = username.startsWith("@") ? username.substring(1) : username;
  const response = await apiClient.post<{ success: boolean; appointment: any }>(
    PortfolioEndpoints.actions.book(cleanUsername),
    payload
  );
  return response.data;
}

export async function getPortfolioAnalytics(days: number = 30): Promise<PortfolioAnalytics> {
  const response = await apiClient.get<PortfolioAnalytics>(PortfolioEndpoints.actions.analytics(days));
  return response.data;
}

