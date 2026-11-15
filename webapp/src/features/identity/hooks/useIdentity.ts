"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { getIdentity, updateIdentity } from "../services/identity.service";
import type {
  OrganizationIdentity,
  UpdateOrganizationIdentityPayload,
} from "../types/identity.type";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

export interface UseIdentityResult {
  identity: OrganizationIdentity | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  /** Reloads the identity; returns null when it could not be read. */
  reload: () => Promise<OrganizationIdentity | null>;
  /** Saves a partial identity and keeps the fresh response in state. */
  save: (
    payload: UpdateOrganizationIdentityPayload,
  ) => Promise<OrganizationIdentity>;
}

/**
 * Loads and saves the identity of the active workspace. The workspace id is a
 * dependency so switching organizations refetches with the new header instead
 * of showing the previous tenant's logo and colors.
 */
export function useIdentity(): UseIdentityResult {
  const workspaceId = useWorkspaceStore(
    (state) => state.activeWorkspace?.id ?? null,
  );
  const [identity, setIdentity] = useState<OrganizationIdentity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const reload = useCallback(async (): Promise<OrganizationIdentity | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIdentity();
      setIdentity(data);
      return data;
    } catch (loadError) {
      setIdentity(null);
      setError(
        apiMessage(
          loadError,
          "No se pudo cargar la identidad del negocio.",
        ),
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, workspaceId]);

  const save = useCallback(
    async (
      payload: UpdateOrganizationIdentityPayload,
    ): Promise<OrganizationIdentity> => {
      setSaving(true);
      try {
        const fresh = await updateIdentity(payload);
        setIdentity(fresh);
        return fresh;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { identity, loading, error, saving, reload, save };
}
