"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Search,
  Pencil,
  Trash,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { apiClient } from "@/shared/api/api.client";
import { useAdminCrud } from "@/features/dashboard/hooks/useAdminCrud";
import { PermitFormModal } from "@/features/dashboard/components/PermitFormModal";
import { PermitDetailModal } from "@/features/dashboard/components/PermitDetailModal";
import { DeleteAlert } from "@/shared/components/organisms/crud/AlertDelete";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";

interface PermissionItem {
  key: string;
  label: string;
}

interface PermissionGroup {
  entity: string;
  key: string;
  permissions: PermissionItem[];
}

export default function PermitsPage() {
  const { user } = useAuthStore();
  const canCreate = user?.permits?.list?.includes("PERMIT_PERMIT_CREATED");
  const canUpdate = user?.permits?.list?.includes("PERMIT_PERMIT_UPDATED");
  const canDelete = user?.permits?.list?.includes("PERMIT_PERMIT_DELETED");

  const { openModal, closeModal } = useModalStore();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [loadingPerms, setLoadingPerms] = useState(true);

  const { data, loading, error, totalPages, total, fetchData } =
    useAdminCrud("permits");

  useEffect(() => {
    fetchData({ page, limit: 10, q: searchTerm });
  }, [page, searchTerm, fetchData]);

  useEffect(() => {
    apiClient
      .get("/api/permit/permissions")
      .then((res) => setGroups(res.data.groups || []))
      .catch(() => {})
      .finally(() => setLoadingPerms(false));
  }, []);

  const refresh = () => {
    closeModal();
    fetchData({ page, limit: 10, q: searchTerm });
  };

  const handleCreate = () => {
    openModal(
      <PermitFormModal
        groups={groups}
        onClose={closeModal}
        onSuccess={refresh}
      />
    );
  };

  const handleEdit = (item: any) => {
    openModal(
      <PermitFormModal
        permit={item}
        groups={groups}
        onClose={closeModal}
        onSuccess={refresh}
      />
    );
  };

  const handleDetail = (item: any) => {
    openModal(
      <PermitDetailModal
        permit={item}
        groups={groups}
        onClose={closeModal}
        onSuccess={refresh}
      />,
      { size: "lg" }
    );
  };

  const handleDelete = (item: any) => {
    openModal(
      <DeleteAlert
        isOpen={true}
        onClose={closeModal}
        onConfirm={async () => {
          await apiClient.delete(`/api/permit/${item.id}`);
          closeModal();
          fetchData({ page, limit: 10, q: searchTerm });
        }}
        title={`Eliminar rol "${item.name}"`}
        description="Esta acción no se puede deshacer. Los usuarios con este rol perderán los permisos asociados."
      />
    );
  };

  const isSuperAdminRole = (name: string) =>
    ["SUPERADMIN", "ADMIN", "USER", "PATIENT"].includes(name);

  return (
    <div className="space-y-6 pb-10 font-sans text-base-content/70">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
            <Shield className="text-primary" />
            Roles y Permisos
          </h1>
          <p className="text-base-content/70 mt-1 text-sm">
            Gestión de roles de acceso y permisos asignables a los usuarios de
            la plataforma.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={handleCreate}
            disabled={loadingPerms}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-xs"
          >
            <Plus size={16} />
            Crear Rol
          </button>
        )}
      </div>

      <div className="bg-base-100 p-4 rounded-xl border border-base-300 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 text-base-content/50" size={18} />
          <input
            type="text"
            placeholder="Buscar roles..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-base-300 bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all text-sm text-base-content"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-base-200 border-b border-base-300 text-xs font-bold text-base-content/70 uppercase tracking-wider">
                <th className="px-6 py-4">Nombre del Rol</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Permisos</th>
                <th className="px-6 py-4">Usuarios</th>
                <th className="px-6 py-4">Fecha de Creación</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-300 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, cIdx) => (
                      <td key={cIdx} className="px-6 py-4">
                        <div className="h-4 bg-base-300 rounded w-2/3"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-base-content/50"
                  >
                    No se encontraron roles.
                  </td>
                </tr>
              ) : (
                data.map((item: any) => (
                  <tr
                    key={item.id}
                    className="hover:bg-base-200/50 transition-colors cursor-pointer"
                    onClick={() => handleDetail(item)}
                  >
                    <td className="px-6 py-4 font-semibold text-base-content">
                      <div className="flex items-center gap-2">
                        <Shield
                          size={14}
                          className={
                            isSuperAdminRole(item.name)
                              ? "text-amber-500"
                              : "text-indigo-500"
                          }
                        />
                        {item.name}
                        {isSuperAdminRole(item.name) && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded">
                            SISTEMA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-base-content/70 max-w-xs truncate">
                      {item.description || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                        {item.list?.length || 0} permisos
                      </span>
                    </td>
                    <td className="px-6 py-4 text-base-content/50">
                      {item._count?.users ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-base-content/50">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canUpdate && (
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canDelete && !isSuperAdminRole(item.name) && (
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash size={16} />
                          </button>
                        )}
                        {!canUpdate && !(canDelete && !isSuperAdminRole(item.name)) && (
                          <span className="text-base-content/50 text-xs font-medium">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-base-300 flex items-center justify-between">
            <span className="text-xs text-base-content/70">
              Mostrando {data.length} de {total} registros
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-base-300 text-base-content/70 hover:bg-base-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-base-content font-medium">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
