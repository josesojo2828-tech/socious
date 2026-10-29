"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    AlertCircle,
    Droplet,
    Info,
    Pencil,
    RefreshCw,
    Trash,
} from "lucide-react";
import { useTranslation } from "@/context/i18n.context";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { apiClient } from "@/shared/api/api.client";
import { DeleteAlert } from "@/shared/components/organisms/crud/AlertDelete";
import { useCondimentDetail } from "@/features/nutringest/condiment/hooks/useCondimentDetail";
import { CondimentFormModal } from "@/features/nutringest/condiment/components/CondimentFormModal";
import { CondimentEndpoints } from "@/features/nutringest/condiment/services/condiment.endpoint";

const SkeletonBlock = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-base-300 rounded ${className ?? ""}`} />
);

const CondimentDetailSkeleton = () => (
    <div className="min-h-screen bg-base-200 flex flex-col">
        <header className="bg-base-100 border-b border-base-300 px-6 py-4 shadow-sm">
            <div className="flex items-center gap-4">
                <SkeletonBlock className="w-10 h-10" />
                <div className="space-y-2">
                    <SkeletonBlock className="h-3 w-32" />
                    <SkeletonBlock className="h-5 w-48" />
                </div>
            </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6 md:p-8">
                <div className="space-y-4">
                    <SkeletonBlock className="h-8 w-64" />
                    <SkeletonBlock className="h-4 w-40" />
                    <div className="flex items-center gap-4">
                        <SkeletonBlock className="h-16 w-28 rounded-xl" />
                        <SkeletonBlock className="h-4 w-36" />
                    </div>
                </div>
            </div>
        </main>
    </div>
);

export default function CondimentDetailPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const { user } = useAuthStore();
    const { openModal, closeModal } = useModalStore();
    const { addToast } = useToastStore();

    const id = params?.id as string;
    const { condiment, isLoading, error, refetch } = useCondimentDetail(id);

    const canWrite =
        user?.permits?.list?.includes("CONDIMENT_LIST_ALL") || false;

    const handleEdit = () => {
        if (!condiment) return;
        openModal(
            <CondimentFormModal
                condiment={condiment}
                onClose={closeModal}
                onSuccess={() => {
                    closeModal();
                    refetch();
                }}
            />,
        );
    };

    const handleDelete = () => {
        if (!condiment) return;
        openModal(
            <DeleteAlert
                isOpen={true}
                onClose={closeModal}
                onConfirm={async () => {
                    try {
                        await apiClient.post(
                            CondimentEndpoints.actions.delete(condiment.id),
                        );
                        addToast({
                            type: "success",
                            title: t("dashboard.condiments.detail.deleted_success"),
                            message: "El condimento fue eliminado correctamente.",
                        });
                        router.push(CondimentEndpoints.views.list());
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
                    }
                }}
                title={`Eliminar "${condiment.name}"`}
                description="Esta acción no se puede deshacer. Se eliminará permanentemente el condimento."
            />,
        );
    };

    if (isLoading) return <CondimentDetailSkeleton />;

    if (error) {
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center">
                <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-10 max-w-md text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center">
                        <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-lg font-bold text-base-content">
                        Error al cargar el condimento
                    </h2>
                    <p className="text-sm text-base-content/70">{error}</p>
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={refetch}
                            className="btn btn-outline btn-sm border-base-300 text-base-content hover:bg-base-200 gap-2"
                        >
                            <RefreshCw size={16} />
                            Reintentar
                        </button>
                        <Link
                            href={CondimentEndpoints.views.list()}
                            className="btn btn-ghost btn-sm text-base-content/70 hover:bg-base-200"
                        >
                            {t("dashboard.condiments.detail.back")}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!condiment) {
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center">
                <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-10 max-w-md text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center">
                        <Droplet size={32} className="text-emerald-500" />
                    </div>
                    <h2 className="text-lg font-bold text-base-content">
                        {t("dashboard.condiments.detail.not_found")}
                    </h2>
                    <p className="text-sm text-base-content/70">
                        El condimento que buscas no existe o ha sido eliminado.
                    </p>
                    <Link
                        href={CondimentEndpoints.views.list()}
                        className="btn btn-ghost btn-sm text-base-content/70 hover:bg-base-200"
                    >
                        {t("dashboard.condiments.detail.back")}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base-200 flex flex-col">
            <header className="bg-base-100 border-b border-base-300 sticky top-0 z-20 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(CondimentEndpoints.views.list())}
                        className="btn btn-ghost btn-sm btn-square text-base-content/70 hover:bg-base-200 rounded-lg"
                        title={t("dashboard.condiments.detail.back")}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="text-xs font-medium text-base-content/70 mb-0.5">
                            {t("dashboard.condiments.detail.title")}
                        </div>
                        <h1 className="text-lg font-bold text-base-content leading-none flex items-center gap-2">
                            {condiment.name}
                        </h1>
                    </div>
                </div>
                {canWrite && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleEdit}
                            className="btn btn-outline btn-sm border-base-300 text-base-content hover:bg-base-200 gap-2"
                        >
                            <Pencil size={16} />
                            {t("dashboard.condiments.detail.edit")}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="btn btn-outline btn-sm border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 gap-2"
                        >
                            <Trash size={16} />
                            {t("dashboard.condiments.detail.delete")}
                        </button>
                    </div>
                )}
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
                <section className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-base-300">
                        <h2 className="font-bold text-base-content flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <Droplet size={20} />
                            </div>
                            {t("dashboard.condiments.detail.info_card")}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs font-bold text-base-content/50 uppercase mb-1">
                                {t("dashboard.condiments.detail.name")}
                            </p>
                            <p className="text-lg font-bold text-base-content">
                                {condiment.name}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-base-content/50 uppercase mb-1">
                                {t("dashboard.condiments.detail.status")}
                            </p>
                            <span
                                className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                                    condiment.isActive
                                        ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50"
                                        : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50"
                                }`}
                            >
                                {condiment.isActive
                                    ? t("dashboard.condiments.detail.active")
                                    : t("dashboard.condiments.detail.inactive")}
                            </span>
                        </div>
                    </div>

                    <p className="mt-8 pt-4 border-t border-base-300 text-xs text-base-content/50 flex items-center gap-1.5">
                        <Info size={14} />
                        {t("dashboard.condiments.detail.read_only_note")}
                    </p>
                </section>
            </main>
        </div>
    );
}
