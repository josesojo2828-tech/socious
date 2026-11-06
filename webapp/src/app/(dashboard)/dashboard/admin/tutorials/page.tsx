"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import {
  CARD,
  CARD_HEADER,
  CTA_BRASS,
  EYEBROW,
  PAGE_TITLE,
  TABLE_HEAD,
  TABLE_ROW,
} from "@/shared/lib/maison-style";
import { TutorialEndpoints } from "@/features/tutorials/services/tutorials.endpoints";
import {
  TutorialFormModal,
  type AdminTutorial,
} from "@/features/tutorials/components/TutorialFormModal";
import { TUTORIAL_SERIES } from "@/features/tutorials/data/tutorials";

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

const SERIES_LABEL = new Map<string, string>(
  TUTORIAL_SERIES.map((serie) => [serie.key, serie.label]),
);

/** Admin CRUD: paste a YouTube link, review the metadata, publish. */
export default function AdminTutorialsPage() {
  const { addToast } = useToastStore();
  const { openModal, closeModal } = useModalStore();
  const [rows, setRows] = useState<AdminTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<AdminTutorial[]>(
        TutorialEndpoints.adminList,
      );
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast({
        type: "error",
        title: "Tutoriales",
        message: apiMessage(error, "No se pudieron cargar los tutoriales."),
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openForm = (tutorial?: AdminTutorial) => {
    openModal(
      <TutorialFormModal
        tutorial={tutorial}
        onClose={closeModal}
        onSuccess={() => void load()}
      />,
      { size: "md" },
    );
  };

  const togglePublished = async (tutorial: AdminTutorial) => {
    setBusyId(tutorial.id);
    try {
      await apiClient.patch(TutorialEndpoints.detail(tutorial.id), {
        published: !tutorial.published,
      });
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Tutoriales",
        message: apiMessage(error, "No se pudo cambiar el estado."),
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (tutorial: AdminTutorial) => {
    if (!window.confirm(`¿Eliminar “${tutorial.title}”?`)) return;
    setBusyId(tutorial.id);
    try {
      await apiClient.delete(TutorialEndpoints.detail(tutorial.id));
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: "Tutoriales",
        message: apiMessage(error, "No se pudo eliminar."),
      });
    } finally {
      setBusyId(null);
    }
  };

  const published = rows.filter((row) => row.published).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={EYEBROW}>Plataforma · Tutoriales</p>
          <h1 className={PAGE_TITLE}>Tutoriales</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {rows.length} tutorial(es) · {published} publicado(s). Pegá el link
            de YouTube y el sistema trae título y miniatura.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openForm()}
          className={`h-11 px-5 text-sm ${CTA_BRASS}`}
        >
          <Plus className="h-4 w-4" /> Nuevo tutorial
        </button>
      </header>

      <div className={`overflow-hidden rounded-2xl ${CARD}`}>
        <div className={CARD_HEADER}>
          <h2 className="font-semibold text-[17px] tracking-tight text-[#111018] dark:text-slate-100">
            Catálogo
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {published} de {rows.length}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Todavía no hay tutoriales.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-4 py-2.5 font-medium">Código</th>
                  <th className="px-4 py-2.5 font-medium">Título</th>
                  <th className="px-4 py-2.5 font-medium">Serie</th>
                  <th className="px-4 py-2.5 font-medium">Duración</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={TABLE_ROW}>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {row.code ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="block font-medium text-[#111018] dark:text-slate-100">
                        {row.title}
                      </span>
                      {row.youtubeId ? (
                        <span className="block font-mono text-[11px] text-slate-400">
                          {row.youtubeId}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {SERIES_LABEL.get(row.series) ?? row.series}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {row.duration ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void togglePublished(row)}
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors disabled:opacity-50 ${
                          row.published
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-slate-300 bg-white/60 text-slate-500 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-400"
                        }`}
                      >
                        {row.published ? "Publicado" : "Borrador"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Editar ${row.title}`}
                          onClick={() => openForm(row)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-[#b2944a]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar ${row.title}`}
                          disabled={busyId === row.id}
                          onClick={() => void remove(row)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
