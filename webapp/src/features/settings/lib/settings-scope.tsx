"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { apiClient } from "@/shared/api/api.client";

/**
 * Scope for the configuration panels.
 *
 * The panels read their data from the workspace the request names. In the
 * client's own screen that is simply the active workspace (no scope), but when
 * the admin opens a client's configuration from the user record every request
 * must carry that organization's `X-Workspace-Id` — without switching the
 * workspace of the rest of the dashboard.
 */
const SettingsScope = createContext<string | null>(null);

export interface ScopedApi {
  get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>>;
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>>;
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>>;
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>>;
  delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>>;
}

export function SettingsScopeProvider({
  organizationId,
  children,
}: {
  organizationId?: string | null;
  children: ReactNode;
}) {
  return (
    <SettingsScope.Provider value={organizationId ?? null}>
      {children}
    </SettingsScope.Provider>
  );
}

/** The organization being configured, or `null` for the active workspace. */
export function useSettingsScope(): string | null {
  return useContext(SettingsScope);
}

/** API client of the panels: scoped to the organization being configured. */
export function useSettingsApi(): ScopedApi {
  const organizationId = useContext(SettingsScope);

  return useMemo(() => {
    if (!organizationId) return apiClient as unknown as ScopedApi;

    const withScope = <T extends AxiosRequestConfig | undefined>(config?: T) =>
      ({
        ...(config ?? {}),
        headers: {
          ...((config?.headers as Record<string, string>) ?? {}),
          "X-Workspace-Id": organizationId,
        },
      }) as AxiosRequestConfig;

    return {
      get: (url, config) => apiClient.get(url, withScope(config)),
      post: (url, data, config) => apiClient.post(url, data, withScope(config)),
      patch: (url, data, config) =>
        apiClient.patch(url, data, withScope(config)),
      put: (url, data, config) => apiClient.put(url, data, withScope(config)),
      delete: (url, config) => apiClient.delete(url, withScope(config)),
    };
  }, [organizationId]);
}
