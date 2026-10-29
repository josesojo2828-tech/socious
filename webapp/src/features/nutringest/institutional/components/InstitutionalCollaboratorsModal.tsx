"use client";

import React, { useEffect, useState } from "react";
import { X, Users, UserPlus, Loader2, Mail, Trash2, ShieldCheck, Eye, Edit3 } from "lucide-react";
import { PatientReferralService } from "@/features/nutringest/patient-referral/services/patient-referral.service";
import type { CollaboratorSearchResult } from "@/types/nutringest/patient-referral.interface";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { apiClient } from "@/shared/api/api.client";

interface Collaborator {
  id: string;
  calculationId: string;
  nutritionistId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  status?: "PENDING" | "ACCEPTED" | "REJECTED";
  nutritionist: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface Props {
  calculationId: string;
  collaborators: Collaborator[];
  isOwner: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const DEBOUNCE_MS = 400;
const MIN_EMAIL_CHARS = 3;

export const InstitutionalCollaboratorsModal = ({
  calculationId,
  collaborators,
  isOwner,
  onClose,
  onRefresh,
}: Props) => {
  const { addToast } = useToastStore();

  const [query, setQuery] = useState("");
  const [selectedNutri, setSelectedNutri] = useState<CollaboratorSearchResult | null>(null);
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [suggestions, setSuggestions] = useState<CollaboratorSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search nutritionists debounce
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_EMAIL_CHARS || selectedNutri) {
      setSuggestions([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await PatientReferralService.searchCollaborators(q);
        setSuggestions(res.data ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, selectedNutri]);

  const handleSelectSuggestion = (s: CollaboratorSearchResult) => {
    setSelectedNutri(s);
    setQuery(`${s.fullName} (${s.email})`);
    setSuggestions([]);
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNutri || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(`/api/institutional-calculations/${calculationId}/collaborators`, {
        targetNutriId: selectedNutri.id,
        role,
      });

      addToast({
        type: "success",
        title: "Colaborador Agregado",
        message: `${selectedNutri.fullName} fue agregado como colaborador.`,
      });

      setQuery("");
      setSelectedNutri(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast({
        type: "error",
        title: "Error",
        message: err?.response?.data?.message || "No se pudo agregar al colaborador.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCollaborator = async (targetNutriId: string, name: string) => {
    setDeletingId(targetNutriId);
    try {
      await apiClient.delete(
        `/api/institutional-calculations/${calculationId}/collaborators/${targetNutriId}`
      );

      addToast({
        type: "success",
        title: "Colaborador Removido",
        message: `${name} fue removido del equipo de esta simulación.`,
      });

      onRefresh();
    } catch (err: any) {
      console.error(err);
      addToast({
        type: "error",
        title: "Error al remover",
        message: err?.response?.data?.message || "No se pudo remover al colaborador.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const showSuggestions =
    query.trim().length >= MIN_EMAIL_CHARS &&
    !selectedNutri &&
    (isSearching || suggestions.length > 0 || hasSearched);

  return (
    <div className="bg-base-100 text-base-content rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-base-300">
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-base-300 flex justify-between items-center bg-base-200/50">
        <h3 className="font-bold text-base-content flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users size={18} />
          </div>
          Equipo Colaborador (Alimentación Colectiva)
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-base-200 rounded-full text-base-content/50 hover:text-base-content transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto w-full">
        {/* ADD FORM (ONLY IF OWNER) */}
        {isOwner ? (
          <form onSubmit={handleAddCollaborator} className="space-y-4 bg-base-200 p-4 rounded-xl border border-base-300">
            <h4 className="text-xs font-bold text-base-content/70 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus size={14} className="text-indigo-600 dark:text-indigo-400" /> Invitar Nutricionista
            </h4>

            <div className="relative w-full">
              <div className="relative w-full">
                <Mail className="absolute left-3 top-2.5 text-base-content/50" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo electrónico..."
                  className="w-full pl-9 pr-3 py-2 bg-base-100 border border-base-300 text-base-content rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (selectedNutri) setSelectedNutri(null);
                  }}
                />
              </div>

              {showSuggestions && (
                <div className="absolute z-20 w-full left-0 border border-base-300 rounded-xl max-h-48 overflow-y-auto bg-base-100 shadow-lg mt-1">
                  {isSearching ? (
                    <div className="p-3 text-center text-xs text-base-content/50 flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin text-primary" /> Buscando colegas...
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-base-content/50">
                      No se encontraron nutricionistas registrados con ese criterio.
                    </div>
                  ) : (
                    suggestions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectSuggestion(s)}
                        className="px-3.5 py-2.5 text-sm cursor-pointer border-b border-base-300 last:border-0 hover:bg-base-200 transition-colors"
                      >
                        <p className="font-semibold text-base-content">{s.fullName}</p>
                        <p className="text-xs text-base-content/50 flex items-center gap-1">
                          <Mail size={11} /> {s.email}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-base-content/70">Rol:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
                  className="bg-base-100 border border-base-300 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-base-content outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="EDITOR">Editor (Modifica raciones y costos)</option>
                  <option value="VIEWER">Lector (Solo visualiza e imprime)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedNutri || isSubmitting}
                className="px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-content text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Agregar
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            Solo el nutricionista creador (Propietario) puede modificar el equipo de trabajo.
          </div>
        )}

        {/* LIST OF CURRENT COLLABORATORS */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-base-content/70 uppercase tracking-wider">
            Integrantes del Proyecto ({collaborators?.length || 0})
          </h4>

          {collaborators && collaborators.length > 0 ? (
            <div className="divide-y divide-base-300 border border-base-300 rounded-xl overflow-hidden">
              {collaborators.map((c) => {
                const name = `${c.nutritionist?.user?.firstName || ""} ${c.nutritionist?.user?.lastName || ""}`.trim() || "Nutricionista";
                const isItemDeleting = deletingId === c.nutritionistId;

                return (
                  <div key={c.id} className="p-3.5 flex items-center justify-between bg-base-100 hover:bg-base-200/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center">
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-base-content">{name}</h5>
                        <span className="text-xs text-base-content/50">{c.nutritionist?.user?.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.role !== "OWNER" && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.status === "ACCEPTED"
                              ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                              : c.status === "REJECTED"
                              ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                              : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {c.status === "ACCEPTED"
                            ? "Aceptado"
                            : c.status === "REJECTED"
                            ? "Rechazado"
                            : "Pendiente"}
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          c.role === "OWNER"
                            ? "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400"
                            : c.role === "EDITOR"
                            ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                            : "bg-base-200 text-base-content/70"
                        }`}
                      >
                        {c.role === "OWNER" ? (
                          <>
                            <ShieldCheck size={11} /> Creador
                          </>
                        ) : c.role === "EDITOR" ? (
                          <>
                            <Edit3 size={11} /> Editor
                          </>
                        ) : (
                          <>
                            <Eye size={11} /> Lector
                          </>
                        )}
                      </span>

                      {isOwner && c.role !== "OWNER" && (
                        <button
                          onClick={() => handleRemoveCollaborator(c.nutritionistId, name)}
                          disabled={isItemDeleting}
                          className="p-1.5 text-base-content/50 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Remover integrante"
                        >
                          {isItemDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-base-content/50 bg-base-200 rounded-xl border border-dashed border-base-300">
              No hay colaboradores asignados aún a esta simulación.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
