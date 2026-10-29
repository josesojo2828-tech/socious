"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Plus,
    Search,
    Pencil,
    Trash,
    ChevronLeft,
    ChevronRight,
    Wine,
    Eye,
} from "lucide-react";
import { useTranslation } from "@/context/i18n.context";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { apiClient } from "@/shared/api/api.client";
import { DeleteAlert } from "@/shared/components/organisms/crud/AlertDelete";
import { useCondiments } from "@/features/nutringest/condiment/hooks/useCondiments";
import { CondimentFormModal } from "@/features/nutringest/condiment/components/CondimentFormModal";
import { CondimentEndpoints } from "@/features/nutringest/condiment/services/condiment.endpoint";
import type { Condiment } from "@/features/nutringest/condiment/types/condiment.type";

export default function CondimentsDashboardPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { openModal, closeModal } = useModalStore();
    const { addToast } = useToastStore();

    const canWrite =
        user?.permits?.list?.includes("CONDIMENT_LIST_ALL") || false;

    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);

    const { data, loading, error, total, totalPages, fetchData } =
        useCondiments();

    const reload = useCallback(() => {
        fetchData({ page, limit: 20, q: searchTerm });
    }, [fetchData, page, searchTerm]);

    useEffect(() => {
        reload();
    }, [reload]);

    useEffect(() => {
        const timeout = setTimeout(() => setPage(1), 350);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    const handleCreate = () => {
        openModal(
            <CondimentFormModal
                onClose={closeModal}
                onSuccess={() => {
                    closeModal();
                    reload();
                }}
            />,
        );
    };

    const handleUpdate = (item: Condiment) => {
        openModal(
            <CondimentFormModal
                condiment={item}
                onClose={closeModal}
                onSuccess={() => {
                    closeModal();
                    reload();
                }}
            />,
        );
    };

    const handleDelete = (item: Condiment) => {
        openModal(
            <DeleteAlert
                isOpen={true}
                onClose={closeModal}
                onConfirm={async () => {
                    try {
                        await apiClient.post(
                            CondimentEndpoints.actions.delete(item.id),
                        );
                        addToast({
                            type: "success",
                            title: "Condimento eliminado",
                            message: "El condimento fue eliminado correctamente.",
                        });
                    } catch (err: any) {
                        console.error(err);
                        addToast({
                            type: "error",
                            title: "Error al eliminar",
                            message:
                                err?.response?.data?.message ||
                                "No se pudo eliminar el condimento.",
                        });
                    } finally {
                        closeModal();
                        reload();
                    }
                }}
                title={`Eliminar "${item.name}"`}
                description="Esta acción no se puede deshacer. Se eliminará permanentemente el condimento."
            />,
        );
    };

    const handlePrevPage = () => {
        if (page > 1) setPage(page - 1);
    };

    const handleNextPage = () => {
        if (page < totalPages) setPage(page + 1);
    };

    return (
        <div className="space-y-6 pb-10 font-sans text-base-content/70">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-base-content flex items-center gap-2 capitalize">
                        <Wine className="text-primary" />
                        {t("common.sidebar.condiments")}
                    </h1>
                    <p className="text-base-content/70 mt-1 text-sm">
                        Catálogo comunitario de condimentos.
                    </p>
                </div>
                {canWrite && (
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
                    >
                        <Plus size={16} />
                        Crear Condimento
                    </button>
                )}
            </div>

            {/* TOOLBAR */}
            <div className="bg-base-100 p-4 rounded-xl border border-base-300 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 text-base-content/50" size={18} />
                    <input
                        type="text"
                        placeholder={`${t("dashboard.entities.common.search_in")} condimentos...`}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-base-300 bg-base-200 focus:bg-base-100 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all text-sm text-base-content"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {/* TABLA */}
            <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-base-200 border-b border-base-300 text-xs font-bold text-base-content/70 uppercase tracking-wider">
                                <th className="px-6 py-4">Nombre</th>
                                <th className="px-6 py-4">Fecha de Creación</th>
                                <th className="px-6 py-4 text-right">
                                    {t("dashboard.entities.common.actions")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-300 text-sm">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, idx) => (
                                    <tr key={idx} className="animate-pulse">
                                        {Array.from({ length: 3 }).map((_, cIdx) => (
                                            <td key={cIdx} className="px-6 py-4">
                                                <div className="h-4 bg-base-200 rounded w-2/3"></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-base-content/50">
                                        {t("dashboard.entities.common.no_data")}
                                    </td>
                                </tr>
                            ) : (
                                data.map((item) => (
                                    <tr key={item.id} className="hover:bg-base-200/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-base-content">
                                            <Link
                                                href={CondimentEndpoints.views.detail(item.id)}
                                                className="text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                {item.name}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-base-content/70">
                                            {item.createdAt
                                                ? new Date(item.createdAt).toLocaleDateString()
                                                : "-"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div
                                                className="flex items-center justify-end gap-1.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {canWrite ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdate(item)}
                                                            className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                                                            title={t("actions.edit")}
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                                            title={t("actions.delete")}
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <Link
                                                        href={CondimentEndpoints.views.detail(item.id)}
                                                        className="p-1.5 text-base-content/70 hover:bg-base-200 rounded-lg transition-colors"
                                                        title={t("dashboard.condiments.detail.title")}
                                                    >
                                                        <Eye size={16} />
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN */}
                {!loading && totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-base-300 flex items-center justify-between">
                        <span className="text-xs text-base-content/70">
                            Mostrando {data.length} de {total} registros
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-base-300 text-base-content/70 hover:bg-base-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs text-base-content/70 font-medium">
                                Página {page} de {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
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
