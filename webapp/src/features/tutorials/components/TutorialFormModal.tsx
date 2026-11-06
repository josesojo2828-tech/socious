"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/shared/components/atoms/Button";
import { apiClient } from "@/shared/api/api.client";
import { useToastStore } from "@/shared/store/ui/useToastStore";
import { useModalStore } from "@/shared/store/ui/useModalStore";
import { INPUT, LABEL_SM } from "@/shared/lib/maison-style";
import { TutorialEndpoints } from "../services/tutorials.endpoints";
import { TUTORIAL_SERIES } from "../data/tutorials";
import type { TutorialSeriesKey } from "../types";

export interface AdminTutorial {
  id: string;
  youtubeId: string | null;
  youtubeUrl: string | null;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  series: string;
  duration: string | null;
  code: string | null;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}

function apiMessage(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string } } };
  return maybe?.response?.data?.message || fallback;
}

/**
 * Create/edit one tutorial. Pasting the YouTube link and pressing "Traer
 * datos" fills the title and the thumbnail through the backend's oEmbed read;
 * description and duration are typed by hand.
 */
export function TutorialFormModal({
  tutorial,
  onClose,
  onSuccess,
}: {
  tutorial?: AdminTutorial;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { addToast } = useToastStore();
  const { closeModal } = useModalStore();

  const [url, setUrl] = useState(tutorial?.youtubeUrl ?? "");
  const [title, setTitle] = useState(tutorial?.title ?? "");
  const [description, setDescription] = useState(tutorial?.description ?? "");
  const [series, setSeries] = useState<TutorialSeriesKey>(
    (tutorial?.series as TutorialSeriesKey) ?? "primeros-pasos",
  );
  const [duration, setDuration] = useState(tutorial?.duration ?? "");
  const [code, setCode] = useState(tutorial?.code ?? "");
  const [featured, setFeatured] = useState(tutorial?.featured ?? false);
  const [published, setPublished] = useState(tutorial?.published ?? true);
  const [sortOrder, setSortOrder] = useState(String(tutorial?.sortOrder ?? 0));
  const [thumbnail, setThumbnail] = useState(tutorial?.thumbnailUrl ?? "");
  const [pulling, setPulling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    closeModal();
    onClose();
  };

  const pull = async () => {
    if (!url.trim()) {
      setError("Pegá el enlace de YouTube.");
      return;
    }
    setPulling(true);
    setError(null);
    try {
      const { data } = await apiClient.post<{
        title: string;
        thumbnailUrl: string;
      }>(TutorialEndpoints.preview, { url });
      if (!title.trim()) setTitle(data.title);
      setThumbnail(data.thumbnailUrl);
    } catch (pullError) {
      setError(apiMessage(pullError, "No se pudo leer el video."));
    } finally {
      setPulling(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim()) {
      setError("Pegá el enlace de YouTube.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        series,
        duration: duration.trim() || undefined,
        code: code.trim() || undefined,
        featured,
        published,
        sortOrder: Number(sortOrder) || 0,
      };

      if (tutorial) {
        await apiClient.patch(TutorialEndpoints.detail(tutorial.id), {
          ...payload,
          youtubeUrl: url.trim(),
        });
      } else {
        await apiClient.post(TutorialEndpoints.create, {
          ...payload,
          url: url.trim(),
        });
      }

      addToast({
        type: "success",
        title: "Tutoriales",
        message: tutorial ? "Tutorial actualizado." : "Tutorial agregado.",
      });
      onSuccess();
      close();
    } catch (submitError) {
      setError(
        apiMessage(
          submitError,
          tutorial ? "No se pudo guardar." : "No se pudo agregar el tutorial.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {tutorial ? "Editar tutorial" : "Nuevo tutorial"}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <label className={LABEL_SM}>
        Enlace de YouTube *
        <div className="mt-1 flex gap-2">
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://youtu.be/..."
            className={`flex-1 ${INPUT}`}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => void pull()}
            disabled={pulling}
          >
            {pulling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Traer datos
          </Button>
        </div>
      </label>

      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          className="h-28 w-full rounded-xl object-cover"
        />
      ) : null}

      <label className={LABEL_SM}>
        Título
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={`mt-1 ${INPUT}`}
        />
      </label>

      <label className={LABEL_SM}>
        Descripción
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className={`mt-1 ${INPUT}`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={LABEL_SM}>
          Serie
          <select
            value={series}
            onChange={(event) =>
              setSeries(event.target.value as TutorialSeriesKey)
            }
            className={`mt-1 ${INPUT}`}
          >
            {TUTORIAL_SERIES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL_SM}>
          Código
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="A3"
            className={`mt-1 font-mono ${INPUT}`}
          />
        </label>
        <label className={LABEL_SM}>
          Duración
          <input
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="4 min"
            className={`mt-1 ${INPUT}`}
          />
        </label>
        <label className={LABEL_SM}>
          Orden
          <input
            type="number"
            min="0"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className={`mt-1 font-mono tabular-nums ${INPUT}`}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-5 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
            className="h-4 w-4 accent-[#b2944a]"
          />
          Publicado
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={featured}
            onChange={(event) => setFeatured(event.target.checked)}
            className="h-4 w-4 accent-[#b2944a]"
          />
          Destacado
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
        <Button variant="ghost" onClick={close} disabled={busy}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={busy}
          loadingText="Guardando…"
        >
          {tutorial ? "Guardar cambios" : "Agregar tutorial"}
        </Button>
      </div>
    </form>
  );
}
