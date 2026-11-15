"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  Building2,
  Check,
  ImagePlus,
  Loader2,
  MapPinOff,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useWorkspaceStore } from "@/shared/store/workspace/useWorkspaceStore";
import {
  BTN_GHOST,
  CARD,
  CARD_HEADER,
  CTA_BRASS,
  EYEBROW,
  GLASS,
  INPUT,
  LABEL_SM,
  PAGE_TITLE,
} from "@/shared/lib/maison-style";
import { useIdentity } from "@/features/identity/hooks/useIdentity";
import { IdentityEndpoints } from "@/features/identity/services/identity.endpoints";
import {
  buildIdentityLogoForm,
  identityLogoPublicPath,
  resolveIdentityLogoSrc,
  validateIdentityLogo,
} from "@/features/identity/lib/identity-logo";
import {
  DEFAULT_BRAND_PAIR,
  contrastText,
  extractPalette,
  normalizeHex,
  pickBrandPair,
} from "@/features/identity/lib/palette";
import type {
  OrganizationIdentity,
  UpdateOrganizationIdentityPayload,
} from "@/features/identity/types/identity.type";

const NutriMapPicker = dynamic(
  () => import("@/features/user/components/map/NutriMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[260px] items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    ),
  },
);

/** Roles the backend accepts for `PATCH /api/organizations/identity`. */
const EDITABLE_ROLES = ["OWNER", "ADMIN", "CLINIC_ADMIN"] as const;

const FIELD = `${INPUT} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b2944a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900`;

const READONLY_FIELD =
  "w-full rounded-xl border border-[#1a2a46]/10 bg-slate-100/80 px-3 py-2 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400";

const DROPZONE =
  "group relative flex aspect-square w-32 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#1a2a46]/25 bg-white/60 transition-colors hover:border-[#b2944a]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b2944a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-slate-950/40 dark:focus-visible:ring-offset-slate-900 sm:w-36";

interface IdentityForm {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  logoUrl: string;
  latitude: number | null;
  longitude: number | null;
}

type TextField = "name" | "email" | "phone" | "website" | "address";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

function toForm(identity: OrganizationIdentity): IdentityForm {
  return {
    name: identity.name ?? "",
    email: identity.email ?? "",
    phone: identity.phone ?? "",
    website: identity.website ?? "",
    address: identity.address ?? "",
    logoUrl: identity.logoUrl ?? "",
    latitude: identity.latitude,
    longitude: identity.longitude,
  };
}

function colorFrom(value: string | null, fallback: string): string {
  return normalizeHex(value ?? "") ?? fallback;
}

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function SectionPanel({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl ${CARD}`}>
      <div className={CARD_HEADER}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-[#b2944a]">{icon}</span>
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-semibold tracking-tight text-[#111018] dark:text-slate-100">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function ColorField({
  id,
  label,
  value,
  fallback,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  fallback: string;
  disabled: boolean;
  onChange: (next: string) => void;
}) {
  const normalized = normalizeHex(value);
  const hasError = value.trim().length > 0 && normalized === null;

  return (
    <div>
      <label htmlFor={`${id}-hex`} className={LABEL_SM}>
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={`${id}-color`}
          type="color"
          aria-label={`${label}: selector de color`}
          value={normalized ?? fallback}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-[#1a2a46]/15 bg-transparent p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b2944a]/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15"
        />
        <input
          id={`${id}-hex`}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#b2944a"
          spellCheck={false}
          maxLength={7}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`${FIELD} font-mono`}
        />
      </div>
      {hasError ? (
        <p
          id={`${id}-error`}
          className="mt-1 text-xs text-rose-600 dark:text-rose-400"
        >
          Usa el formato #RRGGBB.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Identidad del negocio: logo, colores de marca y datos públicos del tenant
 * activo. El workspace viaja en el header (apiClient); el RIF es de solo
 * lectura porque el PATCH no lo acepta y WhatsApp es un ajuste aparte.
 */
export default function IdentityPage() {
  const { addToast } = useToastStore();
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const { identity, loading, error, saving, reload, save } = useIdentity();

  const [form, setForm] = useState<IdentityForm | null>(null);
  const [primaryHex, setPrimaryHex] = useState<string>(
    DEFAULT_BRAND_PAIR.primary,
  );
  const [accentHex, setAccentHex] = useState<string>(
    DEFAULT_BRAND_PAIR.accent,
  );
  const [palette, setPalette] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [extracting, setExtracting] = useState<boolean>(false);
  const [locationOpen, setLocationOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const role = activeWorkspace?.role ?? "";
  const canEdit = (EDITABLE_ROLES as readonly string[]).includes(role);

  useEffect(() => {
    if (!identity) {
      setForm(null);
      return;
    }
    setForm(toForm(identity));
    setPrimaryHex(colorFrom(identity.brandPrimary, DEFAULT_BRAND_PAIR.primary));
    setAccentHex(colorFrom(identity.brandAccent, DEFAULT_BRAND_PAIR.accent));
    setPalette([]);
  }, [identity]);

  const updateField = (key: TextField, value: string): void => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleLogoFile = async (
    file: File | null | undefined,
  ): Promise<void> => {
    if (!file || !canEdit || uploading) return;

    const validation = validateIdentityLogo(file);
    if (validation) {
      addToast({ type: "warning", title: "Identidad", message: validation });
      return;
    }

    setUploading(true);
    try {
      const { data } = await apiClient.post<{ key: string }>(
        IdentityEndpoints.logoUpload,
        buildIdentityLogoForm(file),
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60_000,
        },
      );
      setForm((current) =>
        current
          ? { ...current, logoUrl: identityLogoPublicPath(data.key) }
          : current,
      );

      setExtracting(true);
      try {
        const colors = await extractPalette(file);
        setPalette(colors);
        if (colors.length > 0) {
          const pair = pickBrandPair(colors);
          setPrimaryHex(pair.primary);
          setAccentHex(pair.accent);
        }
      } catch {
        setPalette([]);
        addToast({
          type: "warning",
          title: "Identidad",
          message: "No se pudo leer la paleta de la imagen.",
        });
      } finally {
        setExtracting(false);
      }
    } catch (uploadError) {
      addToast({
        type: "error",
        title: "Identidad",
        message: apiMessage(uploadError, "No se pudo subir el logo."),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again re-triggers the change event.
    event.target.value = "";
    void handleLogoFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    if (!canEdit || uploading) return;
    void handleLogoFile(event.dataTransfer.files?.[0]);
  };

  const clearLogo = (): void => {
    setForm((current) => (current ? { ...current, logoUrl: "" } : current));
    setPalette([]);
  };

  const handleLocationSelect = (lat: number, lng: number): void => {
    if (!canEdit) return;
    setForm((current) =>
      current ? { ...current, latitude: lat, longitude: lng } : current,
    );
  };

  const clearLocation = (): void => {
    setForm((current) =>
      current ? { ...current, latitude: null, longitude: null } : current,
    );
  };

  const discard = useCallback((): void => {
    if (!identity) return;
    setForm(toForm(identity));
    setPrimaryHex(colorFrom(identity.brandPrimary, DEFAULT_BRAND_PAIR.primary));
    setAccentHex(colorFrom(identity.brandAccent, DEFAULT_BRAND_PAIR.accent));
    setPalette([]);
  }, [identity]);

  const handleSave = async (): Promise<void> => {
    if (!form || !canEdit || saving) return;

    const name = form.name.trim();
    if (!name) {
      addToast({
        type: "warning",
        title: "Identidad",
        message: "El nombre del negocio no puede quedar vacío.",
      });
      return;
    }

    const primary = normalizeHex(primaryHex);
    if (!primary) {
      addToast({
        type: "warning",
        title: "Identidad",
        message: "El color principal debe tener el formato #RRGGBB.",
      });
      return;
    }

    const accent = normalizeHex(accentHex);
    if (!accent) {
      addToast({
        type: "warning",
        title: "Identidad",
        message: "El color de acento debe tener el formato #RRGGBB.",
      });
      return;
    }

    const payload: UpdateOrganizationIdentityPayload = {
      name,
      email: nullIfBlank(form.email),
      phone: nullIfBlank(form.phone),
      website: nullIfBlank(form.website),
      address: nullIfBlank(form.address),
      logoUrl: nullIfBlank(form.logoUrl),
      brandPrimary: primary,
      brandAccent: accent,
    };
    // Coordinates travel together; omitted means "leave the stored pair".
    if (form.latitude !== null && form.longitude !== null) {
      payload.latitude = form.latitude;
      payload.longitude = form.longitude;
    }

    try {
      const saved = await save(payload);
      // Sidebar and tenant theme read the active workspace, so the fresh
      // identity repaints them without waiting for a reload. The personal
      // workspace has no tenant identity and is never overwritten.
      const currentWorkspace = useWorkspaceStore.getState().activeWorkspace;
      if (currentWorkspace.type !== "PERSONAL") {
        useWorkspaceStore.getState().setActiveWorkspace({
          ...currentWorkspace,
          // `null` means the logo was removed: `undefined` renders the fallback.
          logoUrl: saved.logoUrl ?? undefined,
          brandPrimary: saved.brandPrimary ?? currentWorkspace.brandPrimary,
          brandAccent: saved.brandAccent ?? currentWorkspace.brandAccent,
        });
      }
      // Keep the workspace list in sync in the background; a failed refresh
      // never turns a successful save into an error and stays silent.
      void useWorkspaceStore
        .getState()
        .fetchWorkspaces(undefined, { preserveSelection: true })
        .catch(() => undefined);
      addToast({
        type: "success",
        title: "Identidad",
        message: "Cambios guardados.",
      });
    } catch (saveError) {
      addToast({
        type: "error",
        title: "Identidad",
        message: apiMessage(
          saveError,
          "No se pudo guardar la identidad del negocio.",
        ),
      });
    }
  };

  if (loading || (identity && !form)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !identity || !form) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div
          className={`${CARD} flex flex-col items-center gap-3 px-6 py-14 text-center`}
        >
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            No se pudo cargar la identidad del negocio.
          </p>
          <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
            {error ?? "Vuelve a intentarlo en unos segundos."}
          </p>
          <button
            type="button"
            onClick={() => void reload()}
            className={BTN_GHOST}
          >
            <RotateCcw className="h-4 w-4" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  const logoSrc = form.logoUrl ? resolveIdentityLogoSrc(form.logoUrl) : null;
  const previewPrimary =
    normalizeHex(primaryHex) ?? DEFAULT_BRAND_PAIR.primary;
  const previewAccent = normalizeHex(accentHex) ?? DEFAULT_BRAND_PAIR.accent;
  const hasLocation =
    form.latitude !== null && form.longitude !== null;
  const inputsDisabled = !canEdit || saving;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <div className={EYEBROW}>
          <span className="max-w-[200px] truncate">
            {activeWorkspace?.name ?? "Espacio de trabajo"}
          </span>
          <span className="mx-2" aria-hidden>
            ·
          </span>
          <span>Identidad</span>
        </div>
        <h1 className={PAGE_TITLE}>Identidad del negocio</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Logo, colores y datos de contacto que ven tus clientes.
        </p>
      </header>

      {!canEdit ? (
        <div
          role="status"
          className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200"
        >
          Solo el propietario o un administrador de la organización puede
          editar la identidad.
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <SectionPanel
            icon={<ImagePlus className="h-5 w-5" />}
            title="Marca"
            description="El logo y los dos colores que representan al negocio."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex flex-col items-start gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  disabled={inputsDisabled}
                  onChange={handleFileInput}
                />
                <button
                  type="button"
                  disabled={inputsDisabled}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                  aria-label={
                    form.logoUrl
                      ? "Cambiar el logo del negocio"
                      : "Elegir el logo del negocio"
                  }
                  aria-busy={uploading}
                  className={DROPZONE}
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  ) : logoSrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoSrc}
                        alt=""
                        className="h-full w-full object-contain p-2"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-[#111018]/70 py-1 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        Cambiar
                      </span>
                    </>
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-[11px] font-medium">
                        Elegir logo
                      </span>
                    </span>
                  )}
                </button>
                {form.logoUrl ? (
                  <button
                    type="button"
                    disabled={inputsDisabled}
                    onClick={clearLogo}
                    className={BTN_GHOST}
                  >
                    <Trash2 className="h-4 w-4" /> Quitar logo
                  </button>
                ) : null}
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  PNG, JPG o WEBP · hasta 5 MB. Un logo cuadrado se ve mejor en
                  la ficha del negocio.
                </p>

                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-[#111018] dark:text-slate-100">
                      Paleta del logo
                    </p>
                    {extracting ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Buscando colores…
                      </span>
                    ) : null}
                  </div>

                  {palette.length > 0 ? (
                    <>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Toca un color para usarlo como principal.
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {palette.map((color) => (
                          <button
                            key={color}
                            type="button"
                            disabled={inputsDisabled}
                            onClick={() => setPrimaryHex(color)}
                            aria-label={`Usar ${color} como color principal`}
                            aria-pressed={previewPrimary === color}
                            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b2944a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:focus-visible:ring-offset-slate-900"
                            style={{ backgroundColor: color }}
                          >
                            {previewPrimary === color ? (
                              <Check
                                className="h-4 w-4"
                                style={{ color: contrastText(color) }}
                                aria-hidden
                              />
                            ) : null}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={inputsDisabled}
                        onClick={() => {
                          const pair = pickBrandPair(palette);
                          setPrimaryHex(pair.primary);
                          setAccentHex(pair.accent);
                        }}
                        className={`${BTN_GHOST} mt-3`}
                      >
                        <Sparkles className="h-4 w-4" /> Usar combinación
                        sugerida
                      </button>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Elige un logo para ver los colores sugeridos o define los
                      colores a mano.
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField
                    id="identity-primary"
                    label="Color principal"
                    value={primaryHex}
                    fallback={DEFAULT_BRAND_PAIR.primary}
                    disabled={inputsDisabled}
                    onChange={setPrimaryHex}
                  />
                  <ColorField
                    id="identity-accent"
                    label="Color de acento"
                    value={accentHex}
                    fallback={DEFAULT_BRAND_PAIR.accent}
                    disabled={inputsDisabled}
                    onChange={setAccentHex}
                  />
                </div>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            icon={<Building2 className="h-5 w-5" />}
            title="Datos del negocio"
            description="Nombre, contacto y dirección que se muestran en tu ficha."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="identity-name" className={LABEL_SM}>
                  Nombre del negocio
                </label>
                <input
                  id="identity-name"
                  type="text"
                  value={form.name}
                  disabled={inputsDisabled}
                  maxLength={120}
                  required
                  onChange={(event) => updateField("name", event.target.value)}
                  className={`${FIELD} mt-1`}
                />
              </div>

              <div>
                <label htmlFor="identity-taxid" className={LABEL_SM}>
                  RIF
                </label>
                <input
                  id="identity-taxid"
                  type="text"
                  value={identity.taxId ?? ""}
                  readOnly
                  aria-readonly="true"
                  aria-describedby="identity-taxid-hint"
                  placeholder="Sin registrar"
                  className={`${READONLY_FIELD} mt-1`}
                />
              </div>

              <div>
                <label htmlFor="identity-email" className={LABEL_SM}>
                  Correo electrónico
                </label>
                <input
                  id="identity-email"
                  type="email"
                  value={form.email}
                  disabled={inputsDisabled}
                  maxLength={160}
                  onChange={(event) => updateField("email", event.target.value)}
                  className={`${FIELD} mt-1`}
                />
              </div>

              <div>
                <label htmlFor="identity-phone" className={LABEL_SM}>
                  Teléfono
                </label>
                <input
                  id="identity-phone"
                  type="tel"
                  value={form.phone}
                  disabled={inputsDisabled}
                  maxLength={40}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className={`${FIELD} mt-1`}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="identity-website" className={LABEL_SM}>
                  Sitio web
                </label>
                <input
                  id="identity-website"
                  type="url"
                  value={form.website}
                  disabled={inputsDisabled}
                  maxLength={200}
                  placeholder="https://tusitio.com"
                  onChange={(event) =>
                    updateField("website", event.target.value)
                  }
                  className={`${FIELD} mt-1`}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="identity-address" className={LABEL_SM}>
                  Dirección
                </label>
                <input
                  id="identity-address"
                  type="text"
                  value={form.address}
                  disabled={inputsDisabled}
                  maxLength={300}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  className={`${FIELD} mt-1`}
                />
              </div>
            </div>
            <p
              id="identity-taxid-hint"
              className="mt-3 text-xs text-slate-500 dark:text-slate-400"
            >
              El RIF se define al registrar el negocio y no se edita desde esta
              pantalla.
            </p>
          </SectionPanel>

          <SectionPanel
            icon={<MapPinOff className="h-5 w-5" />}
            title="Ubicación"
            description="Opcional: ayuda a tus clientes a llegar al local."
            action={
              <button
                type="button"
                onClick={() => setLocationOpen((open) => !open)}
                aria-expanded={locationOpen}
                aria-controls="identity-location"
                className={BTN_GHOST}
              >
                {locationOpen
                  ? "Ocultar"
                  : hasLocation
                    ? "Ver ubicación"
                    : "Agregar ubicación"}
              </button>
            }
          >
            {locationOpen ? (
              <div id="identity-location" className="space-y-3">
                <div className="overflow-hidden rounded-2xl">
                  <NutriMapPicker
                    key={hasLocation ? "con-ubicacion" : "sin-ubicacion"}
                    lat={form.latitude ?? undefined}
                    lng={form.longitude ?? undefined}
                    onLocationSelect={handleLocationSelect}
                    height="260px"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {hasLocation
                      ? `${form.latitude?.toFixed(6)}, ${form.longitude?.toFixed(6)}`
                      : "Sin ubicación marcada"}
                  </p>
                  {hasLocation ? (
                    <button
                      type="button"
                      disabled={inputsDisabled}
                      onClick={clearLocation}
                      className={BTN_GHOST}
                    >
                      <MapPinOff className="h-4 w-4" /> Quitar ubicación
                    </button>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Haz clic en el mapa o arrastra el marcador para ajustar el
                  punto.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                La ubicación está oculta. Ábrela para marcarla en el mapa.
              </p>
            )}
          </SectionPanel>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#1b1d21]/12 pt-4 dark:border-white/10">
            <button
              type="button"
              disabled={saving}
              onClick={discard}
              className={BTN_GHOST}
            >
              <RotateCcw className="h-4 w-4" /> Descartar
            </button>
            <button
              type="button"
              disabled={saving || !canEdit}
              onClick={() => void handleSave()}
              className={`${CTA_BRASS} px-4 py-2 text-sm`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>

        <aside className={`${GLASS} overflow-hidden rounded-2xl lg:sticky lg:top-6`}>
          <div className={CARD_HEADER}>
            <h2 className="text-sm font-semibold text-[#111018] dark:text-slate-100">
              Vista previa
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              En vivo
            </span>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/10 dark:border-white/15"
                style={{ backgroundColor: previewPrimary }}
              >
                {logoSrc ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoSrc}
                      alt=""
                      className="h-full w-full object-contain p-1.5"
                    />
                  </>
                ) : (
                  <Building2
                    className="h-6 w-6"
                    style={{ color: contrastText(previewPrimary) }}
                    aria-hidden
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111018] dark:text-slate-100">
                  {form.name.trim() || "Nombre del negocio"}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {form.website.trim() || "Sin sitio web"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="h-8 flex-1 rounded-lg border border-black/10 dark:border-white/15"
                style={{ backgroundColor: previewPrimary }}
                aria-hidden
              />
              <span
                className="h-8 flex-1 rounded-lg border border-black/10 dark:border-white/15"
                style={{ backgroundColor: previewAccent }}
                aria-hidden
              />
            </div>

            <p className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              {previewPrimary} · {previewAccent}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
