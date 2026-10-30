import { apiClient } from "@/shared/api/api.client";
import { SettingsEndpoints } from "./settings.endpoints";
import type {
  TenantSettings,
  TenantSettingsPatch,
} from "../types/tenant-settings.type";

/**
 * Reads the tenant configuration. Without an organization the backend answers
 * with the defaults, so this never fails for a personal workspace.
 */
export async function getTenantSettings(): Promise<TenantSettings> {
  const { data } = await apiClient.get<TenantSettings>(SettingsEndpoints.get);
  return data;
}

/**
 * Persists the checks the merchant flipped. The backend validates strictly
 * (a typo answers 400 naming the offending path) and merges section by
 * section, so callers may send a single section.
 */
export async function updateTenantSettings(
  patch: TenantSettingsPatch,
): Promise<TenantSettings> {
  const { data } = await apiClient.patch<TenantSettings>(
    SettingsEndpoints.update,
    patch,
  );
  return data;
}
