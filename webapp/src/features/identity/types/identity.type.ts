/**
 * Tenant identity — the fields returned by
 * `GET/PATCH /api/organizations/identity`.
 *
 * `taxId` is part of the read model only: the PATCH contract does not accept
 * it, so the screen renders the RIF read-only.
 *
 * WhatsApp does NOT live here: it is a tenant setting
 * (`TenantSettings.storefront.whatsapp`) with a single source of truth.
 */
export interface OrganizationIdentity {
  id: string;
  name: string;
  slug: string;
  taxId: string | null;
  logoUrl: string | null;
  brandPrimary: string | null;
  brandAccent: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Partial body for `PATCH /api/organizations/identity`. Coordinates travel
 * together or not at all, and `taxId`/`slug`/`id` are never writable.
 */
export interface UpdateOrganizationIdentityPayload {
  name?: string;
  logoUrl?: string | null;
  brandPrimary?: string | null;
  brandAccent?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  latitude?: number;
  longitude?: number;
}
