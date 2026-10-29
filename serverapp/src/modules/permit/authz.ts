export interface AuthzUser {
  id?: string;
  permits?: { name?: string | null; list?: string[] | null } | null;
  userPermissions?: {
    permission: string;
    expiresAt?: Date | string | null;
  }[] | null;
}

export function isSuperadmin(user?: AuthzUser | null): boolean {
  return user?.permits?.name === 'SUPERADMIN';
}

export function isAdmin(user?: AuthzUser | null): boolean {
  const name = user?.permits?.name;
  return name === 'ADMIN' || name === 'SUPERADMIN';
}

export function isNutritionist(user?: AuthzUser | null): boolean {
  return user?.permits?.name === 'USER';
}

export function hasPermit(
  user: AuthzUser | null | undefined,
  permission: string,
): boolean {
  if (user?.permits?.list?.includes(permission)) return true;

  return (
    user?.userPermissions?.some(
      (p) =>
        p.permission === permission &&
        (!p.expiresAt || new Date(p.expiresAt) > new Date()),
    ) ?? false
  );
}

export function hasAnyPermit(
  user: AuthzUser | null | undefined,
  permissions: string[],
): boolean {
  return permissions.some((permission) => hasPermit(user, permission));
}
