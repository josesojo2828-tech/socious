/**
 * A module grant row as answered by `GET /api/organizations` (already
 * filtered to ACTIVE server-side; `moduleKey` is the stable machine key).
 */
export interface AdminOrganizationGrant {
  id: string;
  moduleKey: string;
  status: string;
}

/** The plan of the organization's ACTIVE subscription, when it has one. */
export interface AdminOrganizationPlan {
  id: string;
  name: string;
}

/** One organization row of the platform-wide admin list. */
export interface AdminOrganization {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  plan: AdminOrganizationPlan | null;
  grants: AdminOrganizationGrant[];
}
