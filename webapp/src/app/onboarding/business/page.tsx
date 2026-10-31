"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { authStorage } from "@/shared/lib/auth.storage";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { OnboardingEndpoints } from "@/features/onboarding/services/onboarding.endpoints";
import {
  buildBusinessPayload,
  validateBusinessForm,
} from "@/features/onboarding/lib/business-form";

/**
 * Second step of the signup: the account already exists, this screen creates
 * the organization the ERP needs to give every request a business context.
 * Existing accounts without an organization land here too (dashboard guard).
 */
export default function BusinessOnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();
  const { addToast } = useToastStore();

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // The register flow stores tokens before pushing here; a hard refresh or a
    // direct visit without a session goes back to login.
    if (!authStorage.getAccessToken()) {
      router.replace("/login");
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateBusinessForm({ name });
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setSaving(true);

    try {
      await apiClient.post(OnboardingEndpoints.createOrganization, buildBusinessPayload({ name }));
      // Select the new organization and reload the shell with fresh data.
      await fetchWorkspaces(user);
      addToast({
        type: "success",
        title: "Negocio creado",
        message: "Ya podés operar tu negocio en el panel.",
      });
      window.location.href = "/dashboard";
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "No se pudo crear el negocio. Intentá de nuevo.";
      addToast({
        type: "error",
        title: "Negocio",
        message,
      });
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Creá tu negocio
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Último paso: contanos cómo se llama tu negocio.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="business-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Nombre del negocio
            </label>
            <input
              id="business-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Panadería Sol"
              maxLength={80}
              autoFocus
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error ? (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando…
              </>
            ) : (
              "Crear negocio y entrar"
            )}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400">
          Podés renombrar tu negocio más adelante desde Configuración.
        </p>
      </div>
    </div>
  );
}
