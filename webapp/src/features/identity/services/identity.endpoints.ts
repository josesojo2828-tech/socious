/** Tenant identity surface (logo, brand colors and business details). */
export const IdentityEndpoints = {
  identity: "/api/organizations/identity",
  /** Multipart logo upload — the `identity` prefix is allowlisted server-side. */
  logoUpload: "/api/file/upload",
} as const;
