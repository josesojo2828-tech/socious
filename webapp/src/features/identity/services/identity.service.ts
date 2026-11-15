import { apiClient } from "@/shared/api/api.client";
import { IdentityEndpoints } from "./identity.endpoints";
import type {
  OrganizationIdentity,
  UpdateOrganizationIdentityPayload,
} from "../types/identity.type";

/**
 * Reads the identity of the ACTIVE workspace. The `X-Workspace-Id` header is
 * added by `apiClient`, so this never sends an organization id in the body.
 */
export async function getIdentity(): Promise<OrganizationIdentity> {
  const { data } = await apiClient.get<OrganizationIdentity>(
    IdentityEndpoints.identity,
  );
  return data;
}

/**
 * Partial update of the active workspace identity. Only OWNER/ADMIN/
 * CLINIC_ADMIN may write; the backend answers 403 otherwise.
 */
export async function updateIdentity(
  payload: UpdateOrganizationIdentityPayload,
): Promise<OrganizationIdentity> {
  const { data } = await apiClient.patch<OrganizationIdentity>(
    IdentityEndpoints.identity,
    payload,
  );
  return data;
}
