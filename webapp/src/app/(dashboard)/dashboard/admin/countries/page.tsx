"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { isAdmin } from "@/shared/authz";
import {
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

export interface EnabledCountry {
  id: string;
  code: string;
  name: string;
  phoneCode: string;
  flagEmoji: string;
  currency: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminCountriesPage() {
  const user = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();
  const [countries, setCountries] = useState<EnabledCountry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<EnabledCountry[]>("/api/countries/admin");
      if (Array.isArray(res.data)) {
        setCountries(res.data);
      }
    } catch (err: unknown) {
      console.error(err);
      const raw: unknown = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      addToast({
        type: "error",
        message:
          (Array.isArray(raw) ? raw[0] : raw) as string ||
          "Error al cargar la lista de países para SuperAdmin.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  // Early return DESPUÉS de todos los hooks (rules-of-hooks).
  if (!isAdmin(user)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <ShieldAlert className="w-10 h-10 text-base-content/40" />
        <div>
          <h2 className="text-xl font-bold text-base-content">
            Acceso restringido
          </h2>
          <p className="text-sm text-base-content/60 mt-1">
            No tienes permisos para acceder a la gestión de países.
          </p>
        </div>
      </div>
    );
  }

  const handleToggle = async (country: EnabledCountry) => {
    setTogglingId(country.id);
    try {
      const res = await apiClient.patch<EnabledCountry>(
        `/api/countries/admin/${country.id}/toggle`,
      );
      const updated = res.data;
      setCountries((prev) =>
        prev.map((c) => (c.id === country.id ? updated : c)),
      );
      addToast({
        type: "success",
        message: `País ${country.name} (${country.code}) ahora está ${
          updated.isActive ? "ACTIVO" : "INACTIVO"
        }.`,
      });
    } catch (err: unknown) {
      console.error(err);
      const raw: unknown = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      addToast({
        type: "error",
        message:
          (Array.isArray(raw) ? raw[0] : raw) as string ||
          "No se pudo cambiar el estado del país.",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phoneCode.includes(searchTerm) ||
      c.currency.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="w-full space-y-8 animate-fade-in font-sans text-base-content pb-16">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-base-200">
        <div>
          <h1 className="text-3xl font-black text-base-content tracking-tight flex items-center gap-3">
            <Globe className="text-emerald-600" size={32} />
            Gestión de Países Activos
          </h1>
          <p className="text-base-content/70 mt-1 text-sm">
            Habilitá o deshabilitá países para el registro de usuarios y el selector de teléfono internacional.
          </p>
        </div>
        <button
          onClick={fetchCountries}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-semibold text-base-content hover:bg-base-200 transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Recargar
        </button>
      </div>

      {/* SEARCH BAR & COUNTERS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por país, código o prefijo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-base-100 border border-base-300 rounded-xl text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold text-base-content/70">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            Activos: {countries.filter((c) => c.isActive).length}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-base-200 text-base-content/70 border border-base-300">
            Total: {countries.length}
          </span>
        </div>
      </div>

      {/* CONTENT GRID */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-base-content/60 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Cargando catálogo de países...</span>
        </div>
      ) : filteredCountries.length === 0 ? (
        <div className="bg-base-100 rounded-2xl border border-base-300 p-12 text-center text-base-content/60">
          <Globe className="h-12 w-12 mx-auto text-base-content/30 mb-3" />
          <p className="font-semibold">No se encontraron países que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCountries.map((country) => (
            <div
              key={country.id}
              className={`rounded-2xl border bg-base-100 p-6 shadow-sm transition-all duration-200 flex flex-col justify-between ${
                country.isActive
                  ? "border-base-300 hover:border-emerald-500/50"
                  : "border-base-300 opacity-60 bg-base-200/50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none">{country.flagEmoji}</span>
                    <div>
                      <h3 className="font-bold text-base-content text-lg leading-tight">
                        {country.name}
                      </h3>
                      <span className="text-xs font-mono font-bold text-base-content/50 uppercase">
                        ISO 2: {country.code}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      country.isActive
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-base-200 text-base-content/60 border border-base-300"
                    }`}
                  >
                    {country.isActive ? (
                      <>
                        <CheckCircle2 size={12} className="text-emerald-600" /> Activo
                      </>
                    ) : (
                      <>
                        <XCircle size={12} className="text-base-content/40" /> Inactivo
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-base-200 text-xs my-4">
                  <div>
                    <span className="block text-base-content/50 font-medium">Prefijo Tel.</span>
                    <span className="font-bold text-base-content font-mono">{country.phoneCode}</span>
                  </div>
                  <div>
                    <span className="block text-base-content/50 font-medium">Moneda</span>
                    <span className="font-bold text-base-content font-mono">{country.currency}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-base-content/60 font-medium">
                  {country.isActive ? "Habilitado para uso global" : "Deshabilitado en plataforma"}
                </span>

                <button
                  onClick={() => handleToggle(country)}
                  disabled={togglingId === country.id}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    country.isActive
                      ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                  } disabled:opacity-50`}
                >
                  {togglingId === country.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : country.isActive ? (
                    "Desactivar"
                  ) : (
                    "Activar"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
