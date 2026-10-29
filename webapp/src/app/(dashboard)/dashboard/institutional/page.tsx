"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Trash, ChevronLeft, ChevronRight, Calculator, FileText, Calendar, Users, Eye } from "lucide-react";
import { useTranslation } from "@/context/i18n.context";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { apiClient } from "@/shared/api/api.client";
import { DeleteAlert } from "@/shared/components/organisms/crud/AlertDelete";
import { InstitutionalWizardModal } from "@/features/nutringest/institutional/components/InstitutionalWizardModal";
import { useRouter } from "next/navigation";
import { hasEntitlement, isAdmin, ACCESS_KEYS } from "@/shared/authz";

interface Collaborator {
  id: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
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

interface Simulation {
  id: string;
  title: string;
  femaleCount: number;
  maleCount: number;
  averageWeight: number;
  vct: number;
  activityLevel: string;
  createdAt: string;
  nutritionistId?: string;
  nutritionist?: {
    id: string;
    user?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    };
  };
  collaborators?: Collaborator[];
}

export default function InstitutionalCalculationsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { openModal, closeModal } = useModalStore();
  const { addToast } = useToastStore();
  const router = useRouter();

  const canAccess = hasEntitlement(user, ACCESS_KEYS.INSTITUTIONAL_FOOD) || isAdmin(user);

  useEffect(() => {
    if (user && !canAccess) {
      router.replace("/dashboard");
    }
  }, [user, canAccess, router]);

  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const fetchSimulations = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    setError(null);
    try {
      // Query parameters for simulation list
      const query = `page=${page}&limit=${limit}&q=${encodeURIComponent(searchTerm)}`;
      const { data } = await apiClient.get(`/api/institutional-calculations?${query}`);
      setSimulations(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "No se pudieron cargar las simulaciones.");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, canAccess]);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  if (user && !canAccess) {
    return null;
  }

  const handleCreate = () => {
    openModal(
      <InstitutionalWizardModal
        onClose={closeModal}
        onSuccess={(id) => {
          closeModal();
          addToast({
            type: "success",
            title: "Simulación Creada",
            message: "Los cálculos iniciales se procesaron correctamente.",
          });
          router.push(`/dashboard/institutional/${id}`);
        }}
      />
    );
  };

  const handleDelete = (item: Simulation) => {
    openModal(
      <DeleteAlert
        isOpen={true}
        onClose={closeModal}
        onConfirm={async () => {
          try {
            await apiClient.delete(`/api/institutional-calculations/${item.id}`);
            addToast({
              type: "success",
              title: "Cálculo Eliminado",
              message: "El cálculo institucional fue eliminado correctamente.",
            });
            fetchSimulations();
          } catch (err: any) {
            console.error(err);
            addToast({
              type: "error",
              title: "Error al eliminar",
              message: err?.response?.data?.message || "No se pudo eliminar la simulación.",
            });
          } finally {
            closeModal();
          }
        }}
        title={`Eliminar "${item.title}"`}
        description="Esta acción no se puede deshacer y borrará permanentemente todo el cálculo y los menús de raciones asociados."
      />
    );
  };

  const translateActivity = (level: string) => {
    switch (level) {
      case "SEDENTARY":
        return "Sedentario";
      case "MODERATE":
        return "Moderado";
      case "ACTIVE":
        return "Activo";
      default:
        return "Personalizado";
    }
  };

  return (
    <div className="space-y-6 pb-10 font-sans text-base-content/70">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
            <Calculator className="text-indigo-600 dark:text-indigo-400" />
            Alimentación Colectiva
          </h1>
          <p className="text-base-content/70 mt-1 text-sm">
            Simulador de 10 pasos para planificación nutricional y financiera a nivel institucional.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer"
        >
          <Plus size={18} />
          Nuevo Cálculo Colectivo
        </button>
      </div>

      {/* KPI OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Calculator size={22} />
          </div>
          <div>
            <span className="text-xs text-base-content/50 font-bold uppercase">Simulaciones Totales</span>
            <h4 className="text-xl font-bold text-base-content mt-0.5">{total}</h4>
          </div>
        </div>
        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs text-base-content/50 font-bold uppercase">Población Promedio</span>
            <h4 className="text-xl font-bold text-base-content mt-0.5">
              {simulations.length > 0
                ? Math.round(simulations.reduce((acc, curr) => acc + curr.femaleCount + curr.maleCount, 0) / simulations.length)
                : 0}{" "}
              Personas
            </h4>
          </div>
        </div>
        <div className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
            <FileText size={22} />
          </div>
          <div>
            <span className="text-xs text-base-content/50 font-bold uppercase">VCT Promedio Colectivo</span>
            <h4 className="text-xl font-bold text-base-content mt-0.5">
              {simulations.length > 0
                ? Math.round(simulations.reduce((acc, curr) => acc + curr.vct, 0) / simulations.length)
                : 0}{" "}
              kcal
            </h4>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-base-100 p-4 rounded-xl border border-base-300 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 text-base-content/50" size={18} />
          <input
            type="text"
            placeholder="Buscar cálculo por título..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-base-300 bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all text-sm text-base-content"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div className="bg-base-100 border border-base-300 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-base-200 border-b border-base-300 text-xs font-bold text-base-content/70 uppercase tracking-wider">
                <th className="px-6 py-4">Descripción/Título</th>
                <th className="px-6 py-4">Propietario</th>
                <th className="px-6 py-4">Equipo</th>
                <th className="px-6 py-4">Población (F / M)</th>
                <th className="px-6 py-4">VCT Target</th>
                <th className="px-6 py-4">Fecha Creación</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-300 text-sm">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, cIdx) => (
                      <td key={cIdx} className="px-6 py-4">
                        <div className="h-4 bg-base-200 rounded w-2/3"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : simulations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-base-content/50">
                    No hay cálculos guardados. ¡Comienza creando el primero!
                  </td>
                </tr>
              ) : (
                simulations.map((item) => {
                  const isOwner = user?.nutritionistProfile?.id === item.nutritionistId;
                  const ownerName = item.nutritionist?.user
                    ? `${item.nutritionist.user.firstName} ${item.nutritionist.user.lastName}`.trim()
                    : "Nutricionista";
                  const collabCount = item.collaborators?.length || 0;

                  return (
                    <tr key={item.id} className="hover:bg-base-200/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-base-content">
                        <Link
                          href={`/dashboard/institutional/${item.id}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-base-content/70">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-base-200 text-base-content/70">
                          {isOwner ? "Tú (Propietario)" : `Lic. ${ownerName}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {collabCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                            <Users size={13} /> Equipo ({collabCount + 1})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-base-200 text-base-content/70 border border-base-300">
                            Individual
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-base-content/70 font-medium">
                        {item.femaleCount + item.maleCount} ({item.femaleCount} F / {item.maleCount} M)
                      </td>
                      <td className="px-6 py-4 text-base-content font-bold font-mono">{item.vct} kcal</td>
                      <td className="px-6 py-4 text-base-content/70">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-base-content/50" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/dashboard/institutional/${item.id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                          title="Ver Detalle"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-base-300 flex items-center justify-between">
            <span className="text-xs text-base-content/70">
              Mostrando {simulations.length} de {total} registros
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-base-300 text-base-content/70 hover:bg-base-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-base-content/70 font-medium">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-base-300 text-base-content/70 hover:bg-base-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
